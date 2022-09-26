const e = require("cors");
const fetch = require("node-fetch");

require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const { delay } = require("./services/utils");

const util = require("util");

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

const getLastSevenDaysTwap = async (token, START_DATE) => {
  const url = "https://api.coingecko.com/api/v3/coins/";
  const suffix = "/history?date=";

  const urlsToUse = [];

  for (let day = 1; day < 8; day++) {
    START_DATE.setDate(START_DATE.getDate() - 1);
    const newDate = START_DATE.toISOString().replace(/T.*/, "").split("-").reverse().join("-");
    const urlToUse = url + token + suffix + newDate;
    urlsToUse.push(urlToUse);
  }

  const prices = await Promise.all(
    urlsToUse.map(async (urlToUse) => {
      const data = await fetch(urlToUse);
      const formatedData = await data.json();
      return formatedData.market_data.current_price.usd;
    }),
  );

  let twap = 0;
  prices.map((price) => {
    twap += price;
  });

  return twap / 7;
};

async function processOrders(network) {
  const START_DATE = new Date(2022, 8, 26, 0, 0, 0);
  const periodMap = new Map();

  for (let period = 0; period < 1; period++) {
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

    const allTx = await thalesData.sportMarkets.marketTransactions({
      network: network,
      startPeriod: parseInt(startDate.getTime() / 1000),
      endPeriod: parseInt(endDate.getTime() / 1000),
    });

    let twapArray = [];

    redisClient.get = util.promisify(redisClient.get);
    const twap = await redisClient.get(KEYS.TWAP_FOR_PERIOD);

    if (twap) {
      twapArray = JSON.parse(twap);
      if (twapArray[period]) {
        periodTwap = twapArray[period];
      } else {
        const twapThales = await getLastSevenDaysTwap("thales", startDate);
        const twapOp = await getLastSevenDaysTwap("optimism", startDate);
        const finalTwap = 8000 * twapThales + 8000 * twapOp;
        twapArray.push(finalTwap);
      }
    } else {
      const twapThales = await getLastSevenDaysTwap("thales", new Date());
      const twapOp = await getLastSevenDaysTwap("optimism", new Date());
      const finalTwap = 8000 * twapThales + 8000 * twapOp;
      twapArray.push(finalTwap);
    }

    redisClient.set(KEYS.TWAP_FOR_PERIOD, JSON.stringify([...twapArray]), function () {});

    const usersMap = new Map();

    let globalVolume = 0;

    allTx.map((tx) => {
      let user = usersMap.get(tx.account);
      if (!user) user = initUser(tx);
      user.volume = user.volume + tx.paid;
      globalVolume = globalVolume + tx.paid;
      usersMap.set(tx.account, user);
    });

    const finalArray = [];
    const finalTwap = twapArray[period];

    const globalSafeboxFeesForPeriod = (globalVolume * 2) / 100;
    const totalRebatesToPay = (9 / 10) * globalSafeboxFeesForPeriod;

    Array.from(usersMap.values()).map((user) => {
      user.percentage = Math.abs(user.volume / globalVolume) * 100;
      user.safebox = (user.volume * 2) / 100;
      user.rebates = (user.safebox * 9) / 10;
      if (finalTwap > totalRebatesToPay) {
        user.rewards.op = (((8000 * user.percentage) / 100) * totalRebatesToPay) / finalTwap;
        user.rewards.thales = (((8000 * user.percentage) / 100) * totalRebatesToPay) / finalTwap;
      } else {
        user.rewards.op = (8000 * user.percentage) / 100;
        user.rewards.thales = (8000 * user.percentage) / 100;
      }

      finalArray.push(user);
      return user;
    });
    periodMap.set(period, {
      globalVolume: globalVolume,
      safeBooxFees: globalSafeboxFeesForPeriod,
      rebatesToPay: totalRebatesToPay,
      twapForPeriod: finalTwap,
      users: finalArray,
    });
  }

  redisClient.set(KEYS.OVERTIME_REWARDS[network], JSON.stringify([...periodMap]), function () {});
}

function initUser(tx) {
  const user = {
    address: tx.account,
    volume: 0,
    safebox: 0,
    rebates: 0,
    percentage: 0,
    rewards: { op: 0, thales: 0 },
  };
  return user;
}
