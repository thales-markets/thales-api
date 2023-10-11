const e = require("cors");
const fetch = require("node-fetch");

require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const {
  delay,
  addMonthsToUTCDate,
  fixDuplicatedTeamName,
  convertPositionNameToPosition,
  convertFinalResultToResultType,
  sortByTotalQuote,
} = require("./services/utils");

const util = require("util");
const { subMilliseconds, differenceInDays, addDays } = require("date-fns");
const { uniqBy } = require("lodash");

const PARLAY_CONTRACT = "0x82b3634c0518507d5d817be6dab6233ebe4d68d9";
const VAULT_DISCOUNT = "0xc922f4cde42dd658a7d3ea852caf7eae47f6cecd";
const VAULT_DEGEN = "0xbaac5464bf6e767c9af0e8d4677c01be2065fd5f";
const VAULT_SAFU = "0x43d19841d818b2ccc63a8b44ce8c7def8616d98e";

const TODAYS_DATE = new Date();
const PARLAY_LEADERBOARD_BIWEEKLY_START_DATE = new Date(2023, 2, 1, 0, 0, 0);
const PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_UTC = new Date(Date.UTC(2023, 2, 1, 0, 0, 0));

// Base leaderboard starts
const PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_BASE = new Date(2023, 9, 11, 0, 0, 0);
const PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_UTC_BASE = new Date(Date.UTC(2023, 9, 11, 0, 0, 0));

const PARLAY_LEADERBOARD_MAXIMUM_QUOTE = 0.01;
const FIRST_PERIOD_SORT_BY_TOTAL_QUOTE = 6;
const PARLAY_LEADERBOARD_MINIMUM_GAMES = 3;

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      // try {
      //   console.log("process orders on optimism");
      //   await processOrders(10);
      // } catch (error) {
      //   console.log("orders on optimism error: ", error);
      // }

      // await delay(60 * 1000);

      try {
        console.log("process parlay leaderboard on optimism");
        await processParlayLeaderboard(10);
      } catch (error) {
        console.log("parlay leaderboard on optimism error: ", error);
      }

      await delay(60 * 1000);

      try {
        console.log("process parlay leaderboard on arbitrum");
        await processParlayLeaderboard(42161);
      } catch (error) {
        console.log("parlay leaderboard on arbitrum error: ", error);
      }

      await delay(60 * 1000);

      try {
        console.log("process parlay leaderboard on op goerli");
        await processParlayLeaderboard(420);
      } catch (error) {
        console.log("parlay leaderboard on op goerli error: ", error);
      }

      await delay(60 * 1000);

      try {
        console.log("process parlay leaderboard on BASE Mainnet");
        await processParlayLeaderboard(8453);
      } catch (error) {
        console.log("parlay leaderboard on BASE Mainnet error: ", error);
      }

      await delay(3 * 60 * 1000);
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

  for (let period = 10; period < 20; period++) {
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

    let globalVolumeSingles = 0;
    let globalVolumeParlays = 0;

    const allTx = [];

    for (let index = 0; index < 7; index++) {
      const betweenDateStart = new Date(START_DATE.getTime());
      betweenDateStart.setDate(START_DATE.getDate() + period * 14 + 2 * index);

      const betweenDateEnd = new Date(START_DATE.getTime());
      betweenDateEnd.setDate(START_DATE.getDate() + period * 14 + 2 * (index + 1));

      const txs = await thalesData.sportMarkets.marketTransactions({
        network: network,
        startPeriod: parseInt(betweenDateStart.getTime() / 1000),
        endPeriod: parseInt(betweenDateEnd.getTime() / 1000),
      });

      allTx.push(...txs);
    }

    allTx.map((tx) => {
      if (
        tx.account.toLowerCase() !== PARLAY_CONTRACT &&
        tx.account.toLowerCase() !== VAULT_DEGEN &&
        tx.account.toLowerCase() !== VAULT_DISCOUNT &&
        tx.account.toLowerCase() !== VAULT_SAFU
      ) {
        let user = usersMap.get(tx.account);
        if (!user) user = initUser(tx);
        user.volume = user.volume + tx.paid;
        user.singlesVolume = user.singlesVolume + tx.paid;
        globalVolumeSingles = globalVolumeSingles + tx.paid;
        usersMap.set(tx.account, user);
      }
    });

    const parlays = await thalesData.sportMarkets.parlayMarkets({
      network: network,
      startPeriod: parseInt(startDate.getTime() / 1000),
      endPeriod: parseInt(endDate.getTime() / 1000),
    });

    parlays.map((tx) => {
      let user = usersMap.get(tx.account);
      if (!user) user = initUser(tx);
      user.volume = user.volume + tx.sUSDPaid;
      user.parlaysVolume = user.parlaysVolume + tx.sUSDPaid;
      globalVolumeParlays = globalVolumeParlays + tx.sUSDPaid;
      usersMap.set(tx.account, user);
    });

    const FEEPercentageSingles = period >= 12 ? 1 : 3;
    const FEEPercentageParlays = period >= 12 ? 2 : 3;

    const finalArray = [];
    const finalTwap = twapArray[period];

    const globalSafeboxFeesForPeriod =
      (globalVolumeSingles * FEEPercentageSingles) / 100 + (globalVolumeParlays * FEEPercentageParlays) / 100;
    const totalRebatesToPay = (9 / 10) * globalSafeboxFeesForPeriod;

    Array.from(usersMap.values()).map((user) => {
      user.percentage = Math.abs(user.volume / (globalVolumeSingles + globalVolumeParlays)) * 100;
      user.safebox =
        (user.singlesVolume * FEEPercentageSingles) / 100 + (user.parlaysVolume * FEEPercentageParlays) / 100;
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
      globalVolume: globalVolumeSingles + globalVolumeParlays,
      safeBooxFees: globalSafeboxFeesForPeriod,
      rebatesToPay: totalRebatesToPay,
      twapForPeriod: finalTwap,
      users: finalArray,
    });
  }

  redisClient.set(KEYS.OVERTIME_REWARDS[network], JSON.stringify([...periodMap]), function () {});
}

