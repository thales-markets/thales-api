const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const KEYS = require("../../redis/redis-keys");
const { isPlayerPropsMarket, convertFromBytes32 } = require("../utils/markets");
const { NETWORK } = require("../constants/networks");
const { getLeagueProvider, Provider } = require("overtime-live-trading-utils");

async function processPlayersInfo() {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";

    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Players info: process players info");

          await processAllPlayersInfo(isTestnet);

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

async function getPlayersInfoMap(isTestnet) {
  const key = isTestnet ? KEYS.OVERTIME_V2_PLAYERS_INFO_TESTNET : KEYS.OVERTIME_V2_PLAYERS_INFO;
  const obj = await redisClient.get(key);
  const playersInfoMap = new Map(JSON.parse(obj));
  return playersInfoMap;
}

async function getGamesInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
}

async function getOpenMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
  const openMarkets = new Map(JSON.parse(obj));
  return openMarkets;
}

async function processAllPlayersInfo(isTestnet) {
  const playersInfoMap = await getPlayersInfoMap(isTestnet);
  const gamesInfoMap = await getGamesInfoMap();
  const openMarketsMap = await getOpenMarketsMap(isTestnet ? NETWORK.OptimismSepolia : NETWORK.Optimism);

  const allOpenMarkets = Array.from(openMarketsMap.values());

  for (let i = 0; i < allOpenMarkets.length; i++) {
    const market = allOpenMarkets[i];
    const leagueId = market.leagueId;
    const leagueProvider = getLeagueProvider(leagueId);
    const gameInfo = gamesInfoMap.get(market.gameId);

    if (leagueProvider === Provider.RUNDOWN && gameInfo && gameInfo.provider === Provider.RUNDOWN) {
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

    if (leagueProvider === Provider.OPTICODDS) {
      const playerPropsMarkets = market.childMarkets.filter((childMarket) => childMarket.isPlayerPropsMarket);

      playerPropsMarkets.forEach((market) => {
        playersInfoMap.set(`${market.playerProps.playerId}`, {
          playerName: market.playerProps.playerName,
        });
      });
    }
  }

  console.log(`Players info: Number of players info: ${Array.from(playersInfoMap.values()).length}`);
  const key = isTestnet ? KEYS.OVERTIME_V2_PLAYERS_INFO_TESTNET : KEYS.OVERTIME_V2_PLAYERS_INFO;
  redisClient.set(key, JSON.stringify([...playersInfoMap]));
}

module.exports = {
  processPlayersInfo,
};
