const redis = require("redis");

// Default redis client
const redisClient = redis
  .createClient({ url: process.env.REDIS_URL })
  .on("error", (err) => console.log("Redis Client Error", err));

const connectDefaultRedisClient = async () => await redisClient.connect();

const createRedisClient = async () => {
  const client = redis
    .createClient({ url: process.env.REDIS_URL })
    .on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  return client;
};

const REDIS_CONNECTIONS_COUNT = process.env.REDIS_CONNECTIONS_COUNT || 10;
const redisClientsPool = [];

// Create redis clients pool
const createRedisClientsPool = async () => {
  for (let index = 0; index < REDIS_CONNECTIONS_COUNT; index++) {
    const redisClientLocal = redis.createClient({ url: process.env.REDIS_URL });
    redisClientLocal.on("error", (err) => console.log("Redis Client Error", err));
    await redisClientLocal.connect();
    redisClientsPool.push(redisClientLocal);
  }
};

// Return random redis client from array
const getRandomRedisClient = () => {
  const index = Math.floor(Math.random() * redisClientsPool.length);
  let randomClient = redisClientsPool[index];
  if (!randomClient) {
    randomClient = redisClientsPool.find((client) => !client);
  }
  return randomClient || redisClient;
};

module.exports = {
  redisClient,
  redisClientsPool,
  connectDefaultRedisClient,
  createRedisClient,
  createRedisClientsPool,
  getRandomRedisClient,
};
