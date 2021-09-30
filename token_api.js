const DODO_LP_ADDRESS = "0x031816fd297228e4fd537c1789d51509247d0b43";
const DAO_TREASURY_AMOUNT = 18000000;

const dodoLpAbi = require("./abi/dodoLp");
const circulatingSupplyList = require("./assets/circulating-supply.json");

require("dotenv").config();
const express = require("express");
const app = express();

var cors = require("cors");
app.use(cors());
app.use(express.json());

app.listen(process.env.PORT || 3003, () => {
  console.log("Server running on port " + (process.env.PORT || 3003));
});

const redis = require("redis");
const Web3 = require("web3");
const Web3Client = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));

const fetch = require("node-fetch");

let redisClient = null;

let tokenMap = new Map();

app.get("/token/price", (_, res) => res.send(tokenMap.get("price") + ""));
app.get("/token/circulatingsupply", (_, res) => res.send(tokenMap.get("circulatingsupply") + ""));
app.get("/token/marketcap", (_, res) => res.send(tokenMap.get("marketcap") + ""));

app.get("/", (_, res) => {
  res.sendStatus(200);
});

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get("tokenMap", function (err, obj) {
    tokenMapRaw = obj;
    console.log("tokenMapRaw:" + tokenMapRaw);
    if (tokenMapRaw) {
      tokenMap = new Map(JSON.parse(tokenMapRaw));
      console.log("tokenMap:" + tokenMap);
    }
  });
}

async function processToken() {
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
    redisClient.set("tokenMap", JSON.stringify([...tokenMap]), function () {});
  }
}

setTimeout(processToken, 1000 * 3);
setInterval(processToken, 1000 * 30);

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
