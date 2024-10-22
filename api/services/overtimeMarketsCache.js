const redis = require("redis");
const KEYS = require("../../redis/redis-keys");
const { delay } = require("../../services/utils");
const { SUPPORTED_NETWORKS } = require("../constants/networks");
const { redisClient } = require("../../redis/client");
require("dotenv").config();

const REDIS_CONNECTIONS_COUNT = process.env.REDIS_CONNECTIONS_COUNT || 10;
const REDIS_OPEN_MARKETS_CACHE_INTERVAL = Number(process.env.REDIS_OVERTIME_OPEN_MARKETS_CACHE_INTERVAL);
const REDIS_CLOSED_MARKETS_CACHE_INTERVAL = Number(process.env.REDIS_OVERTIME_CLOSED_MARKETS_CACHE_INTERVAL);

const redisClientsForMarkets = [];
let cachedOpenMarketsByNetworkMap = new Map();
let cachedClosedMarketsByNetworkMap = new Map();

// Create redis clients pool
(async () => {
  for (let index = 0; index < REDIS_CONNECTIONS_COUNT; index++) {
    const redisClientLocal = redis.createClient({ url: process.env.REDIS_URL });
    redisClientLocal.on("error", (err) => console.log("Redis Client Error", err));
    await redisClientLocal.connect();
    redisClientsForMarkets.push(redisClientLocal);
  }
})();

// Return random redis client fron array
const choseRedisClient = () => {
  const index = Math.floor(Math.random() * redisClientsForMarkets.length);
  let randomClient = redisClientsForMarkets[index];
  if (!randomClient) {
    randomClient = redisClientsForMarkets.find((client) => !client);
  }
  return randomClient || redisClient;
};

// Cache open markets for all networks
const cacheOpenMarkets = async () => {
  for (let i = 0; i < SUPPORTED_NETWORKS.length; i++) {
    const network = SUPPORTED_NETWORKS[i];
    const openMarkets = await choseRedisClient().get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
    const openMarketsMap = new Map(JSON.parse(openMarkets));
    cachedOpenMarketsByNetworkMap.set(network, openMarketsMap);
  }
};

// Cache closed markets for all networks
const cacheClosedMarkets = async () => {
  for (let i = 0; i < SUPPORTED_NETWORKS.length; i++) {
    const network = SUPPORTED_NETWORKS[i];
    const closedMarkets = await choseRedisClient().get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network]);
    const closedMarketsMap = new Map(JSON.parse(closedMarkets));
    cachedClosedMarketsByNetworkMap.set(network, closedMarketsMap);
  }
};

// Start caching open markets
(async () => {
  console.log("Caching open markets: Started...");

  setTimeout(async () => {
    while (true) {
      try {
        const startTime = new Date().getTime();

        await cacheOpenMarkets();

        const duration = new Date().getTime() - startTime;
        // log only long redis reads
        if (duration > process.env.REDIS_CACHING_MIN_DURATION_LOG) {
          console.log(`Caching open markets: Finished in: ${duration}ms`);
        }
      } catch (error) {
        console.log(`Caching open markets error: ${error}`);
      }

      await delay(REDIS_OPEN_MARKETS_CACHE_INTERVAL);
    }
  }, 3000);
})();

// Start caching closed markets
(async () => {
  console.log("Caching closed markets: Started...");

  setTimeout(async () => {
    while (true) {
      try {
        const startTime = new Date().getTime();

        await cacheClosedMarkets();

        const duration = new Date().getTime() - startTime;
        // log only long redis reads
        if (duration > process.env.REDIS_CACHING_MIN_DURATION_LOG) {
          console.log(`Caching closed markets: Finished in: ${duration}ms`);
        }
      } catch (error) {
        console.log(`Caching closed markets error: ${error}`);
      }

      await delay(REDIS_CLOSED_MARKETS_CACHE_INTERVAL);
    }
  }, 3000);
})();

const getCachedOpenMarketsByNetworkMap = (network) => cachedOpenMarketsByNetworkMap.get(Number(network));
const getCachedClosedMarketsByNetworkMap = (network) => cachedClosedMarketsByNetworkMap.get(Number(network));

module.exports = {
  getCachedOpenMarketsByNetworkMap,
  getCachedClosedMarketsByNetworkMap,
};
