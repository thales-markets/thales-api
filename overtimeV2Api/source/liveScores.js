const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { convertFromBytes32 } = require("../utils/markets");
const { NETWORK } = require("../constants/networks");
const { getOpticOddsScore } = require("./gamesInfo");
const { getLeagueProvider, Provider } = require("overtime-live-trading-utils");
const { getRedisKeyForOpticOddsStreamEventResults } = require("../utils/opticOdds/opticOddsStreamsConnector");
const {
  mapOpticOddsStreamResults,
  mapOpticOddsApiResults,
  fetchOpticOddsResults,
  isOpticOddsStreamResultsDisabled,
} = require("../utils/opticOdds/opticOddsResults");

async function processLiveScores() {
  if (process.env.REDIS_URL) {
    let isOpticOddsResultsInitialized = false;

    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Lives scores: process lives scores");
          await processAllLiveResults(isOpticOddsResultsInitialized);
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

async function processAllLiveResults(isOpticOddsResultsInitialized) {
  const liveScoresMap = await getLiveScoresMap();
  const gamesInfoMap = await getGamesInfoMap();
  // take only from OP as markets are the same on all networks
  const openOpMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);

  const allOngoingMarketsMap = Array.from(openOpMarketsMap.values()).filter(
    (market) => market.statusCode === "ongoing",
  );

  let opticOddsGameIdsWithLeagueID = [];
  for (let i = 0; i < allOngoingMarketsMap.length; i++) {
    const market = allOngoingMarketsMap[i];
    const leagueId = market.leagueId;
    const leagueProvider = getLeagueProvider(leagueId);
    const gameInfo = gamesInfoMap.get(market.gameId);

    if (leagueProvider === Provider.RUNDOWN && gameInfo && gameInfo.provider === Provider.RUNDOWN) {
      const eventApiUrl = `https://therundown.io/api/v2/events/${convertFromBytes32(market.gameId)}?key=${
        process.env.RUNDOWN_API_KEY
      }`;

      const eventResponse = await axios.get(eventApiUrl);
      const eventResponseData = eventResponse.data;

      if (eventResponseData !== null) {
        eventResponseData.events.forEach((event) => {
          if (event.event_id) {
            const gameId = bytes32({ input: event.event_id });

            liveScoresMap.set(gameId, {
              lastUpdate: new Date().getTime(),
              period: event.score.game_period,
              gameStatus: event.score.event_status,
              displayClock: event.score.display_clock,
              homeScore: event.score.score_home,
              awayScore: event.score.score_away,
              homeScoreByPeriod: event.score.score_home_by_period,
              awayScoreByPeriod: event.score.score_away_by_period,
            });
          }
        });
      }
    }

    if (leagueProvider === Provider.OPTICODDS && market.isV3) {
      opticOddsGameIdsWithLeagueID.push({ gameId: market.gameId, leagueId, gameInfo });
    }
  }

  if (opticOddsGameIdsWithLeagueID.length > 0) {
    let liveResults = [];
    const opticOddsGameIds = opticOddsGameIdsWithLeagueID.map((obj) => convertFromBytes32(obj.gameId));

    if (!isOpticOddsStreamResultsDisabled && isOpticOddsResultsInitialized) {
      // Read from Redis
      const redisKeysForStreamResults = opticOddsGameIds.map((gameId) =>
        getRedisKeyForOpticOddsStreamEventResults(gameId),
      );
      const objArray = await redisClient.mGet(redisKeysForStreamResults);
      const opticOddsStreamResults = objArray.filter((obj) => obj !== null).map((obj) => JSON.parse(obj));
      liveResults = mapOpticOddsStreamResults(opticOddsStreamResults);
    } else {
      // Fetch from API
      const opticOddsApiResults = await fetchOpticOddsResults(opticOddsGameIds);
      if (opticOddsApiResults.length > 0) {
        liveResults = mapOpticOddsApiResults(opticOddsApiResults);
        isOpticOddsResultsInitialized = true;
      }
    }

    opticOddsGameIdsWithLeagueID.forEach((obj) => {
      const opticOddsEvent = liveResults.find((event) => event.gameId === obj.gameId);
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
