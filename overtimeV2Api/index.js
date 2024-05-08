const markets = require("./source/markets");
const gamesInfo = require("./source/gamesInfo");

require("dotenv").config();

markets.processMarkets();
gamesInfo.processGamesInfo();
