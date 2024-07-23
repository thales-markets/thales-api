const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const { getProvider } = require("../utils/provider");
const KEYS = require("../../redis/redis-keys");
const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { ethers } = require("ethers");
const { Status, ResultType, OverUnderType, MarketTypeMap } = require("../constants/markets");
const {
  getIsCombinedPositionsMarket,
  isPlayerPropsMarket,
  isOneSidePlayerPropsMarket,
  isYesNoPlayerPropsMarket,
} = require("../utils/markets");

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
          // await resolveMarkets(NETWORK.Arbitrum),
          // await resolveMarkets(NETWORK.Base),
          // await resolveMarkets(NETWORK.OptimismSepolia);
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

function getOpenMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], function (err, obj) {
      const openMarketsMap = new Map(JSON.parse(obj));
      resolve(openMarketsMap);
    });
  });
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

async function cleanMarkets(network) {
  const closedMarketsMap = await getClosedMarketsMap(network);
  const cleanerNumberOfDaysInPast = Number(process.env.CLEANER_NUMBER_OF_DAYS_IN_PAST);

  const today = new Date();
  const minMaturity = Math.round(
    new Date(new Date().setDate(today.getDate() - cleanerNumberOfDaysInPast)).getTime() / 1000,
  );

  let numberOfMarketsForClean = 0;
  closedMarketsMap.forEach((market, key) => {
    if (Number(market.maturity) < Number(minMaturity) && !!market.noTickets) {
      closedMarketsMap.delete(key);
      numberOfMarketsForClean++;
    }
  });
  console.log(`Cleaner: number of closed markets without tickets deleted: ${numberOfMarketsForClean}`);

  redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], JSON.stringify([...closedMarketsMap]), function () {});
}

module.exports = {
  processClean,
};
