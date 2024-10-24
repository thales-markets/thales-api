const { connectDefaultRedisClient, createRedisClient } = require("../../redis/client");

let redisClientForStreamOdds;
let redisClientForStreamResults;

const initServices = async () => {
  await connectDefaultRedisClient();
  redisClientForStreamOdds = await createRedisClient();
  redisClientForStreamResults = await createRedisClient();
};

module.exports = {
  initServices,
  redisClientForStreamOdds,
  redisClientForStreamResults,
};
