const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const KEYS = require("../../redis/redis-keys");
const { isPlayerPropsMarket, convertFromBytes32 } = require("../utils/markets");
const { NETWORK } = require("../constants/networks");
const { getLeagueProvider } = require("../utils/sports");
const { Provider, League } = require("../constants/sports");

async function processPlayersInfo() {
  if (process.env.REDIS_URL) {
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

function getOpenMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], function (err, obj) {
      const openMarketsMap = new Map(JSON.parse(obj));
      resolve(openMarketsMap);
    });
  });
}

async function processAllPlayersInfo() {
  const playersInfoMap = await getPlayersInfoMap();
  // TODO: take from OP and OP Sepolia for now
  const openMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);
  const openSepoliaMarketsMap = await getOpenMarketsMap(NETWORK.OptimismSepolia);

  const allOpenMarketsMap = [...Array.from(openMarketsMap.values()), ...Array.from(openSepoliaMarketsMap.values())];

  for (let i = 0; i < allOpenMarketsMap.length; i++) {
    const market = allOpenMarketsMap[i];
    const leagueId = market.leagueId;
    const leagueProvider = getLeagueProvider(leagueId);

    if (leagueProvider === Provider.RUNDOWN) {
      const hasPlayerPropsMarkets = market.childMarkets.some((childMarket) => childMarket.isPlayerPropsMarket);

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
              isPlayerPropsMarket(childMarket.typeId),
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

    if (leagueProvider === Provider.OPTICODDS || leagueId === League.MLB) {
      const playerPropsMarkets = market.childMarkets.filter((childMarket) => childMarket.isPlayerPropsMarket);

      playerPropsMarkets.forEach((market) => {
        playersInfoMap.set(`${market.playerProps.playerId}`, {
          playerName: market.playerProps.playerName,
        });
      });
    }
  }

  console.log(`Players info: Number of players info: ${Array.from(playersInfoMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_PLAYERS_INFO, JSON.stringify([...playersInfoMap]), function () {});
}

module.exports = {
  processPlayersInfo,
};
