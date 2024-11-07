const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
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

async function getOpenMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
  const openMarkets = new Map(JSON.parse(obj));
  return openMarkets;
}

async function processAllPlayersInfo(isTestnet) {
  const playersInfoMap = await getPlayersInfoMap(isTestnet);
  const openMarketsMap = await getOpenMarketsMap(isTestnet ? NETWORK.OptimismSepolia : NETWORK.Optimism);

  const allOpenMarkets = Array.from(openMarketsMap.values());

  for (let i = 0; i < allOpenMarkets.length; i++) {
    const market = allOpenMarkets[i];
    const leagueId = market.leagueId;
    const leagueProvider = getLeagueProvider(leagueId);

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
