require("dotenv").config();
const redis = require("redis");
const KEYS = require("./redis-keys");

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get(KEYS.GAME_FINISHERS, function (err, obj) {
    const gameFinishersMapRaw = obj;
    console.log("gameFinishersMap:" + gameFinishersMapRaw);
    if (gameFinishersMapRaw) {
      gameFinishersMap = new Map(JSON.parse(gameFinishersMapRaw));
    }
  });

  redisClient.get(KEYS.USER_REFFERER_IDS, function (err, obj) {
    const userReffererIDsMapRaw = obj;
    console.log("userReffererIDsMapRaw:" + userReffererIDsMapRaw);
    if (userReffererIDsMapRaw) {
      userReffererIDsMap = new Map(JSON.parse(userReffererIDsMapRaw));
    }
  });
}
