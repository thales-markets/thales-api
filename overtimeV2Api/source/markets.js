const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const { packMarket } = require("../utils/markets");
const KEYS = require("../../redis/redis-keys");
const { ListObjectsV2Command, S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { NETWORK } = require("../constants/networks");
const { convertFromBytes32 } = require("overtime-live-trading-utils");

const awsS3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

let numberOfExecution = 0;

async function processMarkets() {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";
    const network = isTestnet ? "testnet" : "mainnets";

    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log(`Markets ${network} (execution number: ${numberOfExecution}): process markets`);

          const fullUpdateAfterExecutions = Number(process.env.FULL_UPDATE_AFTER_EXECUTIONS) || 10;
          const shouldDoFullUpdate = numberOfExecution % fullUpdateAfterExecutions === 0;
          const markets = await loadAndMapMarkets(isTestnet, shouldDoFullUpdate);
          isTestnet
            ? await Promise.all([processAllMarkets(markets, NETWORK.OptimismSepolia, shouldDoFullUpdate)])
            : await Promise.all([
                processAllMarkets(markets, NETWORK.Optimism, shouldDoFullUpdate),
                processAllMarkets(markets, NETWORK.Arbitrum, shouldDoFullUpdate),
              ]);
          const endTime = new Date().getTime();
          console.log(
            `Markets ${network} (execution number: ${numberOfExecution}): === Seconds for processing markets: ${(
              (endTime - startTime) /
              1000
            ).toFixed(0)} ===`,
          );
        } catch (error) {
          console.log(`Markets ${network}: markets error: `, error);
        }
        numberOfExecution++;

        await delay(Number(process.env.DELAY_FOR_PROCESS_MARKETS) || 1000);
      }
    }, 3000);
  }
}

const readAwsS3File = async (bucket, key) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  const response = await awsS3Client.send(command);
  return response.Body.transformToString();
};

const loadMarkets = async (isTestnet, shouldDoFullUpdate) => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const listFolderName = isTestnet
    ? shouldDoFullUpdate
      ? process.env.AWS_FOLDER_NAME_LIST_TEST
      : process.env.AWS_FOLDER_NAME_MODIFIED_TREES_TEST
    : shouldDoFullUpdate
    ? process.env.AWS_FOLDER_NAME_LIST
    : process.env.AWS_FOLDER_NAME_MODIFIED_TREES;
  const network = isTestnet ? "testnet" : "mainnets";

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
      merkleTreesList = [...merkleTreesList, ...contentsList];

      isTruncated = IsTruncated;
      command.input.ContinuationToken = NextContinuationToken;
    }

    const merkleTreesFileContents = await Promise.all(
      merkleTreesList.map((merkleTreesItem) => readAwsS3File(bucketName, merkleTreesItem)),
    );

    let numberOfGames = 0;
    await Promise.all(
      merkleTreesFileContents.map(async (merkleTreeFileConent) => {
        let marketFiles = [];
        let lines = 0;
        if (merkleTreeFileConent) {
          if (shouldDoFullUpdate) {
            marketFiles = merkleTreeFileConent.split(",").map((f) => f.trim());
          } else {
            lines = merkleTreeFileConent.split("\n");
            lines.forEach((line) => {
              const merkleTreeTimestampArray = line.split(":");
              const checkMerkleTreesPeriod = Number(process.env.CHECK_MERKLE_TREES_PERIOD) || 60000;
              const minTimestampForUpdate = Math.round((new Date().getTime() - checkMerkleTreesPeriod) / 1000);
              const lastModified = Number(merkleTreeTimestampArray[1] || 0);
              if (lastModified >= minTimestampForUpdate) {
                marketFiles.push(merkleTreeTimestampArray[0]);
              }
            });
          }
        }

        const marketFileContents = await Promise.all(
          marketFiles.map((marketFile) => readAwsS3File(bucketName, marketFile)),
        );
        marketFileContents.map((content) => {
          const arr = JSON.parse(content);
          markets = [...markets, ...arr];
        });

        numberOfGames += marketFileContents.length;
      }),
    );

    if (shouldDoFullUpdate) {
      console.log(`Execution number: ${numberOfExecution}, merkle trees full update. Total games: ${numberOfGames}.`);
    } else {
      console.log(`Execution number: ${numberOfExecution}, only modified trees update. Total games: ${numberOfGames}.`);
    }
  } catch (e) {
    console.log(`Markets ${network}: Error reading merkle trees: ${e}`);
  }

  return markets;
};

