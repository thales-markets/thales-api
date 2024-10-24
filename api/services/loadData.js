const { redisClient } = require("../../redis/client");
const KEYS = require("./redis-keys");
require("dotenv").config();

let gameFinishersMap = new Map();
let userReffererIDsMap = new Map();
let solanaAddressesMap = new Map();

const loadData = async () => {
  if (process.env.REDIS_URL) {
    const gameFinishersMapRaw = await redisClient.get(KEYS.GAME_FINISHERS);
    if (gameFinishersMapRaw) {
      gameFinishersMap = new Map(JSON.parse(gameFinishersMapRaw));
    }

    const userReffererIDsMapRaw = await redisClient.get(KEYS.USER_REFFERER_IDS);
    if (userReffererIDsMapRaw) {
      userReffererIDsMap = new Map(JSON.parse(userReffererIDsMapRaw));
    }

    const solanaAddressesMapRaw = await redisClient.get(KEYS.SOLANA_ADDRESSES);
    if (solanaAddressesMapRaw) {
      solanaAddressesMap = new Map(JSON.parse(solanaAddressesMapRaw));
    }
  }
};

module.exports = {
  gameFinishersMap,
  userReffererIDsMap,
  solanaAddressesMap,
  loadData,
};
