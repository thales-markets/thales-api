const markets = require("./source/markets");
const gamesInfo = require("./source/gamesInfo");
const playersInfo = require("./source/playersInfo");

require("dotenv").config();

markets.processMarkets();
gamesInfo.processGamesInfo();
playersInfo.processPlayersInfo();
