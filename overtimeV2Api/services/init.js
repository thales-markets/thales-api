const { connectDefaultRedisClient, createRedisClient } = require("../../redis/client");

let redisClientForStreamOdds;
let redisClientForStreamResults;

const initServices = async () => {
  await connectDefaultRedisClient();
  redisClientForStreamOdds = await createRedisClient();
  redisClientForStreamResults = await createRedisClient();
};

const getRedisClientForStreamOdds = () => redisClientForStreamOdds;
const getRedisClientForStreamResults = () => redisClientForStreamResults;

module.exports = {
  initServices,
  getRedisClientForStreamOdds,
  getRedisClientForStreamResults,
};
