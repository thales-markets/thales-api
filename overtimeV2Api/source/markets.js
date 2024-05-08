require("dotenv").config();

const redis = require("redis");
const { delay } = require("../../overtimeApi/utils/general");
const { bigNumberFormatter } = require("../../overtimeApi/utils/formatters");
// const markets = require("./treeMarketsAndHashes.json");
const {
  fixDuplicatedTeamName,
  getLeagueNameById,
  getIsOneSideMarket,
  getIsOneSidePlayerPropsMarket,
  formatMarketOdds,
  getIsYesNoPlayerPropsMarket,
  getIsEnetpulseSport,
  getIsPlayerPropsMarket,
} = require("../../overtimeApi/utils/markets");
const { SPORTS_MAP } = require("../../overtimeApi/constants/tags");
const { MARKET_TYPE, ODDS_TYPE, STATUS } = require("../../overtimeApi/constants/markets");
const KEYS = require("../../redis/redis-keys");
const { ListObjectsV2Command, S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

let marketsMap = new Map();

const awsS3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function processMarkets() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("process markets");
          await processAllMarkets();
          const endTime = new Date().getTime();
          console.log(`Seconds for processing: ${((endTime - startTime) / 1000).toFixed(0)}`);
        } catch (error) {
          console.log("markets error: ", error);
        }

        await delay(5 * 1000);
      }
    }, 3000);
  }
}

const packMarket = (market) => {
  const leagueId = `${market.sportId}`.startsWith("9153")
    ? 9153
    : `${market.sportId}`.startsWith("9156")
    ? 9156
    : `${market.sportId}`.startsWith("9007")
    ? 9007
    : market.sportId;
  const isEnetpulseSport = getIsEnetpulseSport(leagueId);
  const type = MARKET_TYPE[market.typeId];

  return {
    gameId: market.gameId,
    sport: SPORTS_MAP[leagueId],
    leagueId: leagueId,
    leagueName: getLeagueNameById(leagueId),
    subLeagueId: market.sportId,
    typeId: market.typeId,
    type,
    maturity: market.maturity,
    maturityDate: new Date(market.maturity * 1000),
    homeTeam: fixDuplicatedTeamName(market.homeTeam, isEnetpulseSport),
    awayTeam: fixDuplicatedTeamName(market.awayTeam, isEnetpulseSport),
    homeScore: market.homeScore || 0,
    awayScore: market.awayScore || 0,
    finalResult: market.finalResult || 0,
    status: market.status,
    isOpen: market.status === STATUS.Open,
    isResolved: market.status === STATUS.Resolved,
    isCanceled: market.status === STATUS.Canceled,
    isPaused: market.status === STATUS.Paused,
    isOneSideMarket: getIsOneSideMarket(leagueId),
    line: Number(market.line) / 100,
    isPlayerPropsMarket: getIsPlayerPropsMarket(market.typeId),
    isOneSidePlayerPropsMarket: getIsOneSidePlayerPropsMarket(market.typeId),
    isYesNoPlayerPropsMarket: getIsYesNoPlayerPropsMarket(market.typeId),
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
        american: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.American) : 0,
        decimal: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.Decimal) : 0,
        normalizedImplied: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.AMM) : 0,
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

const loadMarkets = async () => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const merkleTreeFolderName = process.env.AWS_FOLDER_NAME_MERKLES;
  const listFolderName = process.env.AWS_FOLDER_NAME_LIST;

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
      console.log(`Available sport merkle trees: ${contentsList.length}`);
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
          console.log(`Error reading file ${marketFile}. Skipped for now.`);
        }
      }
    }
  } catch (e) {
    console.log(`Error reading merkle trees: ${e}`);
  }

  return markets;
};

const mapMarkets = async () => {
  const mappedOpenMarkets = [];
  const mappedOngoingMarkets = [];
  const mappedResolvedMarkets = [];
  const mappedCanceledMarkets = [];
  const mappedPausedMarkets = [];

  const markets = await loadMarkets();

  markets.forEach((market) => {
    let packedMarket = packMarket(market);
    packedMarket.childMarkets = [];
    market.childMarkets.forEach((childMarket) => {
      let packedChildMarket = packMarket(childMarket);
      packedMarket.childMarkets.push(packedChildMarket);
    });

    const isStarted = packedMarket.maturityDate < new Date();

    if (packedMarket.isOpen && !isStarted) {
      mappedOpenMarkets.push(packedMarket);
    }
    if ((packedMarket.isOpen || packedMarket.isPaused) && isStarted) {
      mappedOngoingMarkets.push(packedMarket);
    }
    if (packedMarket.isResolved) {
      mappedResolvedMarkets.push(packedMarket);
    }
    if (packedMarket.isCanceled) {
      mappedCanceledMarkets.push(packedMarket);
    }
    if (packedMarket.isPaused) {
      mappedPausedMarkets.push(packedMarket);
    }
  });

  return { mappedOpenMarkets, mappedOngoingMarkets, mappedResolvedMarkets, mappedCanceledMarkets, mappedPausedMarkets };
};

async function processAllMarkets() {
  const mappedMarkets = await mapMarkets();
  marketsMap.set("open", mappedMarkets.mappedOpenMarkets);
  marketsMap.set("ongoing", mappedMarkets.mappedOngoingMarkets);
  marketsMap.set("resolved", mappedMarkets.mappedResolvedMarkets);
  marketsMap.set("canceled", mappedMarkets.mappedCanceledMarkets);
  marketsMap.set("paused", mappedMarkets.mappedPausedMarkets);
  redisClient.set(KEYS.OVERTIME_V2_MARKETS, JSON.stringify([...marketsMap]), function () {});
}

module.exports = {
  processMarkets,
};
