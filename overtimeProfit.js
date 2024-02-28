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

const { subMilliseconds, differenceInDays, addDays } = require("date-fns");
const { uniqBy } = require("lodash");
const { NETWORK } = require("./overtimeApi/constants/networks");

const TODAYS_DATE = new Date();
const PARLAY_LEADERBOARD_WEEKLY_START_DATE = new Date(2024, 1, 14, 0, 0, 0);
const PARLAY_LEADERBOARD_WEEKLY_START_DATE_UTC = new Date(Date.UTC(2024, 1, 14, 0, 0, 0));

const PARLAY_LEADERBOARD_MAXIMUM_QUOTE = 0.006666666666666;
const PARLAY_LEADERBOARD_MINIMUM_GAMES = 2;

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
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

      await delay(3 * 60 * 1000);
    }
  }, 3000);
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

      const buyInPow = Math.pow(parlayMarket.sUSDPaid, 1 / (period === 0 ? 3 : 2));
      const points = (totalAmount / parlayMarket.sUSDPaid) * (1 + 0.1 * numberOfPositions) * buyInPow;

      return {
        ...parlayMarket,
        totalQuote,
        totalAmount,
        numberOfPositions,
        sportMarkets,
        points,
      };
    });

  parlayMarketsModified = parlayMarketsModified
    .filter((parlay) => parlay.numberOfPositions >= PARLAY_LEADERBOARD_MINIMUM_GAMES)
    .sort((a, b) =>
      a.points !== b.points
        ? b.points - a.points
        : a.totalQuote !== b.totalQuote
        ? a.totalQuote - b.totalQuote
        : a.numberOfPositions !== b.numberOfPositions
        ? b.numberOfPositions - a.numberOfPositions
        : a.sUSDPaid !== b.sUSDPaid
        ? b.sUSDPaid - a.sUSDPaid
        : sortByTotalQuote(a, b),
    );

  parlayMarketsModified = parlayMarketsModified.map((parlayMarket, index) => {
    return {
      ...parlayMarket,
      rank: index + 1,
    };
  });

  return parlayMarketsModified;
};

async function processParlayLeaderboard(network) {
  const periodMap = new Map();

  const latestPeriodWeekly = Math.ceil(differenceInDays(TODAYS_DATE, PARLAY_LEADERBOARD_WEEKLY_START_DATE) / 7);

  for (let period = 0; period <= latestPeriodWeekly; period++) {
    const startPeriod = Math.trunc(addDays(PARLAY_LEADERBOARD_WEEKLY_START_DATE_UTC, period * 7).getTime() / 1000);
    const endPeriod = Math.trunc(
      subMilliseconds(addDays(PARLAY_LEADERBOARD_WEEKLY_START_DATE_UTC, (period + 1) * 7), 1).getTime() / 1000,
    );

    const parlayMarkets = await getParlayLeaderboardForPeriod(network, startPeriod, endPeriod, period);
    periodMap.set(period, parlayMarkets);
  }

  redisClient.set(KEYS.PARLAY_LEADERBOARD[network], JSON.stringify([...periodMap]), function () {});
}
