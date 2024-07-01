require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const {
  delay,
  fixDuplicatedTeamName,
  convertPositionNameToPosition,
  convertFinalResultToResultType,
  sortByTotalQuote,
} = require("./services/utils");
const { subMilliseconds, differenceInDays, addDays } = require("date-fns");
const { getProvider } = require("./overtimeV2Api/utils/provider");
const sportsAMMV2DataContract = require("./abi/sportsAMMV2DataContract");
const priceFeedContract = require("./abi/priceFeedContract");
const { ethers } = require("ethers");
const { formatBytes32String, formatEther } = require("ethers/lib/utils");
const { NETWORK } = require("./overtimeV2Api/constants/networks");

const PARLAY_LEADERBOARD_WEEKLY_START_DATE = new Date(2024, 1, 14, 0, 0, 0);
const PARLAY_LEADERBOARD_WEEKLY_START_DATE_UTC = new Date(Date.UTC(2024, 1, 14, 0, 0, 0));

const PARLAY_LEADERBOARD_MAXIMUM_QUOTE = 0.006666666666666;
const PARLAY_LEADERBOARD_MINIMUM_GAMES = 2;

const PARLAY_LEADERBOARD_START_PERIOD_V2 = 18;

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

function getRates(network, provider) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.TOKEN, async function (err, obj) {
      const tokenMap = new Map(JSON.parse(obj));
      const thalesRate = Number(tokenMap.get("price"));

      const priceFeed = new ethers.Contract(priceFeedContract.addresses[network], priceFeedContract.abi, provider);
      const ethRate = formatEther(await priceFeed.rateForCurrency(formatBytes32String("ETH")));
      resolve({ thalesRate, ethRate });
    });
  });
}

const getParlayLeaderboardForPeriod = async (network, startPeriod, endPeriod, period, rates, sportsAmmData) => {
  let filteredUserWinningTicketsModified = [];

  if (network === NETWORK.Optimism && period >= PARLAY_LEADERBOARD_START_PERIOD_V2) {
    let ticketsV2 = await thalesData.sportMarketsV2.tickets({
      network,
      startPeriod,
      endPeriod,
    });
    const filteredTickets = ticketsV2.filter(
      (ticket) => ticket.markets.length > 1 && ticket.lastGameStarts < new Date().getTime(),
    );
    const filteredTicketsAddresses = filteredTickets.map((ticket) => ticket.id);

    const batchSize = process.env.BATCH_SIZE;
    const numberOfBatches = Math.trunc(filteredTicketsAddresses.length / batchSize) + 1;

    let userWinningTicketsFromContract = [];
    for (let i = 0; i < numberOfBatches; i++) {
      const ticketData = await sportsAmmData.getTicketsData(
        filteredTicketsAddresses.slice(i * batchSize, (i + 1) * batchSize),
      );
      userWinningTicketsFromContract = [
        ...userWinningTicketsFromContract,
        ...ticketData.filter((ticket) => ticket.isUserTheWinner),
      ];
    }
    const userWinningTicketsAddressesFromContract = userWinningTicketsFromContract.map((ticket) =>
      ticket.id.toLowerCase(),
    );

    const filteredUserWinningTickets = filteredTickets.filter((ticket) =>
      userWinningTicketsAddressesFromContract.includes(ticket.id),
    );

    filteredUserWinningTicketsModified = filteredUserWinningTickets.map((ticket, indexTicket) => {
      let totalQuote = ticket.totalQuote;
      let totalAmount = ticket.payout;
      let numberOfPositions = ticket.markets.length;

      ticket.markets.forEach((market, indexMarket) => {
        const isCancelled = userWinningTicketsFromContract[indexTicket].marketsResult[indexMarket] === 1;
        if (isCancelled) {
          console.log(ticket.id, isCancelled);
          totalQuote = totalQuote / market.odd;
          totalAmount = totalAmount * market.odd;
        }
      });

      const exchangeRate =
        ticket.collateral === "0x4200000000000000000000000000000000000006"
          ? rates.ethRate
          : ticket.collateral === "0x217d47011b23bb961eb6d93ca9945b7501a5bb11"
          ? rates.thalesRate
          : 1;

      const buyInAmountInUsd = exchangeRate * ticket.buyInAmount;
      const totalAmountInUsd = exchangeRate * totalAmount;

      const buyInPow = Math.pow(buyInAmountInUsd, 1 / (period === 0 ? 3 : 2));
      const points = (totalAmountInUsd / buyInAmountInUsd) * (1 + 0.1 * numberOfPositions) * buyInPow;

      return {
        id: ticket.id,
        txHash: ticket.txHash,
        sportMarkets: [],
        sportMarketsFromContract: [],
        positions: [],
        positionsFromContract: [],
        marketQuotes: [],
        account: ticket.owner,
        totalAmount: totalAmountInUsd,
        sUSDPaid: buyInAmountInUsd,
        sUSDAfterFees: buyInAmountInUsd,
        totalQuote,
        timestamp: ticket.timestamp,
        lastGameStarts: ticket.lastGameStarts,
        numberOfPositions,
        points,
        isV2: true,
        collateral: ticket.collateral,
      };
    });
  }

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
        isV2: false,
      };
    });

  parlayMarketsModified = [...parlayMarketsModified, ...filteredUserWinningTicketsModified]
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

  const latestPeriodWeekly = Math.ceil(differenceInDays(new Date(), PARLAY_LEADERBOARD_WEEKLY_START_DATE) / 7);

  const provider = getProvider(network);
  const rates = network === NETWORK.Optimism ? await getRates(network, provider) : undefined;
  const sportsAmmData =
    network === NETWORK.Optimism
      ? new ethers.Contract(sportsAMMV2DataContract.addresses[network], sportsAMMV2DataContract.abi, provider)
      : undefined;

  for (let period = latestPeriodWeekly - 4; period <= latestPeriodWeekly; period++) {
    const startPeriod = Math.trunc(addDays(PARLAY_LEADERBOARD_WEEKLY_START_DATE_UTC, period * 7).getTime() / 1000);
    const endPeriod = Math.trunc(
      subMilliseconds(addDays(PARLAY_LEADERBOARD_WEEKLY_START_DATE_UTC, (period + 1) * 7), 1).getTime() / 1000,
    );

    console.log(`Getting data for period: ${period}`);
    const parlayMarkets = await getParlayLeaderboardForPeriod(
      network,
      startPeriod,
      endPeriod,
      period,
      rates,
      sportsAmmData,
    );
    periodMap.set(period, parlayMarkets);
  }

  redisClient.set(KEYS.PARLAY_LEADERBOARD[network], JSON.stringify([...periodMap]), function () {});
}
