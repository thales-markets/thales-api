const { initServices } = require("./services/init");
const markets = require("./source/markets");
require("dotenv").config();

markets.processMarkets();

const app = async () => {
  await initServices();

  markets.processMarkets();
};

app();
