const { redisClient } = require("../../redis/client");
const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const { NETWORK } = require("../constants/networks");
require("dotenv").config();

async function processClean() {
  if (process.env.REDIS_URL) {
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Cleaner: clean markets");
          await cleanMarkets(NETWORK.Optimism);
          await cleanMarkets(NETWORK.Arbitrum);
          // await cleanMarkets(NETWORK.Base);
          await cleanMarkets(NETWORK.OptimismSepolia);
          await cleanGamesInfo();
          await cleanLiveScores();
          const endTime = new Date().getTime();
          console.log(`Cleaner: === Seconds for cleaning: ${((endTime - startTime) / 1000).toFixed(0)} ===`);
        } catch (error) {
          console.log("Cleaner: clean markets error: ", error);
        }

        await delay(24 * 60 * 60 * 1000);
      }
    }, 3000);
  }
}

async function getClosedMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network]);
  const closedMarketsMap = new Map(JSON.parse(obj));
  return closedMarketsMap;
}

async function getGamesInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
}

async function getLiveScoresMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_SCORES);
  const liveScoresMap = new Map(JSON.parse(obj));
  return liveScoresMap;
}

async function cleanMarkets(network) {
  const closedMarketsMap = await getClosedMarketsMap(network);
  const cleanerNumberOfDaysInPast = Number(process.env.MARKETS_CLEANER_NUMBER_OF_DAYS_IN_PAST);

  const today = new Date();
  const maxMaturity = Math.round(
    new Date(new Date().setDate(today.getDate() - cleanerNumberOfDaysInPast)).getTime() / 1000,
  );

  let numberOfMarketsForClean = 0;
  closedMarketsMap.forEach((market, key) => {
    if (Number(market.maturity) < Number(maxMaturity)) {
      closedMarketsMap.delete(key);
      numberOfMarketsForClean++;
    }
  });
  console.log(`Cleaner: number of closed markets deleted ${network}: ${numberOfMarketsForClean}`);

  redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], JSON.stringify([...closedMarketsMap]));
}

async function cleanGamesInfo() {
  const gamesInfoMap = await getGamesInfoMap();
  // TODO: take from OP and ARB for now
  const closedMarketsMapOp = await getClosedMarketsMap(NETWORK.Optimism);
  const closedMarketsMapArb = await getClosedMarketsMap(NETWORK.Arbitrum);

  const cleanerNumberOfDaysInPast = Number(process.env.GAMES_INFO_CLEANER_NUMBER_OF_DAYS_IN_PAST);

  const today = new Date();
  const maxLastUpdate = new Date(new Date().setDate(today.getDate() - cleanerNumberOfDaysInPast)).getTime();

  let numberOfGamesInfoForClean = 0;
  gamesInfoMap.forEach((gameInfo, key) => {
    if (!gameInfo.hasTickets) {
      if (
        (closedMarketsMapOp.has(key) && !closedMarketsMapOp.get(key).noTickets) ||
        (closedMarketsMapArb.has(key) && !closedMarketsMapArb.get(key).noTickets)
      ) {
        gameInfo.hasTickets = true;
      } else if (Number(gameInfo.lastUpdate || 0) < Number(maxLastUpdate)) {
        gamesInfoMap.delete(key);
        numberOfGamesInfoForClean++;
      }
    }
  });
  console.log(`Cleaner: number of games info without tickets deleted: ${numberOfGamesInfoForClean}`);

  redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]));
}

async function cleanLiveScores() {
  const liveScoresMap = await getLiveScoresMap();
  const cleanerNumberOfDaysInPast = Number(process.env.LIVE_SCORES_CLEANER_NUMBER_OF_DAYS_IN_PAST);

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

  redisClient.set(KEYS.OVERTIME_V2_LIVE_SCORES, JSON.stringify([...liveScoresMap]));
}

module.exports = {
  processClean,
};
