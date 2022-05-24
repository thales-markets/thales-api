require("dotenv").config();
const redis = require("redis");
const ethers = require("ethers");

fetch = require("node-fetch");
const { delay } = require("../services/utils");
const KEYS = require("../redis/redis-keys");
const ammContract = require("../contracts/amm");
const thalesData = require("thales-data");

const START_DATE = new Date(Date.UTC(2022, 3, 18, 13));
const END_DATE = new Date(Date.UTC(2022, 4, 9, 15));

const LEIFU_ADDRESS = "0x5027ce356c375a934b4d1de9240ba789072a5af1";

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      await processLeaderboard(137);
      await delay(60 * 1000);

      // await processLeaderboard(10);
      // await delay(10 * 1000);

      // await processLeaderboard(69);
      // await delay(10 * 1000);

      // await processLeaderboard(80001);
      // await delay(60 * 1000);
    }
  }, 3000);
}

const processLeaderboard = async (networkId) => {
  const map = new Map();
  console.log("Network id: ", networkId);

  try {
    const markets = await thalesData.binaryOptions.markets({
      network: networkId,
    });

    console.log("Processing Markets...: ", markets.length);

    const eligibleMarketsSet = new Set();
    const eligibleMarketsArray = [];

    markets.map((market) => {
      if (new Date(market.timestamp) <= new Date(Date.UTC(2022, 4, 9, 15))) {
        eligibleMarketsSet.add(market.address.toLowerCase());
        eligibleMarketsArray.push(market);
      }
    });

    console.log("eligible markets: ", eligibleMarketsSet);

    for (let market of eligibleMarketsArray) {
      await delay(100);
      const [marketTxs, trades] = await Promise.all([
        thalesData.binaryOptions.optionTransactions({
          network: networkId,
          market: market.address,
        }),
        thalesData.binaryOptions.trades({
          network: networkId,
          market: market.address,
        }),
      ]);

      try {
        marketTxs.map((tx) => {
          if (
            tx.account.toLowerCase() !== ammContract.addresses[networkId].toLowerCase() &&
            tx.account.toLowerCase() !== LEIFU_ADDRESS.toLowerCase()
          ) {
            let [profit, volume, trades, gain, investment] = [0, 0, 0, 0, 0];
            if (map.has(tx.account)) {
              const user = map.get(tx.account.toLowerCase());
              [profit, volume, trades, gain, investment] = [
                user.profit,
                user.volume,
                user.trades,
                user.gain,
                user.investment,
              ];
            }

            if (tx.type === "mint") {
              volume += tx.amount / 2;
              profit -= tx.amount / 2;
              investment += tx.amount / 2;
            } else {
              profit += tx.amount;
            }

            if (profit === 0 || investment === 0) {
              gain = 0;
            } else {
              gain = profit / investment;
            }

            map.set(tx.account.toLowerCase(), { walletAddress: tx.account, trades, gain, profit, volume, investment });
          }
        });
      } catch (e) {
        console.log("failed marketsTX processing: ", e);
      }

      try {
        trades.map((tx) => {
          let [profit, volume, trades, gain, investment] = [0, 0, 0, 0, 0];
          if (
            tx.taker.toLowerCase() !== ammContract.addresses[networkId].toLowerCase() &&
            tx.taker.toLowerCase() !== LEIFU_ADDRESS.toLowerCase()
          ) {
            if (tx.orderSide === "buy") {
              if (map.has(tx.taker.toLowerCase())) {
                const user = map.get(tx.taker.toLowerCase());
                [profit, volume, trades, gain, investment] = [
                  user.profit,
                  user.volume,
                  user.trades,
                  user.gain,
                  user.investment,
                ];
              }
              trades += 1;
              volume += tx.takerAmount;
              profit -= tx.takerAmount;
              investment += tx.takerAmount;
              if (profit === 0 || investment === 0) {
                gain = 0;
              } else {
                gain = profit / investment;
              }
              map.set(tx.taker.toLowerCase(), { walletAddress: tx.taker, trades, gain, profit, volume, investment });
            } else {
              if (map.has(tx.taker.toLowerCase())) {
                const user = map.get(tx.taker.toLowerCase());
                [profit, volume, trades, gain, investment] = [
                  user.profit,
                  user.volume,
                  user.trades,
                  user.gain,
                  user.investment,
                ];
              }
              trades += 1;
              volume += tx.makerAmount;
              profit += tx.makerAmount;
              if (profit === 0 || investment === 0) {
                gain = 0;
              } else {
                gain = profit / investment;
              }
              map.set(tx.taker.toLowerCase(), { walletAddress: tx.taker, trades, gain, profit, volume, investment });
            }
          }
        });
      } catch (e) {
        console.log("failed TRADES processing: ", e);
      }
    }

    console.log("markets processed");

    const leaderboardArray = Array.from(map, ([name, value]) => ({ ...value, walletAddress: name }));

    if (networkId === 137) {
      await Promise.all(
        leaderboardArray.map(async (userData) => {
          await delay(1000);
          const positions = await thalesData.binaryOptions.positionBalances({
            network: networkId,
            account: userData.walletAddress,
          });
          if (positions && positions.length > 0) {
            positions
              .filter(
                (data) =>
                  data.amount > 0 &&
                  data.position.market.result !== null &&
                  eligibleMarketsSet.has(data.position.market.id.toLowerCase()),
              )
              .map((positionBalance) => {
                if (
                  (positionBalance.position.side === "short" && positionBalance.position.market.result === 1) ||
                  (positionBalance.position.side === "long" && positionBalance.position.market.result === 0)
                ) {
                  userData.profit += Number(ethers.utils.formatEther(positionBalance.amount));
                }
              });
            userData.gain = userData.profit / userData.investment;
          }

          return userData;
        }),
      );
    }

    console.log("positions processed");

    console.log("result is: ", leaderboardArray);

    if (process.env.REDIS_URL) {
      redisClient.set(KEYS.LEADERBOARD[networkId], JSON.stringify(leaderboardArray), function () {});
    }
  } catch (e) {
    console.log("error: ", e);
  }
};
