const markets = require("./source/markets");
const teamNames = require("./source/teamNames");

require("dotenv").config();

markets.processMarkets();
teamNames.processTeamNames();
