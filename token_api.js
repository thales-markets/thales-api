const DAO_TREASURY_AMOUNT = 18000000;
const circulatingSupplyList = require("./assets/circulating-supply.json");

require("dotenv").config();
const express = require("express");
const sigUtil = require("eth-sig-util");
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
let stakingMigrationOptOutMap = new Map();
let stakingMigrationOptOutTestnetMap = new Map();

app.get("/token/price", (_, res) => res.send(tokenMap.get("price") + ""));
app.get("/token/circulatingsupply", (_, res) => res.send(tokenMap.get("circulatingsupply") + ""));
app.get("/token/marketcap", (_, res) => res.send(tokenMap.get("marketcap") + ""));
app.get("/token/ethburned", (_, res) => res.send(JSON.parse(tokenMap.get("ethburned"))));

app.get("/token/staking-migration/opt-out/:networkId", (req, res) => {
  const networkId = Number(req.params.networkId);
  const optOutWallet = [];
  const optOutMap = networkId === 1 ? stakingMigrationOptOutMap : stakingMigrationOptOutTestnetMap;
  optOutMap.forEach((value, key) => {
    if (value === true) {
      optOutWallet.push(key);
    }
  });
  res.send(optOutWallet);
});

app.get("/token/staking-migration/opt-out/:networkId/:walletAddress", (req, res) => {
  const networkId = Number(req.params.networkId);
  const walletAddress = req.params.walletAddress;
  const optOutMap = networkId === 1 ? stakingMigrationOptOutMap : stakingMigrationOptOutTestnetMap;
  res.send({
    optOut: optOutMap.get(walletAddress.toLowerCase()),
  });
});

app.post("/token/staking-migration/opt-out", (req, res) => {
  const networkId = Number(req.body.networkId);
  const walletAddress = req.body.walletAddress;
  const optOut = req.body.optOut;
  const signature = req.body.signature;

  const signData = JSON.stringify({
    optOut,
    networkId,
  });
  const recovered = sigUtil.recoverPersonalSignature({
    data: signData,
    sig: signature,
  });

  if (recovered.toLowerCase() === walletAddress.toLowerCase()) {
    const optOutMap = networkId === 1 ? stakingMigrationOptOutMap : stakingMigrationOptOutTestnetMap;
    optOutMap.set(walletAddress.toLowerCase(), optOut);
    redisClient.set(
      networkId === 1 ? "stakingMigrationOptOutMap" : "stakingMigrationOptOutTestnetMap",
      JSON.stringify([...optOutMap]),
      function () {},
    );
    res.send({ optOut: optOutMap.get(walletAddress.toLowerCase()) });
  }
});

app.get("/", (_, res) => {
  res.sendStatus(200);
});

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get("stakingMigrationOptOutMap", function (err, obj) {
    const stakingMigrationOptOutMapRaw = obj;
    console.log("stakingMigrationOptOutMapRaw:" + stakingMigrationOptOutMapRaw);
    if (stakingMigrationOptOutMapRaw) {
      stakingMigrationOptOutMap = new Map(JSON.parse(stakingMigrationOptOutMapRaw));
      console.log("stakingMigrationOptOutMap:" + stakingMigrationOptOutMap);
    }
  });

  redisClient.get("stakingMigrationOptOutTestnetMap", function (err, obj) {
    const stakingMigrationOptOutTestnetMapRaw = obj;
    console.log("stakingMigrationOptOutTestnetMapRaw:" + stakingMigrationOptOutTestnetMapRaw);
    if (stakingMigrationOptOutTestnetMapRaw) {
      stakingMigrationOptOutTestnetMap = new Map(JSON.parse(stakingMigrationOptOutTestnetMapRaw));
      console.log("stakingMigrationOptOutTestnetMap:" + stakingMigrationOptOutTestnetMap);
    }
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
