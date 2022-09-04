require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");

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
      // try {
      //   console.log("process orders on kovan");
      //   await processOrders(42);
      // } catch (error) {
      //   console.log("orders on optimism error: ", error);
      // }
      // await delay(20 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const START_DATE = new Date(2022, 7, 1, 0, 0, 0);
  const periodMap = new Map();

  for (let period = 0; period < 6; period++) {
    const startDate = new Date(START_DATE.getTime());
    startDate.setDate(START_DATE.getDate() + period * 14);

    console.log("*** Period: ", period + 1, " ***");
    console.log("*** startDate: ", startDate, " ***");

    if (startDate > new Date()) {
      break;
    }
    const endDate = new Date(START_DATE.getTime());
    endDate.setDate(START_DATE.getDate() + (period + 1) * 14);

    console.log("*** endDate: ", endDate, " ***");

    let allTx;
    if (period === 0) {
      allTx = await thalesData.sportMarkets.marketTransactions({
        network: network,
        minTimestamp: parseInt(startDate.getTime() / 1000),
      });
    } else {
      allTx = await thalesData.sportMarkets.marketTransactions({
        network: network,
      });
    }

    const [claimTx, positionBalances] = await Promise.all([
      thalesData.sportMarkets.claimTxes({
        network: network,
      }),
      thalesData.sportMarkets.positionBalances({ network: network }),
    ]);

    const usersMap = new Map();

    allTx.map((tx) => {
      if (
        new Date(Number(tx.wholeMarket.maturityDate * 1000)) > startDate &&
        new Date(Number(tx.wholeMarket.maturityDate * 1000)) < endDate &&
        tx.wholeMarket.isResolved &&
        !tx.wholeMarket.isCanceled
      ) {
        let user = usersMap.get(tx.account);
        if (!user) user = initUser(tx);
        if (period < 2) {
          if (tx.type === "buy") {
            user.pnl = user.pnl - tx.paid;
          } else user.pnl = user.pnl + tx.paid;
        } else {
          if (Number(tx.position) + 1 !== Number(tx.wholeMarket.finalResult)) {
            if (tx.type === "buy") {
              user.pnl = user.pnl - tx.paid;
            } else {
              user.pnl = user.pnl + tx.paid;
            }
          }
        }

        usersMap.set(tx.account, user);
      }
    });

    if (period < 2) {
      claimTx.map((tx) => {
        if (
          new Date(Number(tx.market.maturityDate * 1000)) < endDate &&
          new Date(Number(tx.market.maturityDate * 1000)) > startDate &&
          !tx.market.isCanceled
        ) {
          let user = usersMap.get(tx.account);
          if (!user) user = initUser(tx);
          user.pnl = user.pnl + Number(tx.amount);
          usersMap.set(tx.account, user);
        }
      });

      positionBalances.map((positionBalance) => {
        if (
          positionBalance.position.claimable &&
          new Date(Number(positionBalance.position.market.maturityDate * 1000)) < endDate &&
          new Date(Number(positionBalance.position.market.maturityDate * 1000)) > startDate
        ) {
          let user = usersMap.get(positionBalance.account);
          if (!user) user = initUser(positionBalance);
          user.pnl = user.pnl + Number(positionBalance.amount) / 1e18;
          usersMap.set(positionBalance.account, user);
        }
      });
    }

    let globalNegativePnl = 0;

    Array.from(usersMap.values()).map((user) => {
      if (user.pnl < 0) {
        globalNegativePnl = globalNegativePnl + user.pnl;
      }
    });

    const finalArray = [];

    Array.from(usersMap.values()).map((user) => {
      if (user.pnl < 0) {
        user.percentage = Math.abs(user.pnl / globalNegativePnl) * 100;
        user.rewards.op = (user.percentage * (period < 2 ? 5000 : 8000)) / 100;
        user.rewards.thales = (user.percentage * (period < 2 ? 5000 : 8000)) / 100;
        finalArray.push(user);
      } else {
        user.percentage = 0;
      }
      return user;
    });
    periodMap.set(period, { negativePnlTotal: globalNegativePnl, users: finalArray });
  }

  redisClient.set(KEYS.OVERTIME_REWARDS[network], JSON.stringify([...periodMap]), function () {});
}

function initUser(tx) {
  const user = {
    address: tx.account,
    pnl: 0,
    percentage: 0,
    rewards: { op: 0, thales: 0 },
  };
  return user;
}
