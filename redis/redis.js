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
    console.log("ropstenWatchlistMapRaw:" + ropstenWatchlistMapRaw);
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
      console.log("mainnetWatchlistMapRaw:" + mainnetWatchlistMap);
    }
  });

  redisClient.get(KEYS.DISPLAY_NAME, function (err, obj) {
    const displayNameMapRaw = obj;
    console.log("displayNameMap:" + displayNameMapRaw);
    if (displayNameMapRaw) {
      displayNameMap = new Map(JSON.parse(displayNameMapRaw));
    }
  });

  redisClient.get(KEYS.DISCORD_USERS, function (err, obj) {
    discordData = new Map(JSON.parse(obj));
    migrateUsers(discordData);
    // this shoud be moved outside the block after migration --------- //
    redisClient.get(KEYS.ROYALE_USERS, function (err, obj) {
      const royaleUsersDataRaw = obj;
      console.log("royaleUsers:" + royaleUsersDataRaw);
      if (royaleUsersDataRaw) {
        royaleUsersDataMap = new Map(JSON.parse(royaleUsersDataRaw));
      }
    });
    // this shoud be moved outside the block after migration --------- //
  });

  redisClient.get(KEYS.GAME_FINISHERS, function (err, obj) {
    const gameFinishersMapRaw = obj;
    console.log("gameFinishersMap:" + gameFinishersMapRaw);
    if (gameFinishersMapRaw) {
      gameFinishersMap = new Map(JSON.parse(gameFinishersMapRaw));
    }
  });
}

const migrateUsers = (discordUsers) => {
  const newMap = new Map();
  console.log("hello: ", discordUsers);
  discordUsers.forEach(function (value, key) {
    console.log(key + " = " + value);
    newMap.set(key, { name: value.name, avatar: value.avatar });
  });
  redisClient.set(KEYS.ROYALE_USERS, JSON.stringify([...newMap]), function () {});
};
