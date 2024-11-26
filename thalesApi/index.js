const { initServices } = require("./services/init");
const markets = require("./source/markets");
require("dotenv").config();

const app = async () => {
  console.log("Initialize services...");
  await initServices();
  console.log("Initialized!");

  console.log("Start processing...");
  markets.processMarkets();
};

app();