const mapMarket = (market) => {
  const packedMarket = packMarket(market, false);
  packedMarket.childMarkets = [];
  market.childMarkets.forEach((childMarket) => {
    const packedChildMarket = packMarket(childMarket, true);
    packedMarket.childMarkets.push(packedChildMarket);
  });

  const isStarted = packedMarket.maturityDate < new Date();

  if (packedMarket.isOpen && !isStarted) {
    packedMarket.statusCode = "open";
  }
  if (packedMarket.isPaused) {
    packedMarket.statusCode = "paused";
  }
  if (isStarted) {
    packedMarket.statusCode = "ongoing";
  }

  return packedMarket;
};

async function getOpenMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
  const openMarkets = new Map(JSON.parse(obj));
  return openMarkets;
}

async function getNumberOfMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_NUMBER_OF_MARKETS[network]);
  const numberOdMarkets = new Map(JSON.parse(obj));
  return numberOdMarkets;
}

async function getClosedMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network]);
  const closedMarketsMap = new Map(JSON.parse(obj));
  return closedMarketsMap;
}

async function loadAndMapMarkets(isTestnet, shouldDoFullUpdate) {
  const markets = await loadMarkets(isTestnet, shouldDoFullUpdate);
  return markets.map((market) => mapMarket(market));
}

async function processAllMarkets(markets, network, shouldDoFullUpdate) {
  const openMarketsMap = shouldDoFullUpdate ? new Map() : await getOpenMarketsMap(network);
  const numberOfMarketsMap = shouldDoFullUpdate ? new Map() : await getNumberOfMarketsMap(network);

  const closedMarketsMap = await getClosedMarketsMap(network);

  markets.forEach((market) => {
    const isMarketClosed = !!closedMarketsMap.get(market.gameId);
    if (
      !isMarketClosed &&
      (market.statusCode === "open" || market.statusCode === "ongoing" || market.statusCode === "paused")
    ) {
      openMarketsMap.set(market.gameId, market);
      numberOfMarketsMap.set(market.gameId, market.childMarkets.filter((childMarket) => childMarket.isOpen).length + 1);
    }
  });

  redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[network], JSON.stringify([...openMarketsMap]));
  redisClient.set(KEYS.OVERTIME_V2_NUMBER_OF_MARKETS[network], JSON.stringify([...numberOfMarketsMap]));
}

async function updateMerkleTree(gameIds) {
  const startTime = new Date().getTime();
  console.log(`Markets mainnets: Updating merkle tree for ${gameIds.length} games`);

  const bucketName = process.env.AWS_BUCKET_NAME;
  const merkleTreesFolderName = process.env.AWS_FOLDER_NAME_MERKLES;

  // TODO: add test network, for now only mainnets
  const opOpenMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);
  const arbOpenMarketsMap = await getOpenMarketsMap(NETWORK.Arbitrum);
  // const baseOpenMarketsMap = await getOpenMarketsMap(NETWORK.Base);
  const opNumberOfMarketsMap = await getNumberOfMarketsMap(NETWORK.Optimism);
  const arbNumberOfMarketsMap = await getNumberOfMarketsMap(NETWORK.Arbitrum);

  for (let i = 0; i < gameIds.length; i++) {
    const gameIdString = convertFromBytes32(gameIds[i]);
    const marketFile = `${merkleTreesFolderName}/${gameIdString}.json`;
    try {
      const marketFileContent = await readAwsS3File(bucketName, marketFile);
      const market = JSON.parse(marketFileContent)[0];

      const mappedMarket = mapMarket(market);

      opOpenMarketsMap.set(mappedMarket.gameId, mappedMarket);
      arbOpenMarketsMap.set(mappedMarket.gameId, mappedMarket);
      // baseOpenMarketsMap.set(mappedMarket.gameId, mappedMarket);

      const numberOfMarkets = market.childMarkets.filter((childMarket) => childMarket.isOpen).length + 1;
      opNumberOfMarketsMap.set(mappedMarket.gameId, numberOfMarkets);
      arbNumberOfMarketsMap.set(mappedMarket.gameId, numberOfMarkets);
    } catch (e) {
      console.log(`Markets mainnets: Error reading file ${marketFile}. Skipped for now. Error: ${e}`);
    }
  }

  redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism], JSON.stringify([...opOpenMarketsMap]));
  redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Arbitrum], JSON.stringify([...arbOpenMarketsMap]));
  redisClient.set(KEYS.OVERTIME_V2_NUMBER_OF_MARKETS[NETWORK.Optimism], JSON.stringify([...opNumberOfMarketsMap]));
  redisClient.set(KEYS.OVERTIME_V2_NUMBER_OF_MARKETS[NETWORK.Arbitrum], JSON.stringify([...arbNumberOfMarketsMap]));
  // redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Base], JSON.stringify([...baseOpenMarketsMap]));

  const endTime = new Date().getTime();
  console.log(`Markets mainnets: Seconds for updating merkle tree: ${(endTime - startTime) / 1000}`);
}

module.exports = {
  processMarkets,
  updateMerkleTree,
};
