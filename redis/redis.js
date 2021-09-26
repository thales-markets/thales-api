require("dotenv").config();
const redis = require("redis");
const KEYS = require("./redis-keys");

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get(KEYS.MAINNET_ORDERS, function (err, obj) {
    const mainnetOptionsMapRaw = obj;
    console.log("mainnetOptionsMapRaw:" + mainnetOptionsMapRaw);
    if (mainnetOptionsMapRaw) {
      mainnetOptionsMap = new Map(JSON.parse(mainnetOptionsMapRaw));
      console.log("mainnetOptionsMap:" + mainnetOptionsMap);
    }
  });

  redisClient.get(KEYS.ROPSTEN_ORDERS, function (err, obj) {
    const ropstenOptionsMapRaw = obj;
    console.log("ropstenOptionsMapRaw:" + ropstenOptionsMapRaw);
    if (ropstenOptionsMapRaw) {
      ropstenOptionsMap = new Map(JSON.parse(ropstenOptionsMapRaw));
      console.log("ropstenOptionsMap:" + ropstenOptionsMap);
    }
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

  redisClient.get(KEYS.MAINNET_LEADERBOARD, function (err, obj) {
    const mainnetLeaderboardMapRaw = obj;
    console.log("mainnetLeaderboardMap:" + mainnetLeaderboardMapRaw);
    if (mainnetLeaderboardMapRaw) {
      leaderboardMainnetMap = new Map(JSON.parse(mainnetLeaderboardMapRaw));
    }
  });

  redisClient.get(KEYS.ROPSTEN_LEADERBOARD, function (err, obj) {
    const ropstenLeaderboardMapRaw = obj;
    console.log("ropstenLeaderboardMap:" + ropstenLeaderboardMapRaw);
    if (ropstenLeaderboardMapRaw) {
      leaderboardRopstenMap = new Map(JSON.parse(ropstenLeaderboardMapRaw));
    }
  });

  redisClient.get(KEYS.DISPLAY_NAME, function (err, obj) {
    const displayNameMapRaw = obj;
    console.log("displayNameMap:" + displayNameMapRaw);
    if (displayNameMapRaw) {
      displayNameMap = new Map(JSON.parse(displayNameMapRaw));
    }
  });

  redisClient.get(KEYS.TOKEN, function (err, obj) {
    const tokenMapRaw = obj;
    console.log("tokenMap:" + tokenMapRaw);
    if (tokenMapRaw) {
      tokenMap = new Object(JSON.parse(tokenMapRaw));
    }
  });
}
