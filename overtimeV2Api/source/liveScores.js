require("dotenv").config();

const redis = require("redis");
const { delay } = require("../utils/general");
const axios = require("axios");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { getIsEnetpulseSportV2, getIsJsonOddsSport, convertFromBytes32 } = require("../utils/markets");
const { NETWORK } = require("../constants/networks");

async function processLiveScores() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
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

async function processAllLiveScores() {
  let liveScoresMap = await getLiveScoresMap();
  // TODO: take from OP for now
  let openMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);

  let allOngoingMarketsMap = Array.from(openMarketsMap.values()).filter((market) => market.statusCode === "ongoing");

  for (let i = 0; i < allOngoingMarketsMap.length; i++) {
    const market = allOngoingMarketsMap[i];
    const leagueId = market.leagueId;

    if (!getIsEnetpulseSportV2(leagueId) && !getIsJsonOddsSport(leagueId)) {
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
  }

  console.log(`Lives scores: Number of lives scores: ${Array.from(liveScoresMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_LIVE_SCORES, JSON.stringify([...liveScoresMap]), function () {});
}

module.exports = {
  processLiveScores,
};
