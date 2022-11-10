const e = require("cors");
const fetch = require("node-fetch");

require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const { delay } = require("./services/utils");
const ethers = require("ethers");

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
        await delay(5 * 1000);
        console.log("process orders on optimism goerli");
        await processOrders(420);
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

      globalVolume = globalVolume + user.volume;

      leaderboard.push(user);
    }),
  ]);

  console.log(leaderboard, globalVolume);
  const result = { globalVolume, leaderboard };
  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.ZEBRO_CAMPAIGN[network], JSON.stringify(result), function () {});
  }
}

function initUser(tx) {
  const user = {
    address: tx.owner,
    baseVolume: 0,
    bonusVolume: 0,
    volume: 0,
    rewards: { op: 0, thales: 0 },
  };
  return user;
}
