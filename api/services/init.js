const { connectDefaultRedisClient, createRedisClientsPool } = require("../../redis/client");
const { initializeSportsAMMLPListener, initializeParlayAMMLPListener, initializeThalesAMMLPListener } = require("./contractEventListener");
const { loadData } = require("./loadData");
const { startCachingOpenMarkets, startCachingClosedMarkets } = require("./overtimeMarketsCache");

const initServices = async () => {
  await connectDefaultRedisClient();
  await createRedisClientsPool();
  await loadData();
  await startCachingOpenMarkets();
  await startCachingClosedMarkets();

  // Contract listeners
  initializeSportsAMMLPListener();
  initializeParlayAMMLPListener();
  initializeThalesAMMLPListener();
};

module.exports = {
  initServices,
};