const getParlayLeaderboardForPeriod = async (network, startPeriod, endPeriod, period) => {
  let parlayMarkets = await thalesData.sportMarkets.parlayMarkets({
    network,
    startPeriod,
    endPeriod,
  });

  let parlayMarketsModified = parlayMarkets
    .filter((market) =>
      market.positions.every(
        (position) =>
          convertPositionNameToPosition(position.side) ===
            convertFinalResultToResultType(position.market.finalResult) || position.market.isCanceled,
      ),
    )
    .map((parlayMarket) => {
      let totalQuote = parlayMarket.totalQuote;
      let totalAmount = parlayMarket.totalAmount;
      let numberOfPositions = parlayMarket.sportMarkets.length;

      let realQuote = 1;
      parlayMarket.marketQuotes.map((quote) => {
        realQuote = realQuote * quote;
      });

      const sportMarkets = parlayMarket.sportMarkets.map((market) => {
        if (market.isCanceled) {
          const marketIndex = parlayMarket.sportMarketsFromContract.findIndex(
            (sportMarketFromContract) => sportMarketFromContract === market.address,
          );
          if (marketIndex > -1) {
            realQuote = realQuote / parlayMarket.marketQuotes[marketIndex];
            const maximumQuote = PARLAY_LEADERBOARD_MAXIMUM_QUOTE;
            totalQuote = realQuote < maximumQuote ? maximumQuote : realQuote;
            numberOfPositions = numberOfPositions - 1;
            totalAmount = totalAmount * parlayMarket.marketQuotes[marketIndex];
          }
        }

        return {
          ...market,
          homeTeam: fixDuplicatedTeamName(market.homeTeam),
          awayTeam: fixDuplicatedTeamName(market.awayTeam),
        };
      });

      return {
        ...parlayMarket,
        totalQuote,
        totalAmount,
        numberOfPositions,
        sportMarkets,
      };
    });

  if (period < FIRST_PERIOD_SORT_BY_TOTAL_QUOTE) {
    parlayMarketsModified = parlayMarketsModified.sort((a, b) =>
      a.numberOfPositions !== b.numberOfPositions
        ? b.numberOfPositions - a.numberOfPositions
        : a.totalQuote !== b.totalQuote
        ? a.totalQuote - b.totalQuote
        : a.sUSDPaid !== b.sUSDPaid
        ? b.sUSDPaid - a.sUSDPaid
        : sortByTotalQuote(a, b),
    );
  } else {
    parlayMarketsModified = parlayMarketsModified
      .filter((parlay) => parlay.numberOfPositions >= PARLAY_LEADERBOARD_MINIMUM_GAMES)
      .sort((a, b) =>
        a.totalQuote !== b.totalQuote
          ? a.totalQuote - b.totalQuote
          : a.numberOfPositions !== b.numberOfPositions
          ? b.numberOfPositions - a.numberOfPositions
          : a.sUSDPaid !== b.sUSDPaid
          ? b.sUSDPaid - a.sUSDPaid
          : sortByTotalQuote(a, b),
      );
  }

  parlayMarketsModified = uniqBy(parlayMarketsModified, "account").map((parlayMarket, index) => {
    return {
      ...parlayMarket,
      rank: index + 1,
    };
  });

  return parlayMarketsModified;
};

async function processParlayLeaderboard(network) {
  const periodMap = new Map();

  const latestPeriodBiweekly = Math.ceil(differenceInDays(TODAYS_DATE, network == 8453 ? PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_BASE : PARLAY_LEADERBOARD_BIWEEKLY_START_DATE) / 14);

  for (let period = 0; period <= latestPeriodBiweekly; period++) {
    const startPeriod = Math.trunc(addDays(network == 8453 ? PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_UTC_BASE : PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_UTC, period * 14).getTime() / 1000);
    const endPeriod = Math.trunc(
      subMilliseconds(addDays(network == 8453 ? PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_UTC_BASE : PARLAY_LEADERBOARD_BIWEEKLY_START_DATE_UTC, (period + 1) * 14), 1).getTime() / 1000,
    );

    const parlayMarkets = await getParlayLeaderboardForPeriod(network, startPeriod, endPeriod, period);
    periodMap.set(period, parlayMarkets);
  }

  redisClient.set(KEYS.PARLAY_LEADERBOARD[network], JSON.stringify([...periodMap]), function () {});
}

function initUser(tx) {
  const user = {
    address: tx.account,
    singlesVolume: 0,
    parlaysVolume: 0,
    volume: 0,
    safebox: 0,
    rebates: 0,
    percentage: 0,
    rewards: { op: 0, thales: 0 },
  };
  return user;
}
