const { initServices } = require("./services/init");
const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");

require("dotenv").config();

const app = async () => {
  console.log("Initialize testnet services...");
  await initServices();
  console.log("Initialized testnet!");

  markets.processMarkets();
  liveMarkets.processLiveMarkets();
};

app();
