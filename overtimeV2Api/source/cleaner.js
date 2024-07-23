const { redisClient } = require("../../redis/client");
const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const { NETWORK } = require("../constants/networks");
require("dotenv").config();

async function processClean() {
  if (process.env.REDIS_URL) {
    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Cleaner: clean markets");
          await cleanMarkets(NETWORK.Optimism);
          // await cleanMarkets(NETWORK.Arbitrum);
          // await cleanMarkets(NETWORK.Base);
          await cleanMarkets(NETWORK.OptimismSepolia);
          await cleanGamesInfo();
          await cleanLiveScores();
          const endTime = new Date().getTime();
          console.log(`Cleaner: === Seconds for cleaning: ${((endTime - startTime) / 1000).toFixed(0)} ===`);
        } catch (error) {
          console.log("Cleaner: clean markets error: ", error);
        }

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

function getClosedMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], function (err, obj) {
      const closedMarketsMap = new Map(JSON.parse(obj));
      resolve(closedMarketsMap);
    });
  });
}

function getGamesInfoMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
      const gamesInfoMap = new Map(JSON.parse(obj));
      resolve(gamesInfoMap);
    });
  });
}

function getLiveScoresMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_LIVE_SCORES, function (err, obj) {
      const liveScoresMap = new Map(JSON.parse(obj));
      resolve(liveScoresMap);
    });
  });
}

async function cleanMarkets(network) {
  const closedMarketsMap = await getClosedMarketsMap(network);
  const cleanerNumberOfDaysInPast = Number(process.env.CLEANER_NUMBER_OF_DAYS_IN_PAST);

  const today = new Date();
  const maxMaturity = Math.round(
    new Date(new Date().setDate(today.getDate() - cleanerNumberOfDaysInPast)).getTime() / 1000,
  );

  let numberOfMarketsForClean = 0;
  closedMarketsMap.forEach((market, key) => {
    if (Number(market.maturity) < Number(maxMaturity) && !!market.noTickets) {
      closedMarketsMap.delete(key);
      numberOfMarketsForClean++;
    }
  });
  console.log(`Cleaner: number of closed markets without tickets deleted: ${numberOfMarketsForClean}`);

  redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], JSON.stringify([...closedMarketsMap]), function () {});
}

async function cleanGamesInfo() {
  const gamesInfoMap = await getGamesInfoMap();
  // TODO: take from OP and OP Sepolia for now
  const closedMarketsMap = await getClosedMarketsMap(NETWORK.Optimism);
  const closedMarketsMapSepolia = await getClosedMarketsMap(NETWORK.OptimismSepolia);

  const allClosedMarketsMap = new Map([...closedMarketsMap, ...closedMarketsMapSepolia]);

  const cleanerNumberOfDaysInPast = Number(process.env.CLEANER_NUMBER_OF_DAYS_IN_PAST);

  const today = new Date();
  const maxLastUpdate = new Date(new Date().setDate(today.getDate() - cleanerNumberOfDaysInPast)).getTime();

  let numberOfGamesInfoForClean = 0;
  gamesInfoMap.forEach((gameInfo, key) => {
    if (!allClosedMarketsMap.has(key) && Number(gameInfo.lastUpdate || 0) < Number(maxLastUpdate)) {
      gamesInfoMap.delete(key);
      numberOfGamesInfoForClean++;
    }
  });
  console.log(`Cleaner: number of games info without tickets deleted: ${numberOfGamesInfoForClean}`);

  redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]), function () {});
}

async function cleanLiveScores() {
  const liveScoresMap = await getLiveScoresMap();
  const cleanerNumberOfDaysInPast = Number(process.env.CLEANER_NUMBER_OF_DAYS_IN_PAST);

  const today = new Date();
  const maxLastUpdate = new Date(new Date().setDate(today.getDate() - cleanerNumberOfDaysInPast)).getTime();

  let numberOfLiveScoresForClean = 0;
  liveScoresMap.forEach((liveScore, key) => {
    if (Number(liveScore.lastUpdate || 0) < Number(maxLastUpdate)) {
      liveScoresMap.delete(key);
      numberOfLiveScoresForClean++;
    }
  });
  console.log(`Cleaner: number of live scores deleted: ${numberOfLiveScoresForClean}`);

  redisClient.set(KEYS.OVERTIME_V2_LIVE_SCORES, JSON.stringify([...liveScoresMap]), function () {});
}

module.exports = {
  processClean,
};
