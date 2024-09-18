const markets = require("./source/markets");
const liveMarkets = require("./source/liveMarkets");

require("dotenv").config();

markets.processMarkets();
liveMarkets.processLiveMarkets();
