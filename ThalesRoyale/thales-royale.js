require("dotenv").config();

const REDIS_URL = process.env.REDIS_URL;
const redis = require("redis");
const KEYS = require("../redis/redis-keys");

let verifiedAddresses = new Set();
let discordData = new Map();

const initRedisAndPopulateData = () => {
  if (REDIS_URL) {
    redisClient = redis.createClient(REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });

    redisClient.get(KEYS.VERIFIED_ADDRESSES_DISCORD, function (err, obj) {
      verifiedAddresses = new Set(JSON.parse(obj));
      console.log("verified users: ", verifiedAddresses);
    });

    redisClient.get(KEYS.DISCORD_USERS, function (err, obj) {
      discordData = new Map(JSON.parse(obj));
      console.log("discordData: ", discordData);
    });
  }
};

initRedisAndPopulateData();
