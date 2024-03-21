require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("../../redis/redis-keys");
const ethers = require("ethers");
const marchMadness = require("../contracts/marchMadness");
const collateral = require("../contracts/collateral");
const { delay } = require("../../services/utils");
const { _, sortBy, orderBy } = require("lodash");
const { differenceInDays, addDays, subMilliseconds } = require("date-fns");
const { getProvider } = require("../utils/provider");
const {
  filterUniqueBracketsWithUniqueMinter,
  mergePointsDataWithMintersData,
  bigNumberFormatter,
  floorNumberToDecimals,
} = require("../utils/helpers");

const ARB_VOLUME_REWARDS = 30000;

const ONE_MINUTE = 60 * 1000;
const NUMBER_OF_DAYS_IN_PERIOD = 4;

const ARB_DECIMALS = 6;

const EXCLUDE_ADDRESSES = [];

const PERCENTAGE_OF_PRIZE_POOL = [
  0.15, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02,
];

const REWARDS = [2500, 1000, 500, 200, 200, 150, 150, 150, 100, 100, 50, 50, 50, 50, 50, 30, 30, 30, 30, 30];

async function processRewards() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });

    setTimeout(async () => {
      while (true) {
        try {
          await processOrders(42161);
        } catch (e) {
          console.log("Error ", e);
        }
        // 3 minute delay between iterations
        await delay(3 * ONE_MINUTE);
      }
      // 3 seconds timeout to give time to connect to redis
    }, 3000);
  }
}

const NCAA_TAG_ID = "9005";

async function processOrders(network) {
  const FROM_DATE = new Date("03-18-2024");
  const TO_DATE = new Date("04-10-2024");

  console.log("----------------------------------------------------------------------------");
  console.log("NetworkId -> ", network);

  const provider = getProvider(network);

  if (marchMadness.addresses[network] == "TBD") {
    console.log("Contract address not provided.");
    return;
  }

  const marchMadnessContract = new ethers.Contract(marchMadness.addresses[network], marchMadness.abi, provider);

  const marchMadnessTokens = await thalesData.sportMarkets.marchMadnessToken({
    network: network,
  });

  const bracketsCount = marchMadnessTokens.length || 0;

  const uniqueBracketsWithUniqueMinters = filterUniqueBracketsWithUniqueMinter(marchMadnessTokens);
  const itemIds = uniqueBracketsWithUniqueMinters.map((item) => Number(item.itemId));

  // Fetch points per minter
  const pointsPromises = [];

  const BATCH_SIZE = 100;
  const numOfBatches = itemIds.length / BATCH_SIZE;
  for (let i = 0; i < numOfBatches; i++) {
    const startIndex = i * BATCH_SIZE;
    const slice = itemIds.slice(startIndex, startIndex + BATCH_SIZE);
    pointsPromises.push(marchMadnessContract.getTotalPointsByTokenIds(slice));
  }

  const pointsData = (await Promise.all(pointsPromises)).flat().map((point) => Number(point));

  const detailMintersData = mergePointsDataWithMintersData(uniqueBracketsWithUniqueMinters, pointsData);

  const uniqueAccountsFromTransactionsData = await getUniqueTradersFromTransactionsData(FROM_DATE, TO_DATE, network);

  let uniqueAddresses = _.uniqBy(uniqueAccountsFromTransactionsData);

  const users = [];
  let globalVolume = 0;

  uniqueAddresses = uniqueAddresses.filter((address) => !EXCLUDE_ADDRESSES.includes(address));

  // Time consuming operation: for 1000 unique addresses processing takes 10min
  for (let i = 0; i < uniqueAddresses.length; i++) {
    const owner = uniqueAddresses[i];

    const singles = await thalesData.sportMarkets.marketTransactions({
      network: network,
      account: owner,
      minTimestamp: FROM_DATE.getTime() / 1000,
    });
    const parlays = await thalesData.sportMarkets.parlayMarkets({
      network: network,
      account: owner,
      minTimestamp: FROM_DATE.getTime() / 1000,
    });

    // Check for singles and parlays that are in right competition
    const singleFromLeague = singles.filter((singleTx) => singleTx.wholeMarket.tags.includes(NCAA_TAG_ID));
    const parlayFromLeague = parlays.filter(
      (parlayTx) => parlayTx.sportMarkets.filter((sportMarket) => sportMarket.tags.includes(NCAA_TAG_ID)).length > 0,
    );

    let _volume = 0;

    singleFromLeague.forEach((single) => {
      _volume += single.paid;
    });

    parlayFromLeague.forEach((parlay) => {
      _volume += parlay.sUSDPaid;
    });

    users.push({
      walletAddress: owner,
      volume: _volume,
    });

    globalVolume += _volume;
  }

  const clonedUsers = JSON.parse(JSON.stringify(users));

  const finalUsersByVolume = orderBy(
    clonedUsers.map((item) => {
      return {
        ...item,
        estimatedRewards: (item.volume / globalVolume) * ARB_VOLUME_REWARDS,
      };
    }),
    ["volume"],
    ["desc"],
  ).map((item, index) => {
    return {
      rank: index + 1,
      ...item,
    };
  });

  // funds moved from contract so use fixed 19428.57 instead of call to contract
  const poolSize = ethers.BigNumber.from("19428570000");
  // const usdcContract = new ethers.Contract(collateral.addresses[network], collateral.abi, provider);
  // const poolSize = await usdcContract.balanceOf(marchMadness.addresses[network]);

  const finalUsersByPoints = orderBy(
    detailMintersData.map((item) => {
      return {
        bracketId: Number(item.itemId),
        owner: item.minter,
        totalPoints: item.totalPoints,
      };
    }),
    ["totalPoints", "bracketId"],
    ["desc", "asc"],
  ).map((item, index) => {
    return {
      rank: index + 1,
      tokenRewards: floorNumberToDecimals(REWARDS[index] ? REWARDS[index] : 0, 2),
      stableRewards: floorNumberToDecimals(
        PERCENTAGE_OF_PRIZE_POOL[index]
          ? PERCENTAGE_OF_PRIZE_POOL[index] * bigNumberFormatter(poolSize, ARB_DECIMALS)
          : 0,
        2,
      ),
      ...item,
    };
  });

  if (process.env.REDIS_URL) {
    redisClient.set(
      KEYS.MARCH_MADNESS.FINAL_DATA[network],
      JSON.stringify({
        dataByVolume: finalUsersByVolume,
        dataByPoints: finalUsersByPoints,
        generalStats: { poolSize: bigNumberFormatter(poolSize, ARB_DECIMALS), totalBracketsMinted: bracketsCount },
      }),
      function () {},
    );
  }
  return;
}

