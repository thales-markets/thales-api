require("dotenv").config();

const redis = require("redis");
const { delay } = require("../utils/general");
const { SPORT_ID_MAP_RUNDOWN } = require("../constants/tags");
const axios = require("axios");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const {
  getIsEnetpulseSportV2,
  getIsJsonOddsSport,
  getIsPlayerPropsMarket,
  convertFromBytes32,
} = require("../utils/markets");

async function processPlayersInfo() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("Players info: create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Players info: process players info");
          await processAllPlayersInfo();
          const endTime = new Date().getTime();
          console.log(
            `Players info: === Seconds for processing players info: ${((endTime - startTime) / 1000).toFixed(0)} ===`,
          );
        } catch (error) {
          console.log("Players info: players info error: ", error);
        }

        await delay(5 * 60 * 1000);
      }
    }, 3000);
  }
}

function getPlayersInfoMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_PLAYERS_INFO, function (err, obj) {
      const playersInfoMap = new Map(JSON.parse(obj));
      resolve(playersInfoMap);
    });
  });
}

function getOpenMarketsMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS, function (err, obj) {
      const openMarketsMap = new Map(JSON.parse(obj));
      resolve(openMarketsMap);
    });
  });
}

async function processAllPlayersInfo() {
  let playersInfoMap = await getPlayersInfoMap();
  let openMarketsMap = await getOpenMarketsMap();

  let allOpenMarketsMap = Array.from(openMarketsMap.values());

  for (let i = 0; i < allOpenMarketsMap.length; i++) {
    const market = allOpenMarketsMap[i];
    const leagueId = market.leagueId;

    if (!getIsEnetpulseSportV2(leagueId) && !getIsJsonOddsSport(leagueId)) {
      const hasPlayerPropsMarkets = market.childMarkets.some((childMarket) =>
        getIsPlayerPropsMarket(childMarket.typeId),
      );

      if (hasPlayerPropsMarkets) {
        // console.log(
        //   `Getting players info for Rundown sport: ${rundownSport}, ${leagueId} and game ${market.gameId}`,
        // );

        const optionsApiUrl = `https://therundown.io/api/v2/events/${convertFromBytes32(
          market.gameId,
        )}/markets?participant_type=TYPE_PLAYER&key=${process.env.RUNDOWN_API_KEY}`;

        const optionsResponse = await axios.get(optionsApiUrl);
        const optionsResponseData = optionsResponse.data;
        if (optionsResponseData !== null) {
          const optionsIds = optionsResponseData.map((options) => options.id).join(",");

          const apiUrl = `https://therundown.io/api/v2/markets/participants?market_ids=${optionsIds}&event_id=${convertFromBytes32(
            market.gameId,
          )}&key=${process.env.RUNDOWN_API_KEY}`;
          const response = await axios.get(apiUrl);
          const responseData = response.data;

          if (responseData !== null) {
            const playerPropsChildMarkets = market.childMarkets.filter((childMarket) =>
              getIsPlayerPropsMarket(childMarket.typeId),
            );
            for (let j = 0; j < playerPropsChildMarkets.length; j++) {
              const playerId = Number(playerPropsChildMarkets[j].playerProps.playerId);
              const playerInfo = responseData.participants.find(
                (playerInfo) => Number(playerInfo.participant_id) === playerId,
              );
              if (playerInfo) {
                playersInfoMap.set(`${playerId}`, {
                  playerName: playerInfo.participant_name,
                });
              } else {
                console.log(`Players info: Player with ID ${playerId} not found.`);
              }
            }
          }
        }
      }
    }
  }

  console.log(`Players info: Number of players info: ${Array.from(playersInfoMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_PLAYERS_INFO, JSON.stringify([...playersInfoMap]), function () {});
}

module.exports = {
  processPlayersInfo,
};
