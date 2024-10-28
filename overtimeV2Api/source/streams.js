const { redisClient } = require("../../redis/client");
const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const { NETWORK } = require("../constants/networks");
const { getLiveSupportedLeagues } = require("overtime-live-trading-utils");
const { uniq } = require("lodash");
const {
  startResultsStreams,
  closeInactiveResultsStreams,
  isOpticOddsStreamResultsDisabled,
} = require("../utils/opticOdds/opticOddsResults");
require("dotenv").config();

async function processOpticOddsResults() {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";
    const network = isTestnet ? "testnet" : "mainnets";
    console.log(`Stream results ${network}: create client from index`);

    const resultsStreamSourcesByLeagueMap = new Map();

    setTimeout(async () => {
      while (true) {
        if (!isOpticOddsStreamResultsDisabled) {
          try {
            const startTime = new Date().getTime();
            console.log(`Stream results ${network}: process Optic Odds results`);

            await processAllLiveResults(resultsStreamSourcesByLeagueMap, isTestnet);

            const endTime = new Date().getTime();
            const duration = ((endTime - startTime) / 1000).toFixed(0);
            console.log(`Stream results ${network}: === Seconds for processing Optic Odds results: ${duration} ===`);
          } catch (error) {
            console.log(`Stream results ${network}: lives Optic Odds results error: ${error}`);
          }
        }

        await delay(5 * 1000);
      }
    }, 3000);
  }
}

const processAllLiveResults = async (resultsStreamSourcesByLeagueMap, isTestnet) => {
  // Get supported live leagues
  const supportedLiveLeagueIds = getLiveSupportedLeagues(isTestnet);

  // Read open markets only from one network as markets are the same on all networks
  const openMarkets = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism]);
  const openMarketsMap = new Map(JSON.parse(openMarkets));

  const supportedLiveMarkets = Array.from(openMarketsMap.values())
    .filter((market) => market.statusCode === "ongoing" && !market.isWholeGameResolved && !market.noTickets)
    .filter((market) => supportedLiveLeagueIds.includes(market.leagueId));
  const uniqueLiveLeagueIds = uniq(supportedLiveMarkets.map((market) => market.leagueId));

  uniqueLiveLeagueIds.forEach((leagueId) => {
    // Start or re-start streams
    startResultsStreams(leagueId, resultsStreamSourcesByLeagueMap);
  });

  // Close inactive streams
  closeInactiveResultsStreams(resultsStreamSourcesByLeagueMap, uniqueLiveLeagueIds);
};

module.exports = {
  processOpticOddsResults,
};
