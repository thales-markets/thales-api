thalesData = require("thales-data");

require("dotenv").config();

const redis = require("redis");
thalesData = require("thales-data");

fetch = require("node-fetch");
const { delay } = require("../services/utils");
const KEYS = require("../redis/redis-keys");
const ammContract = require("../contracts/amm");

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      await processLeaderboard(10);
      await delay(10 * 1000);

      await processLeaderboard(69);
      await delay(10 * 1000);

      await processLeaderboard(137);
      await delay(10 * 1000);

      await processLeaderboard(80001);
      await delay(60 * 1000);
    }
  }, 3000);
}

const processLeaderboard = async (networkId) => {
  const map = new Map();

  console.log("hello, network id: ", networkId);

  const markets = await thalesData.binaryOptions.markets({
    network: networkId,
  });

  console.log("Processing Markets...: ", markets.length);
  try {
    for (let market of markets) {
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

      marketTxs.map((tx) => {
        if (tx.account.toLowerCase() !== ammContract.addresses[networkId].toLowerCase()) {
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

      trades.map((tx) => {
        let [profit, volume, trades, gain, investment] = [0, 0, 0, 0, 0];

        if (tx.orderSide === "buy") {
          if (tx.taker.toLowerCase() !== ammContract.addresses[networkId].toLowerCase()) {
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
            console.log("tx that is malicious: ", tx);
          }
        } else {
          if (tx.taker.toLowerCase() !== ammContract.addresses[networkId].toLowerCase()) {
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
          } else {
            console.log("tx that is malicious: ", tx);
          }
        }
      });
    }

    console.log(
      "result is: ",
      Array.from(map, ([name, value]) => ({ ...value, walletAddress: name })),
    );

    if (process.env.REDIS_URL) {
      redisClient.set(
        KEYS.LEADERBOARD[networkId],
        JSON.stringify(Array.from(map, ([name, value]) => ({ ...value, walletAddress: name }))),
        function () {},
      );
    }
  } catch (e) {
    console.log("error: ", e);
  }
};
