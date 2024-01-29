const markets = require("./source/markets");

require("dotenv").config();

markets.processMarketsPerNetwork(10);
