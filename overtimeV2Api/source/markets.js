require("dotenv").config();

const redis = require("redis");
const { delay } = require("../utils/general");
const { bigNumberFormatter } = require("../utils/formatters");
// const markets = require("./treeMarketsAndHashes.json");
const {
  fixDuplicatedTeamName,
  isOneSideMarket,
  isOneSidePlayerPropsMarket,
  formatMarketOdds,
  isYesNoPlayerPropsMarket,
  isPlayerPropsMarket,
  convertFromBytes32,
} = require("../utils/markets");
const { OddsType, Status, MarketTypeMap } = require("../constants/markets");
const KEYS = require("../../redis/redis-keys");
const { ListObjectsV2Command, S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { NETWORK } = require("../constants/networks");
const { getLeagueSport, getLeagueLabel, getLeagueProvider } = require("../utils/sports");
const { Provider, League } = require("../constants/sports");

const awsS3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function processMarkets(isTestNetwork) {
  if (process.env.REDIS_URL) {
    const network = isTestNetwork ? "test" : "mainnets";
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log(`Markets ${network}: create client from index`);

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          const markets = await loadAndMapMarkets(isTestNetwork);
          console.log(`Markets ${network}: process markets`);
          isTestNetwork
            ? await Promise.all([processAllMarkets(markets, NETWORK.OptimismSepolia)])
            : await Promise.all([
                processAllMarkets(markets, NETWORK.Optimism),
                // processAllMarkets(markets, NETWORK.Arbitrum),
                // processAllMarkets(markets, NETWORK.Base),
              ]);
          const endTime = new Date().getTime();
          console.log(
            `Markets ${network}: === Seconds for processing markets: ${((endTime - startTime) / 1000).toFixed(0)} ===`,
          );
        } catch (error) {
          console.log(`Markets ${network}: markets error: `, error);
        }

        await delay(1000);
      }
    }, 3000);
  }
}

const packMarket = (market) => {
  const leagueId = `${market.sportId}`.startsWith("153")
    ? League.TENNIS_GS
    : `${market.sportId}`.startsWith("156")
    ? League.TENNIS_MASTERS
    : market.sportId === 701 || market.sportId == 702 || market.sportId == 703
    ? League.UFC
    : market.sportId;
  const isEnetpulseSport = getLeagueProvider(leagueId) === Provider.ENETPULSE;
  const type = MarketTypeMap[market.typeId]?.key;

  return {
    gameId: market.gameId,
    sport: getLeagueSport(leagueId),
    leagueId: leagueId,
    leagueName: getLeagueLabel(leagueId),
    subLeagueId: market.sportId,
    typeId: market.typeId,
    type,
    line: Number(market.line) / 100,
    maturity: market.maturity,
    maturityDate: new Date(market.maturity * 1000),
    homeTeam: fixDuplicatedTeamName(market.homeTeam, isEnetpulseSport),
    awayTeam: fixDuplicatedTeamName(market.awayTeam, isEnetpulseSport),
    status: market.status,
    isOpen: market.status === Status.OPEN || market.status === Status.IN_PROGRESS,
    isResolved: market.status === Status.RESOLVED,
    isCancelled: market.status === Status.CANCELLED,
    isPaused: market.status === Status.PAUSED,
    isOneSideMarket: isOneSideMarket(leagueId),
    isPlayerPropsMarket: isPlayerPropsMarket(market.typeId),
    isOneSidePlayerPropsMarket: isOneSidePlayerPropsMarket(market.typeId),
    isYesNoPlayerPropsMarket: isYesNoPlayerPropsMarket(market.typeId),
    playerProps: {
      playerId: market.playerProps.playerId,
      playerName: market.playerProps.playerName,
    },
    combinedPositions: market.combinedPositions
      ? market.combinedPositions.map((combinedPosition) => {
          return combinedPosition.map((position) => {
            return {
              ...position,
              line: position.line / 100,
            };
          });
        })
      : new Array(market.odds.length).fill([]),
    odds: market.odds.map((odd) => {
      const formattedOdds = Number(odd) > 0 ? bigNumberFormatter(odd) : 0;
      return {
        american: formattedOdds ? formatMarketOdds(formattedOdds, OddsType.AMERICAN) : 0,
        decimal: formattedOdds ? formatMarketOdds(formattedOdds, OddsType.DECIMAL) : 0,
        normalizedImplied: formattedOdds ? formatMarketOdds(formattedOdds, OddsType.AMM) : 0,
      };
    }),
    proof: market.proof,
  };
};

const readAwsS3File = async (bucket, key) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  const response = await awsS3Client.send(command);
  return response.Body.transformToString();
};

