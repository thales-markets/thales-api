const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { convertFromBytes32 } = require("../utils/markets");
const { NETWORK } = require("../constants/networks");
const { getLeagueProvider } = require("../utils/sports");
const { Provider } = require("../constants/sports");
const { getOpticOddsScore } = require("./gamesInfo");

async function processLiveScores() {
  if (process.env.REDIS_URL) {
    console.log("Lives scores: create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Lives scores: process lives scores");
          await processAllLiveScores();
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

async function processAllLiveScores() {
  const liveScoresMap = await getLiveScoresMap();
  const gamesInfoMap = await getGamesInfoMap();
  // TODO: take from OP and OP Sepolia for now
  const openMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);
  const openSepoliaMarketsMap = await getOpenMarketsMap(NETWORK.OptimismSepolia);

  const allOngoingMarketsMap = [
    ...Array.from(openMarketsMap.values()),
    ...Array.from(openSepoliaMarketsMap.values()),
  ].filter((market) => market.statusCode === "ongoing");

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
      const scoresApiUrl = `https://api.opticodds.com/api/v2/scores?game_id=${convertFromBytes32(market.gameId)}`;
      const scoresResponse = await axios.get(scoresApiUrl, {
        headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
      });

      const scoresResponseData = scoresResponse.data;

      if (scoresResponseData !== null && scoresResponseData.data.length > 0) {
        scoresResponseData.data.forEach((event) => {
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

  console.log(`Lives scores: Number of lives scores: ${Array.from(liveScoresMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_LIVE_SCORES, JSON.stringify([...liveScoresMap]), function () {});
}

module.exports = {
  processLiveScores,
};
