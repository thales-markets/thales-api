const DODO_LP_ADDRESS = "0x031816fd297228e4fd537c1789d51509247d0b43";
const DAO_TREASURY_AMOUNT = 18000000;

const dodoLpAbi = require("./abi/dodoLp");
const circulatingSupplyList = require("./assets/circulating-supply.json");

require("dotenv").config();
const redis = require("redis");
const KEYS = require("./redis/redis-keys");
thalesData = require("thales-data");
fetch = require("node-fetch");
const Web3 = require("web3");
const Web3Client = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
const { delay } = require("./services/utils");
const tokenMap = new Map();

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("process token");
        await processToken();
      } catch (e) {
        console.log("Process Token Error: ", e);
      }
      await delay(20 * 1000);
    }
  }, 3000);
}

async function processToken() {
  try {
    const ethburned = await getEthBurned();
    tokenMap.set("ethburned", JSON.stringify(ethburned));
  } catch (e) {
    tokenMap.set("ethburned", undefined);
  }

  try {
    const price = await getPrice();
    tokenMap.set("price", price);
  } catch (e) {
    tokenMap.set("price", undefined);
  }

  try {
    const circulatingsupply = getCirculatingSupply();
    tokenMap.set("circulatingsupply", circulatingsupply);
  } catch (e) {
    tokenMap.set("circulatingsupply", undefined);
  }

  const price = tokenMap.get("price");
  const circulatingsupply = tokenMap.get("circulatingsupply");

  if (price && circulatingsupply) {
    const marketCap = price * circulatingsupply;
    tokenMap.set("marketcap", marketCap);
  } else {
    tokenMap.set("marketcap", undefined);
  }

  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.TOKEN, JSON.stringify([...tokenMap]), function () {});
  }
}

async function getPrice() {
  const contract = new Web3Client.eth.Contract(dodoLpAbi, DODO_LP_ADDRESS);
  try {
    const priceInEth = await contract.methods.getMidPrice().call();

    const gcEthResponse = await fetch("https://api.coingecko.com/api/v3/coins/ethereum");
    const gcEthResponseJson = await gcEthResponse.json();
    const ethPrice = gcEthResponseJson.market_data.current_price.usd;

    const price = (priceInEth * ethPrice) / 1e18;
    return price;
  } catch (e) {
    console.log(e);
  }
}

function getCirculatingSupply() {
  try {
    const startDate = new Date("2021-09-14");
    const todaysDate = new Date();
    var dif = Math.round(todaysDate - startDate);
    var weeks = Math.round(dif / 604800000);
    const period = weeks + 1;

    const circulatingSupply = circulatingSupplyList[period] - DAO_TREASURY_AMOUNT;
    return circulatingSupply;
  } catch (e) {
    console.log(e);
  }
}

async function getEthBurned() {
  try {
    const ethBurnedResponse = await fetch("https://ethburned.info/api/v1/burned");

    const ethBurnedJson = await ethBurnedResponse.json();
    const ethBurned = {
      total: ethBurnedJson.total,
      totalUsd: ethBurnedJson.totalUSD,
      yesterday: ethBurnedJson.yesterday,
      yesterdayUsd: ethBurnedJson.yesterdayUSD,
    };

    return ethBurned;
  } catch (e) {
    console.log(e);
  }

  return {
    total: 0,
    totalUsd: 0,
    yesterday: 0,
    yesterdayUsd: 0,
  };
}
