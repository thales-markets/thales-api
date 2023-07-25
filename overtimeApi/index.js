const sports = require("./source/sports");
const markets = require("./source/markets");

require("dotenv").config();

sports.processSports();
markets.processMarkets();