const loadMarkets = async (isTestNetwork) => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const listFolderName = isTestNetwork ? process.env.AWS_FOLDER_NAME_LIST_TEST : process.env.AWS_FOLDER_NAME_LIST;
  const network = isTestNetwork ? "test" : "mainnets";

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: listFolderName,
  });

  let markets = [];
  try {
    let isTruncated = true;

    let merkleTreesList = [];

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } = await awsS3Client.send(command);
      const contentsList = Contents.map((c) => c.Key);
      console.log(`Markets ${network}: Available sport merkle trees: ${contentsList.length}`);
      merkleTreesList = [...merkleTreesList, ...contentsList];

      isTruncated = IsTruncated;
      command.input.ContinuationToken = NextContinuationToken;
    }

    for (let i = 0; i < merkleTreesList.length; i++) {
      const merkleTreesItem = merkleTreesList[i];
      const merkleTreeFileConent = await readAwsS3File(bucketName, merkleTreesItem);

      const marketFiles = merkleTreeFileConent ? merkleTreeFileConent.split(",").map((f) => f.trim()) : [];

      for (let j = 0; j < marketFiles.length; j++) {
        const marketFile = marketFiles[j];
        try {
          const marketFileContent = await readAwsS3File(bucketName, marketFile);
          markets = [...markets, ...JSON.parse(marketFileContent)];
        } catch (e) {
          console.log(`Markets ${network}: Error reading file ${marketFile}. Skipped for now. Error: ${e}`);
        }
      }
    }
  } catch (e) {
    console.log(`Markets ${network}: Error reading merkle trees: ${e}`);
  }

  return markets;
};

const mapMarket = (market) => {
  const packedMarket = packMarket(market);
  packedMarket.childMarkets = [];
  market.childMarkets.forEach((childMarket) => {
    let packedChildMarket = packMarket(childMarket);
    packedMarket.childMarkets.push(packedChildMarket);
  });

  const isStarted = packedMarket.maturityDate < new Date();

  if (packedMarket.isOpen && !isStarted) {
    packedMarket.statusCode = "open";
  }
  if ((packedMarket.isOpen || packedMarket.isPaused) && isStarted) {
    packedMarket.statusCode = "ongoing";
  }
  if (packedMarket.isPaused) {
    packedMarket.statusCode = "paused";
  }

  return packedMarket;
};

function getClosedMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], function (err, obj) {
      const closedMarketsMap = new Map(JSON.parse(obj));
      resolve(closedMarketsMap);
    });
  });
}

function getOpenMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], function (err, obj) {
      const openMarketsMap = new Map(JSON.parse(obj));
      resolve(openMarketsMap);
    });
  });
}

async function loadAndMapMarkets(isTestNetwork) {
  const markets = await loadMarkets(isTestNetwork);
  return markets.map((market) => mapMarket(market));
}

async function processAllMarkets(markets, network) {
  const openMarketsMap = new Map();

  const closedMarketsMap = await getClosedMarketsMap(network);

  markets.forEach((market) => {
    const isMarketClosed = !!closedMarketsMap.get(market.gameId);
    if (
      !isMarketClosed &&
      (market.statusCode === "open" || market.statusCode === "ongoing" || market.statusCode === "paused")
    ) {
      openMarketsMap.set(market.gameId, market);
    }
  });

  redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[network], JSON.stringify([...openMarketsMap]), function () {});
}

async function updateMerkleTree(gameIds) {
  const startTime = new Date().getTime();
  console.log(`Markets mainnets: Updating merkle tree for ${gameIds.length} games`);

  const bucketName = process.env.AWS_BUCKET_NAME;
  const merkleTreesFolderName = process.env.AWS_FOLDER_NAME_MERKLES;

  // TODO: add test network, for now only mainnets
  const opOpenMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);
  // const arbOpenMarketsMap = await getOpenMarketsMap(NETWORK.Arbitrum);
  // const baseOpenMarketsMap = await getOpenMarketsMap(NETWORK.Base);

  for (let i = 0; i < gameIds.length; i++) {
    const gameIdString = convertFromBytes32(gameIds[i]);
    const marketFile = `${merkleTreesFolderName}/${gameIdString}.json`;
    try {
      const marketFileContent = await readAwsS3File(bucketName, marketFile);
      const market = JSON.parse(marketFileContent)[0];

      const mappedMarket = mapMarket(market);

      opOpenMarketsMap.set(mappedMarket.gameId, mappedMarket);
      // arbOpenMarketsMap.set(mappedMarket.gameId, mappedMarket);
      // baseOpenMarketsMap.set(mappedMarket.gameId, mappedMarket);
    } catch (e) {
      console.log(`Markets mainnets: Error reading file ${marketFile}. Skipped for now. Error: ${e}`);
    }
  }

  redisClient.set(
    KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism],
    JSON.stringify([...opOpenMarketsMap]),
    function () {},
  );
  // redisClient.set(
  //   KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Arbitrum],
  //   JSON.stringify([...arbOpenMarketsMap]),
  //   function () {},
  // );
  // redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Base], JSON.stringify([...baseOpenMarketsMap]), function () {});

  const endTime = new Date().getTime();
  console.log(`Markets mainnets: Seconds for updating merkle tree: ${(endTime - startTime) / 1000}`);
}

module.exports = {
  processMarkets,
  updateMerkleTree,
};
