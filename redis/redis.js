require("dotenv").config();
const redis = require("redis");
const KEYS = require("./redis-keys");

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get(KEYS.ROPSTEN_WATCHLIST, function (err, obj) {
    const ropstenWatchlistMapRaw = obj;
    console.log("ropstenWatchlistMap:" + ropstenWatchlistMapRaw);
    if (ropstenWatchlistMapRaw) {
      ropstenWatchlistMap = new Map(JSON.parse(ropstenWatchlistMapRaw));
      console.log("ropstenWatchlistMap:" + ropstenWatchlistMap);
    }
  });

  redisClient.get(KEYS.MAINNET_WATCHLIST, function (err, obj) {
    const mainnetWatchlistMapRaw = obj;
    console.log("mainnetWatchlistMapRaw:" + mainnetWatchlistMapRaw);
    if (mainnetWatchlistMapRaw) {
      mainnetWatchlistMap = new Map(JSON.parse(mainnetWatchlistMapRaw));
      console.log("ropstenWatchlistMap:" + mainnetWatchlistMap);
    }
  });

  redisClient.get(KEYS.DISPLAY_NAME, function (err, obj) {
    const displayNameMapRaw = obj;
    console.log("displayNameMap:" + displayNameMapRaw);
    if (displayNameMapRaw) {
      displayNameMap = new Map(JSON.parse(displayNameMapRaw));
    }
  });
}