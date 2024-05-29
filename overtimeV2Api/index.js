const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");
const gamesInfo = require("./source/gamesInfo");
const playersInfo = require("./source/playersInfo");
const resolver = require("./source/resolver");

require("dotenv").config();

markets.processMarkets();
liveMarkets.processLiveMarkets();
gamesInfo.processGamesInfo();
playersInfo.processPlayersInfo();
resolver.processResolve();
