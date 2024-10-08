const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");
const gamesInfo = require("./source/gamesInfo");
const playersInfo = require("./source/playersInfo");
const resolver = require("./source/resolver");
const liveScores = require("./source/liveScores");
const cleaner = require("./source/cleaner");

require("dotenv").config();

markets.processMarkets();
liveMarkets.processLiveMarkets();
gamesInfo.processGamesInfo();
playersInfo.processPlayersInfo();
resolver.processResolve();
liveScores.processLiveScores();
cleaner.processClean();
