const THALES_L1_ADDRESS = "0x8947da500eb47f82df21143d0c01a29862a8c3c5";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const MAX_SUPPLY = 100000000;
const circulatingSupplyList = require("./assets/circulating-supply.json");
const erc20Contract = require("./abi/erc20Contract.js");

require("dotenv").config();
const express = require("express");
const app = express();

const cors = require("cors");
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
app.get("/token/totalsupply", (_, res) => res.send(tokenMap.get("totalsupply") + ""));

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
    const tokenMapRaw = obj;
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
  } catch {
    tokenMap.set("price", undefined);
  }

  try {
    const circulatingsupply = getCirculatingSupply();
    tokenMap.set("circulatingsupply", circulatingsupply);
  } catch {
    tokenMap.set("circulatingsupply", undefined);
  }

  try {
    const totalsupply = await getTotalSupply();
    tokenMap.set("totalsupply", totalsupply);
  } catch {
    tokenMap.set("totalsupply", undefined);
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
  try {
    const gcThalesResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=thales&vs_currencies=usd");
    const gcThalesResponseJson = await gcThalesResponse.json();
    const price = gcThalesResponseJson.thales.usd;

    return price;
  } catch (e) {
    console.log(e);
  }
}

function getCirculatingSupply() {
  try {
    const startDate = new Date("2021-09-14");
    const todaysDate = new Date();
    const dif = Math.round(todaysDate - startDate);
    const weeks = Math.round(dif / 604800000);
    const period = weeks + 1;

    return circulatingSupplyList[period];
  } catch (e) {
    console.log(e);
  }
}

async function getTotalSupply() {
  try {
    const contract = new Web3Client.eth.Contract(erc20Contract, THALES_L1_ADDRESS);
    const result = await contract.methods.balanceOf(BURN_ADDRESS).call();
    const burnedAmount = Web3Client.utils.fromWei(result);
    return MAX_SUPPLY - burnedAmount;
  } catch (e) {
    console.log(e);
  }
}
