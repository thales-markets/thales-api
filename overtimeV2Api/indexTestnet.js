const { initServices } = require("./services/init");
const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");
const riskManagement = require("./source/riskManagement");
const streams = require("./source/streams");

require("dotenv").config();

const app = async () => {
  console.log("Initialize testnet services...");
  await initServices();
  console.log("Initialized testnet!");

  markets.processMarkets();
  liveMarkets.processLiveMarkets();
  riskManagement.processRiskManagement();
  streams.processOpticOddsResults();
};

app();
