const { redisClient, getValuesFromRedisAsync } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { convertFromBytes32 } = require("../utils/markets");
const { NETWORK } = require("../constants/networks");
const { getOpticOddsScore } = require("./gamesInfo");
const { getLeagueProvider, Provider } = require("overtime-live-trading-utils");
const { getRedisKeyForOpticOddsApiResults } = require("../utils/opticOddsStreams");
const {
  mapOpticOddsStreamResults,
  mapOpticOddsApiResults,
  fetchOpticOddsResults,
} = require("../utils/opticOddsResults");

async function processLiveScores() {
  if (process.env.REDIS_URL) {
    console.log("Lives scores: create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });

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

function getLiveScoresMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_LIVE_SCORES, function (err, obj) {
      const liveScoresMap = new Map(JSON.parse(obj));
      resolve(liveScoresMap);
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

function getGamesInfoMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
      const gamesInfoMap = new Map(JSON.parse(obj));
      resolve(gamesInfoMap);
    });
  });
}

async function processAllLiveResults(isOpticOddsResultsInitialized) {
  const liveScoresMap = await getLiveScoresMap();
  const gamesInfoMap = await getGamesInfoMap();
  // take only from OP as markets are the same on all networks
  const openOpMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);

  const allOngoingMarketsMap = Array.from(openOpMarketsMap.values()).filter(
    (market) => market.statusCode === "ongoing",
  );

  let opticOddsFixtureIds = [];
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

    if (leagueProvider === Provider.OPTICODDS) {
      if (gameInfo && gameInfo.fixtureId) {
        opticOddsFixtureIds.push(gameInfo.fixtureId);
      } else if (gameInfo) {
        liveScoresMap.set(market.gameId, {
          gameStatus: gameInfo.gameStatus,
          homeScore: 0,
          awayScore: 0,
          homeScoreByPeriod: [],
          awayScoreByPeriod: [],
        });
      }
    }
  }

  if (opticOddsFixtureIds.length > 0) {
    let liveResults = [];

    if (isOpticOddsResultsInitialized) {
      // Read from Redis
      const redisKeysForStreamResults = opticOddsFixtureIds.map((fixtureId) =>
        getRedisKeyForOpticOddsApiResults(fixtureId),
      );
      const opticOddsStreamResults = await getValuesFromRedisAsync(redisKeysForStreamResults);
      liveResults = mapOpticOddsStreamResults(opticOddsStreamResults);
    } else {
      // Fetch from API
      const opticOddsApiResults = await fetchOpticOddsResults(opticOddsFixtureIds);
      if (opticOddsApiResults.length > 0) {
        liveResults = mapOpticOddsApiResults(opticOddsApiResults);
        isOpticOddsResultsInitialized = true;
      }
    }

    liveResults.forEach((event) => {
      if (event.game_id) {
        const gameId = bytes32({ input: event.game_id });

        const homeScores = getOpticOddsScore(event, market.leagueId, "home");
        const awayScores = getOpticOddsScore(event, market.leagueId, "away");

        const period = parseInt(event.period);

        liveScoresMap.set(gameId, {
          lastUpdate: new Date().getTime(),
          period: Number.isNaN(period) ? undefined : period,
          gameStatus: event.period === "HALF" ? "Half" : event.status,
          displayClock: event.clock,
          homeScore: homeScores.score,
          awayScore: awayScores.score,
          homeScoreByPeriod: homeScores.scoreByPeriod,
          awayScoreByPeriod: awayScores.scoreByPeriod,
        });
      }
    });
  }

  console.log(`Lives scores: Number of lives scores: ${Array.from(liveScoresMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_LIVE_SCORES, JSON.stringify([...liveScoresMap]), function () {});
}

module.exports = {
  processLiveScores,
};
