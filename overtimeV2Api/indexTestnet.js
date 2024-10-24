const { initServices } = require("./services/init");
const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");

require("dotenv").config();

const app = async () => {
  await initServices();

  markets.processMarkets();
  liveMarkets.processLiveMarkets();
};

app();
