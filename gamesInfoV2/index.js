const { initServices } = require("./services/init");
const gamesInfo = require("./source/gamesInfoV2");

require("dotenv").config();

const app = async () => {
  console.log("Initialize services...");
  await initServices();
  console.log("Initialized!");

  gamesInfo.processGamesInfo();
};

app();
