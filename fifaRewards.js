const e = require("cors");
const fetch = require("node-fetch");

require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const { delay } = require("./services/utils");
const ethers = require("ethers");

const OP_REWARDS = 50000;
const THALES_REWARDS = 30000;

const WASH_TRADERS = {
  "0xc9fd90d23798eae0bac47e1e58cc7feffd6610b2": 4000,
  "0x4d89d373a7ec36cec559d81c3820fb22c460053f": 3000,
  "0xcbb54eda2048b57d1b0afb19a73948e9d58b6973": 3000,
  "0x0e732348f074699530df848c452d70eeaa735009": 3406,
  "0xdff6ec1ef39e55fb181303766abfa9e2ebf22feb": 1072,
  "0x30a75f5a1fa911812620eca6a8458fdf7bd984f6": 1054,
  "0xbd0bcfcac0211274b45fe8b9fb2d4e66fa448caf": 3152,
  "0x767a60f295aedd958932088f9cd6a4951d8739b6": 554,
  "0x39afe2176de832be2a5164e5fc91e27d1355c88d": 800,
  "0x9b09024e63bb18747d357f8fbb94c825a634bab8": 2000,
  "0x0014ea9bbe130c8af7f00c8e61fc07368bdaaf7d": 1000,
  "0x0d3015631c1e642e8eb35b5a0efcea24a7685603": 1000,
  "0xe1aa441644ebb251ec57f63365be55d2668f5967": 200,
  "0x1fba82814857ae752c7407bf748eecc6f9b99b49": 3200,
  "0x12cc7fac305d1ec7a4ff118277be2394671232b0": 5600,
};

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("process orders on optimism");
        await processOrders(10);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(60 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const allTx = await thalesData.sportMarkets.zebros({
    network: network,
  });

  let globalVolume = 0;
  const leaderboard = [];

  await Promise.all([
    ...allTx.map(async (zebroTx) => {
      const user = initUser(zebroTx);

      const singles = await thalesData.sportMarkets.marketTransactions({ network: network, account: zebroTx.owner });
      const parlays = await thalesData.sportMarkets.parlayMarkets({ network: network, account: zebroTx.owner });

      singles.map((singleTx) => {
        let bonusRewards = 1;
        if (singleTx.wholeMarket.tags.includes("9018")) {
          // Home Country NFT Multiplier
          if (
            singleTx.wholeMarket.homeTeam.includes(zebroTx.countryName) ||
            singleTx.wholeMarket.awayTeam.includes(zebroTx.countryName)
          ) {
            bonusRewards = bonusRewards + 0.1;
          }

          // Underdog Multiplier
          if (
            (singleTx.position === 0 && Number(ethers.utils.formatEther(singleTx.wholeMarket.homeOdds)) < 0.3) ||
            (singleTx.position === 1 && Number(ethers.utils.formatEther(singleTx.wholeMarket.awayOdds)) < 0.3) ||
            (singleTx.position === 2 && Number(ethers.utils.formatEther(singleTx.wholeMarket.drawOdds)) < 0.3)
          ) {
            bonusRewards = bonusRewards + 0.1;
          }

          user.baseVolume = user.baseVolume + singleTx.paid;
          user.bonusVolume = user.bonusVolume + singleTx.paid * (bonusRewards - 1);
          user.volume = user.volume + singleTx.paid * bonusRewards;
        }
      });

      parlays.map((parlayTx) => {
        let parlayEligible = false;
        let bonusRewardCountry = 0;
        let bonusRewardParlay = 0;
        let bonusRewardsUnderdog = 0;
        parlayTx.sportMarkets.map((market) => {
          if (market.tags.includes("9018")) {
            parlayEligible = true;

            if (market.homeTeam.includes(zebroTx.countryName) || market.awayTeam.includes(zebroTx.countryName)) {
              bonusRewardCountry = 0.1;
            }
            const index = parlayTx.sportMarketsFromContract.indexOf(market.address);
            if (index >= 0 && parlayTx.marketQuotes) {
              if (parlayTx.marketQuotes[index] < 0.3) {
                bonusRewardsUnderdog = 0.1;
              }
            }
          }
        });

        if (parlayEligible) {
          if (parlayTx.sportMarkets.length === 2) {
            bonusRewardParlay = 0.1;
          }
          if (parlayTx.sportMarkets.length === 3) {
            bonusRewardParlay = 0.15;
          }
          if (parlayTx.sportMarkets.length === 4) {
            bonusRewardParlay = 0.2;
          }
          user.baseVolume = user.baseVolume + parlayTx.sUSDPaid;
          user.bonusVolume =
            user.bonusVolume + parlayTx.sUSDPaid * (bonusRewardCountry + bonusRewardParlay + bonusRewardsUnderdog);
          user.volume =
            user.volume + parlayTx.sUSDPaid * (1 + bonusRewardCountry + bonusRewardParlay + bonusRewardsUnderdog);
        }
      });

      if (WASH_TRADERS[user.address]) {
        user.volume = user.volume - WASH_TRADERS[user.address];
      }

      globalVolume = globalVolume + user.volume;

      leaderboard.push(user);
    }),
  ]);

  const finalArray = leaderboard
    .sort((userA, userB) => userB.volume - userA.volume)
    .map((user, index) => {
      user.rank = index + 1;
      user.rewards.op = globalVolume > 0 ? (user.volume / globalVolume) * OP_REWARDS : 0;
      user.rewards.thales = globalVolume > 0 ? (user.volume / globalVolume) * THALES_REWARDS : 0;
      return user;
    });

  const result = { globalVolume, leaderboard: finalArray };
  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.ZEBRO_CAMPAIGN[network], JSON.stringify(result), function () {});
  }
}

function initUser(tx) {
  const user = {
    address: tx.owner,
    url: tx.url.replace(".json", ".png"),
    baseVolume: 0,
    bonusVolume: 0,
    volume: 0,
    rewards: { op: 0, thales: 0 },
  };
  return user;
}
