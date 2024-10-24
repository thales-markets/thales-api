const { connectDefaultRedisClient, createRedisClientsPool } = require("../../redis/client");
const { loadData } = require("./loadData");
const { startCachingOpenMarkets, startCachingClosedMarkets } = require("./overtimeMarketsCache");

const initServices = async () => {
  await connectDefaultRedisClient();
  await createRedisClientsPool();
  await loadData();
  await startCachingOpenMarkets();
  await startCachingClosedMarkets();
};

module.exports = {
  initServices,
};