const getUniqueTradersFromTransactionsData = async (fromDate, toDate, network) => {
  if (!fromDate) return [];

  const numberOfPeriods = Math.trunc(differenceInDays(toDate, fromDate) / NUMBER_OF_DAYS_IN_PERIOD);

  let singles = [];
  let parlays = [];
  for (let period = 0; period <= numberOfPeriods; period++) {
    const startPeriod = Math.trunc(addDays(fromDate, period * NUMBER_OF_DAYS_IN_PERIOD).getTime() / 1000);
    const endPeriod = Math.trunc(
      subMilliseconds(addDays(fromDate, (period + 1) * NUMBER_OF_DAYS_IN_PERIOD), 1).getTime() / 1000,
    );
    console.log("Processing period: ", period, startPeriod, endPeriod);

    const periodSingles = await thalesData.sportMarkets.marketTransactions({
      network: network,
      minTimestamp: startPeriod,
      maxTimestamp: endPeriod,
      leagueTag: NCAA_TAG_ID,
    });
    singles = [...singles, ...periodSingles];

    const periodParlays = await thalesData.sportMarkets.parlayMarkets({
      network: network,
      minTimestamp: startPeriod,
      maxTimestamp: endPeriod,
    });
    parlays = [...parlays, ...periodParlays];
  }

  // Filter only from NCAA
  const singleFromLeague = singles.filter((singleTx) => singleTx.wholeMarket.tags.includes(NCAA_TAG_ID));
  const parlayFromLeague = parlays.filter(
    (parlayTx) => parlayTx.sportMarkets.filter((sportMarket) => sportMarket.tags.includes(NCAA_TAG_ID)).length > 0,
  );

  const uniqueAccountsFromSingleTransactions = _.uniqBy(singleFromLeague, "account");
  const uniqueAccountsFromParlayTransactions = _.uniqBy(parlayFromLeague, "account");

  const uniqueAccountsFromSingle = uniqueAccountsFromSingleTransactions.map((single) => single.account);
  const uniqueAccountsFromParlays = uniqueAccountsFromParlayTransactions.map((parlay) => parlay.account);

  return uniqueAccountsFromSingle.concat(uniqueAccountsFromParlays);
};

module.exports = {
  processRewards,
};
