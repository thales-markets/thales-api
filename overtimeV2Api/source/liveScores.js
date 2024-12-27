const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const { NETWORK } = require("../constants/networks");
const { getOpticOddsScore } = require("./gamesInfo");
const { getLeagueProvider, Provider, mapFromBytes32ToOpticOddsFormat } = require("overtime-live-trading-utils");
const { getRedisKeyForOpticOddsStreamEventResults } = require("../utils/opticOdds/opticOddsStreamsConnector");
const {
  mapOpticOddsStreamResults,
  mapOpticOddsApiResults,
  fetchOpticOddsResults,
  isOpticOddsStreamResultsDisabled,
} = require("../utils/opticOdds/opticOddsResults");

async function processLiveScores() {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";
    const resultsInitialization = { isInitialized: false };

    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Lives scores: process lives scores");

          await processAllLiveResults(resultsInitialization, isTestnet);

          const endTime = new Date().getTime();
          console.log(
            `Lives scores: === Seconds for processing lives scores: ${((endTime - startTime) / 1000).toFixed(0)} ===`,
          );
        } catch (error) {
          console.log("Lives scores: lives scores error: ", error);
        }

        await delay(5 * 1000);
      }
    }, 3000);
  }
}

async function getLiveScoresMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_SCORES);
  const liveScoresMap = new Map(JSON.parse(obj));
  return liveScoresMap;
}

async function getOpenMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
  const openMarkets = new Map(JSON.parse(obj));
  return openMarkets;
}

async function getGamesInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
}

async function processAllLiveResults(resultsInitialization, isTestnet) {
  const liveScoresMap = await getLiveScoresMap();
  const gamesInfoMap = await getGamesInfoMap();
  // take only from OP as markets are the same on all networks
  const openOpMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);

  const allOngoingMarketsMap = Array.from(openOpMarketsMap.values()).filter(
    (market) => market.statusCode === "ongoing",
  );

  const opticOddsGameIdsWithLeagueID = [];
  for (let i = 0; i < allOngoingMarketsMap.length; i++) {
    const market = allOngoingMarketsMap[i];
    const leagueId = market.leagueId;
    const leagueProvider = getLeagueProvider(leagueId);
    const gameInfo = gamesInfoMap.get(market.gameId);

    if (leagueProvider === Provider.OPTICODDS && market.isV3) {
      opticOddsGameIdsWithLeagueID.push({ gameId: market.gameId, leagueId, gameInfo });
    }
  }

  if (opticOddsGameIdsWithLeagueID.length > 0) {
    let liveResults = [];
    const opticOddsGameIds = opticOddsGameIdsWithLeagueID.map((obj) => mapFromBytes32ToOpticOddsFormat(obj.gameId));

    if (!isOpticOddsStreamResultsDisabled && resultsInitialization.isInitialized) {
      // Read from Redis
      const redisKeysForStreamResults = opticOddsGameIds.map((gameId) =>
        getRedisKeyForOpticOddsStreamEventResults(gameId, isTestnet),
      );
      const objArray = await redisClient.mGet(redisKeysForStreamResults);
      const opticOddsStreamResults = objArray.filter((obj) => obj !== null).map((obj) => JSON.parse(obj));
      liveResults = mapOpticOddsStreamResults(opticOddsStreamResults);
    } else {
      // Fetch from API
      const opticOddsApiResults = await fetchOpticOddsResults(opticOddsGameIds);
      if (opticOddsApiResults.length > 0) {
        liveResults = mapOpticOddsApiResults(opticOddsApiResults);
        resultsInitialization.isInitialized = true;
      }
    }

    opticOddsGameIdsWithLeagueID.forEach((obj) => {
      const opticOddsEvent = liveResults.find((event) => event.gameId === mapFromBytes32ToOpticOddsFormat(obj.gameId));
      if (opticOddsEvent) {
        const homeScores = getOpticOddsScore(opticOddsEvent, obj.leagueId, "home");
        const awayScores = getOpticOddsScore(opticOddsEvent, obj.leagueId, "away");

        const period = parseInt(opticOddsEvent.period);

        liveScoresMap.set(obj.gameId, {
          lastUpdate: new Date().getTime(),
          period: Number.isNaN(period) ? undefined : period,
          gameStatus: opticOddsEvent.period,
          displayClock: opticOddsEvent.clock,
          homeScore: homeScores.score,
          awayScore: awayScores.score,
          homeScoreByPeriod: homeScores.scoreByPeriod,
          awayScoreByPeriod: awayScores.scoreByPeriod,
        });
      } else if (obj.gameInfo) {
        liveScoresMap.set(obj.gameInfo.gameId, {
          gameStatus: obj.gameInfo.gameStatus,
          homeScore: 0,
          awayScore: 0,
          homeScoreByPeriod: [],
          awayScoreByPeriod: [],
        });
      }
    });
  }

  console.log(`Lives scores: Number of lives scores: ${Array.from(liveScoresMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_LIVE_SCORES, JSON.stringify([...liveScoresMap]));
}

module.exports = {
  processLiveScores,
};
