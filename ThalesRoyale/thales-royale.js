require("dotenv").config();

const REDIS_URL = process.env.REDIS_URL;
const ethNetwork = process.env.INFURA_URL;
const SENDER = process.env.SENDER;
const SIGN = process.env.SIGN;
const AMOUNT = process.env.AMOUNT;

const axios = require("axios");
const redis = require("redis");
const KEYS = require("../redis/redis-keys");
const { delay } = require("../services/utils");

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(ethNetwork));

let verifiedAddresses = new Set();
let verifiedDiscordIds = new Set();
let discordData = new Map();
let faucetConsumers = new Set();

const initRedisAndPopulateData = () => {
  if (REDIS_URL) {
    redisClient = redis.createClient(REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });

    redisClient.get(KEYS.VERIFIED_ADDRESSES_DISCORD, function (err, obj) {
      verifiedAddresses = new Set(JSON.parse(obj));
      console.log("verified users: ", verifiedAddresses);
    });

    redisClient.get(KEYS.DISCORD_IDS, function (err, obj) {
      verifiedDiscordIds = new Set(JSON.parse(obj));
      console.log("verified discord ids: ", verifiedDiscordIds);
    });

    redisClient.get(KEYS.DISCORD_USERS, function (err, obj) {
      discordData = new Map(JSON.parse(obj));
      console.log("discordData: ", discordData);
    });

    redisClient.get(KEYS.FAUCET_CONSUMERS, function (err, obj) {
      faucetConsumers = new Set(JSON.parse(obj));
      console.log("verified discord ids: ", faucetConsumers);
    });
  }
};

initRedisAndPopulateData();

setTimeout(async () => {
  while (true) {
    try {
      console.log("Verify Accounts");
      await verifyUsers();
    } catch (e) {
      console.log("Verify Accounts Error: ", e);
    }
    await delay(5 * 1000);
  }
}, 5000);

const verifyUsers = async () => {
  const data = (await axios.get("http://ec2-13-51-176-251.eu-north-1.compute.amazonaws.com:3002/verified")).data;
  const arrPromises = [];
  let hasNewData = false;
  let nonce = await web3.eth.getTransactionCount(SENDER);
  for (const [key, value] of Object.entries(data)) {
    if (!verifiedDiscordIds.has(value.id) && !verifiedAddresses.has(key)) {
      console.log("New User verified");
      verifiedAddresses.add(key);
      verifiedDiscordIds.add(value.id);
      discordData.set(key.toLowerCase(), value);
      hasNewData = true;
      arrPromises.push(transferFund(key, nonce));
      nonce = nonce + 1;
    }
  }

  if (hasNewData) {
    try {
      await Promise.all(arrPromises);
      console.log("Funds transfered");
    } catch (e) {
      console.log(e);
    }

    if (REDIS_URL) {
      const addresses = Array.from(verifiedAddresses);
      redisClient.set(KEYS.VERIFIED_ADDRESSES_DISCORD, JSON.stringify(addresses));
      const discordIDs = Array.from(verifiedDiscordIds);
      redisClient.set(KEYS.DISCORD_IDS, JSON.stringify(discordIDs));
      redisClient.set(KEYS.DISCORD_USERS, JSON.stringify([...discordData]), function () {});
    }
  }
};

async function transferFund(reciever, nonce) {
  console.log("lets execute this");
  return new Promise(async (resolve, reject) => {
    if (faucetConsumers.has(reciever)) {
      reject("You already claimed from this faucet");
    } else {
      faucetConsumers.add(reciever);

      let tx = {
        from: SENDER,
        to: reciever,
        gas: 60000,
        value: Web3.utils.toWei(AMOUNT),
        nonce: nonce,
      };

      const signPromise = web3.eth.accounts.signTransaction(tx, SIGN);

      signPromise
        .then((signedTx) => {
          web3.eth
            .sendSignedTransaction(signedTx.raw || signedTx.rawTransaction)
            .then((data) => {
              if (faucetConsumers.size > 0) {
                const consumers = Array.from(faucetConsumers);
                redisClient.set(KEYS.FAUCET_CONSUMERS, JSON.stringify(consumers));
              }
              const url = `https://kovan-optimistic.etherscan.io/tx/${data.transactionHash}`;
              resolve(url);
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
}
