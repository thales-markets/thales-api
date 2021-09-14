redisClient = null;

mainnetOptionsMap = new Map();
ropstenOptionsMap = new Map();
mainnetWatchlistMap = new Map();
ropstenWatchlistMap = new Map();
leaderboardMainnetMap = new Map();
leaderboardRopstenMap = new Map();
displayNameMap = new Map();
verifiedUsers = new Set();
verifiedTwitterIds = new Set();

require("dotenv").config();

require("./api/controller");
require("./redis/redis");

thalesData = require("thales-data");

const Web3 = require("web3");
Web3Client = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));

fetch = require("node-fetch");

const processLeaderboard = require("./services/leaderboard");
const processOrders = require("./services/orders");
const { verifyAccounts } = require("./services/twitter");

setInterval(processMainnetMarkets, 1000 * 30);
setInterval(processRopstenMarkets, 1000 * 30);

async function processMainnetMarkets() {
  await verifyAccounts();
  const mainnetOptionsMarkets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network: 1,
  });
  processLeaderboard(mainnetOptionsMarkets, 1);
  processOrders(mainnetOptionsMarkets, 1);
}

async function processRopstenMarkets() {
  const ropstenOptionsMarkets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network: 3,
  });
  processLeaderboard(ropstenOptionsMarkets, 3);
  processOrders(ropstenOptionsMarkets, 3);
}
