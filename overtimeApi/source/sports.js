require("dotenv").config();

const redis = require("redis");
const overtimeSportsList = require("../assets/overtime-sports.json");
const KEYS = require("../../redis/redis-keys");
const { NETWORK } = require("../constants/networks");
const { delay } = require("../utils/general");

async function processSports() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          console.log("process sports on optimism");
          await processSportsPerNetwork(NETWORK.Optimism);
        } catch (error) {
          console.log("sports on optimism error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process sports on arbitrum");
          await processSportsPerNetwork(NETWORK.Arbitrum);
        } catch (error) {
          console.log("sports on arbitrum error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process sports on op goerli");
          await processSportsPerNetwork(NETWORK.OptimismGoerli);
        } catch (error) {
          console.log("sports on op goerli error: ", error);
        }

        await delay(60 * 60 * 1000);
      }
    }, 3000);
  }
}

async function processSportsPerNetwork(network) {
  const overtimeSports = overtimeSportsList;
  redisClient.set(KEYS.OVERTIME_SPORTS[network], JSON.stringify(overtimeSports), function () {});
}

module.exports = {
  processSports,
};
