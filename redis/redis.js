const { redisClient } = require("./client");
// eslint-disable-next-line no-unused-vars
let { gameFinishersMap, userReffererIDsMap, solanaAddressesMap } = require("./maps");
require("dotenv").config();
const KEYS = require("./redis-keys");

if (process.env.REDIS_URL) {
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get(KEYS.GAME_FINISHERS, function (err, obj) {
    const gameFinishersMapRaw = obj;
    if (gameFinishersMapRaw) {
      gameFinishersMap = new Map(JSON.parse(gameFinishersMapRaw));
    }
  });

  redisClient.get(KEYS.USER_REFFERER_IDS, function (err, obj) {
    const userReffererIDsMapRaw = obj;
    if (userReffererIDsMapRaw) {
      userReffererIDsMap = new Map(JSON.parse(userReffererIDsMapRaw));
    }
  });

  redisClient.get(KEYS.SOLANA_ADDRESSES, function (err, obj) {
    const solanaAddressesMapRaw = obj;
    if (solanaAddressesMapRaw) {
      solanaAddressesMap = new Map(JSON.parse(solanaAddressesMapRaw));
    }
  });
}
