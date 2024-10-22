const { redisClient } = require("./client");
require("dotenv").config();
const KEYS = require("./redis-keys");

// eslint-disable-next-line prefer-const
gameFinishersMap = new Map();
// eslint-disable-next-line prefer-const
userReffererIDsMap = new Map();
// eslint-disable-next-line prefer-const
solanaAddressesMap = new Map();

(async () => {
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
})();
