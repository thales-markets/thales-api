const { initServices } = require("./services/init");
const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");
const gamesInfo = require("./source/gamesInfo");
const playersInfo = require("./source/playersInfo");
const resolver = require("./source/resolver");
const liveScores = require("./source/liveScores");
const cleaner = require("./source/cleaner");
const riskManagement = require("./source/riskManagement");
const streams = require("./source/streams");

require("dotenv").config();

const app = async () => {
  console.log("Initialize services...");
  await initServices();
  console.log("Initialized!");

  markets.processMarkets();
  liveMarkets.processLiveMarkets();
  gamesInfo.processGamesInfo();
  playersInfo.processPlayersInfo();
  resolver.processResolve();
  liveScores.processLiveScores();
  cleaner.processClean();
  riskManagement.processRiskManagement();
  streams.processOpticOddsResults();
};

app();
