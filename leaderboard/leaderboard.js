const KEYS = require("../redis/redis-keys");

const { delay } = require("../services/utils");
const {
  getStableToken,
  getTradeSizeInSUSD,
  calculateNetProfit,
  calculateInvestment,
  getBalance,
  isMarketInMaturity,
  getAmountOfTokens,
  getPricePerToken,
  getTradeType,
  getSidePerTrade,
} = require("./utils");

require("dotenv").config();
const redis = require("redis");
thalesData = require("thales-data");

const Web3 = require("web3");
Web3Client = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));

let verifiedUsers;

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });

  setTimeout(async () => {
    while (true) {
      try {
        console.log("process leaderboard on mainnet");
        await processLeaderboard(1);
      } catch (error) {
        console.log("leaderboard on mainnet error: ", error);
      }

      try {
        console.log("process leaderboard on ropsten");
        await processLeaderboard(3);
      } catch (error) {
        console.log("leaderboard on ropsten error: ", error);
      }

      await delay(20 * 1000);
    }
  }, 3000);
}

async function processLeaderboard(network) {
  const leaderboard = new Map();
  redisClient.get(KEYS.VERIFIED_ACCOUNTS, function (err, obj) {
    verifiedUsers = JSON.parse(obj);
    console.log("verified users: ", verifiedUsers);
  });

  verifiedUsers.map((user) => {
    initUser(leaderboard, user);
  });

  const markets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network,
  });
  for (let market of markets) {
    const allUsersForMarket = new Set();
    const allTradesForMarket = [];
    const allTransactions = await getAllTxForMarket(market, network);

    // exctracting trades for market
    allTransactions.slice(1).map((arr) => {
      allTradesForMarket.push(...arr);
    });

    // exctracting mints and excercises for market
    const transactions = allTransactions[0];

    // calculating mints and excercises
    transactions.map((tx) => {
      allUsersForMarket.add(tx.account);
      initUser(leaderboard, tx.account);

      if (tx.type === "mint") {
        processMintTx(leaderboard, market, tx);
      }

      if (tx.type === "exercise") {
        processExcerciseTx(leaderboard, market, tx);
      }
    });

    // calculating trades
    allTradesForMarket.map((trade) => {
      if (isMarketInMaturity(market)) {
        allUsersForMarket.add(trade.maker);
        allUsersForMarket.add(trade.taker);
      }

      initUser(leaderboard, trade.maker);
      processTradeTx(leaderboard, market, trade, trade.maker, trade.makerToken, network);

      initUser(leaderboard, trade.taker);
      processTradeTx(leaderboard, market, trade, trade.taker, trade.takerToken, network);
    });

    // calculating options that were not excercised
    if (isMarketInMaturity(market) && network === 1) {
      await processUnclaimedOptions(market, allUsersForMarket, leaderboard);
    }
  }

  if (network === 1) {
    leaderboardMainnetMap = leaderboard;
  } else {
    leaderboardRopstenMap = leaderboard;
  }

  saveToRedis(leaderboard, network);
}

/**
 * Method that returns all transactions for given market.
 * @param market Market that we want to get transactions for
 * @param Network (1: mainnet, 3: ropsten)
 * @returns
 */
async function getAllTxForMarket(market, network) {
  try {
    return Promise.all([
      thalesData.binaryOptions.optionTransactions({
        network,
        market: market.address,
      }),
      thalesData.binaryOptions.trades({
        network: network,
        makerToken: market.longAddress,
        takerToken: getStableToken(network),
      }),
      thalesData.binaryOptions.trades({
        network: network,
        makerToken: getStableToken(network),
        takerToken: market.longAddress,
      }),
      thalesData.binaryOptions.trades({
        network: network,
        makerToken: market.shortAddress,
        takerToken: getStableToken(network),
      }),
      thalesData.binaryOptions.trades({
        network: network,
        makerToken: getStableToken(network),
        takerToken: market.shortAddress,
      }),
    ]);
  } catch (e) {
    console.log(e);
  }
}

function processMintTx(leaderboard, market, tx) {
  try {
    const leader = leaderboard.get(tx.account);
    const allTimeStats = leader.leaderboard;
    const competitionStats = leader.competition;
    const profile = leader.profile;

    let trades = allTimeStats.trades;
    let volume = allTimeStats.volume;
    let netProfit = allTimeStats.netProfit;
    let investment = allTimeStats.investment;

    if (!addressesToExclude.includes(tx.account.toLowerCase())) {
      volume = volume + tx.amount / 2;
    }

    if (isMarketInMaturity(market)) {
      netProfit = netProfit - tx.amount / 2;
      investment = investment + tx.amount / 2;
    }

    let gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

    const leaderboardAllTimeData = {
      volume,
      trades,
      netProfit,
      investment,
      gain,
    };

    trades = competitionStats.trades;
    volume = competitionStats.volume;
    netProfit = competitionStats.netProfit;
    investment = competitionStats.investment;

    if (isMarketEligibleForCompetition(market)) {
      volume = volume + tx.amount / 2;
      if (isMarketInMaturity(market)) {
        netProfit = netProfit - tx.amount / 2;
        investment = investment + tx.amount / 2;
      }
    }
    gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

    const competitionData = {
      volume,
      trades,
      netProfit,
      investment,
      gain,
    };

    profile.mints.push({ market, tx });

    leaderboard.set(tx.account, {
      leaderboard: leaderboardAllTimeData,
      competition: competitionData,
      profile,
    });
  } catch (e) {
    console.log(e);
  }
}

function processExcerciseTx(leaderboard, market, tx) {
  try {
    const leader = leaderboard.get(tx.account);
    const allTimeStats = leader.leaderboard;
    const competitionStats = leader.competition;
    const profile = leader.profile;

    let volume = allTimeStats.volume;
    let trades = allTimeStats.trades;
    let netProfit = allTimeStats.netProfit + tx.amount;
    let investment = allTimeStats.investment;

    let gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

    const leaderboardAllTimeData = {
      volume,
      trades,
      netProfit,
      investment,
      gain,
    };

    volume = competitionStats.volume;
    trades = competitionStats.trades;
    netProfit = isMarketEligibleForCompetition(market)
      ? competitionStats.netProfit + tx.amount
      : competitionStats.netProfit;
    investment = competitionStats.investment;

    gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

    const competitionData = {
      volume,
      trades,
      netProfit,
      investment,
      gain,
    };

    profile.excercises.push({ market, tx });

    leaderboard.set(tx.account, {
      leaderboard: leaderboardAllTimeData,
      competition: competitionData,
      profile,
    });
  } catch (e) {
    console.log(e);
  }
}

function processTradeTx(leaderboard, market, trade, user, token, network) {
  try {
    const leader = leaderboard.get(user);
    const allTimeStats = leader.leaderboard;
    const competitionStats = leader.competition;
    const profile = leader.profile;

    let volume = Number(allTimeStats.volume + getTradeSizeInSUSD(trade, network));
    let trades = allTimeStats.trades + 1;
    let netProfit = calculateNetProfit(trade, market, network, allTimeStats.netProfit, token);
    let investment = calculateInvestment(trade, network, allTimeStats.investment, token);
    let gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

    const leaderboardAllTimeData = {
      volume,
      trades,
      netProfit,
      investment,
      gain,
    };

    volume = competitionStats.volume;
    trades = competitionStats.trades;
    netProfit = competitionStats.netProfit;
    investment = competitionStats.investment;

    if (isMarketEligibleForCompetition(market)) {
      volume = Number(volume + getTradeSizeInSUSD(trade, network));
      trades = trades + 1;
      if (isMarketInMaturity(market)) {
        netProfit = calculateNetProfit(trade, market, network, competitionStats.netProfit, token);
        investment = calculateInvestment(trade, network, competitionStats.investment, token);
      }
    }

    gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

    const competitionData = {
      volume,
      trades,
      netProfit,
      investment,
      gain,
    };

    profile.trades.push({ market, trade: mapToOptionTransactions(trade, market, network) });

    leaderboard.set(user, {
      leaderboard: leaderboardAllTimeData,
      competition: competitionData,
      profile,
    });
  } catch (e) {
    console.log(e);
  }
}

async function processUnclaimedOptions(market, allUsersForMarket, leaderboard) {
  try {
    await Promise.all(
      [...allUsersForMarket].map(async (user) => {
        initUser(leaderboard, user);
        const leader = leaderboard.get(user);
        const allTimeStats = leader.leaderboard;
        const competitionStats = leader.competition;
        const profile = leader.profile;

        const result = await getBalance(market.address, user);
        const longOptions = Web3Client.utils.fromWei(result.long);
        const shortOptions = Web3Client.utils.fromWei(result.short);

        let volume = allTimeStats.volume;
        let trades = allTimeStats.trades;
        let netProfit = allTimeStats.netProfit;
        let investment = allTimeStats.investment;

        if (market.result === "long") {
          netProfit += Number(longOptions);
        } else {
          netProfit += Number(shortOptions);
        }

        let gain =
          investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

        const leaderboardAllTimeData = {
          volume,
          trades,
          netProfit,
          investment,
          gain,
        };

        volume = competitionStats.volume;
        trades = competitionStats.trades;
        netProfit = competitionStats.netProfit;
        investment = competitionStats.investment;

        if (isMarketEligibleForCompetition(market)) {
          if (market.result === "long") {
            netProfit += Number(longOptions);
          } else {
            netProfit += Number(shortOptions);
          }
        }

        gain = investment > 0 && netProfit !== 0 ? ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1) : 0;

        const competitionStatsNew = {
          volume,
          trades,
          netProfit,
          investment,
          gain,
        };

        if (longOptions > 0 || shortOptions > 0) {
          profile.unclaimed.push({
            market,
            long: longOptions,
            short: shortOptions,
          });
        }

        leaderboard.set(user, {
          leaderboard: leaderboardAllTimeData,
          competition: competitionStatsNew,
          profile,
        });
      }),
    );
  } catch (e) {
    console.log(e);
  }
}

/**
 * Method that will set the user in leaderboard map with initial values.
 * @param {*} leaderboard
 * @param {*} user
 */
function initUser(leaderboard, user) {
  if (!leaderboard.get(user)) {
    leaderboard.set(user, {
      leaderboard: {
        volume: 0,
        trades: 0,
        netProfit: 0,
        investment: 0,
        gain: 0,
      },
      competition: {
        volume: 0,
        trades: 0,
        netProfit: 0,
        investment: 0,
        gain: 0,
      },
      profile: {
        mints: [],
        trades: [],
        excercises: [],
        unclaimed: [],
      },
    });
  }
}

function saveToRedis(leaderboard, network) {
  const array = Array.from(leaderboard);
  const leaderboardMap = new Map();
  const competitionMap = new Map();
  const profilesMap = new Map();

  array.map((data) => {
    leaderboardMap.set(data[0], data[1].leaderboard);
    competitionMap.set(data[0], data[1].competition);
    profilesMap.set(data[0], data[1].profile);
  });
  if (process.env.REDIS_URL) {
    redisClient.set(
      network === 1 ? KEYS.MAINNET_LEADERBOARD : KEYS.ROPSTEN_LEADERBOARD,
      JSON.stringify([...leaderboardMap]),
      function () {},
    );
    redisClient.set(
      network === 1 ? KEYS.MAINNET_COMPETITION : KEYS.ROPSTEN_COMPETITION,
      JSON.stringify([...competitionMap]),
      function () {},
    );
    redisClient.set(
      network === 1 ? KEYS.MAINNET_PROFILES : KEYS.ROPSTEN_PROFILES,
      JSON.stringify([...profilesMap]),
      function () {},
    );
  }
}

function isMarketEligibleForCompetition(market) {
  const marketCreatedAt = new Date(market.timestamp);
  const marketExpiresAt = new Date(market.maturityDate);
  if (marketCreatedAt >= COMPETITION_START_DATE && marketExpiresAt <= COMPETITION_END_DATE) {
    return true;
  }
  return false;
}
const addressesToExclude = [
  "0x461783a831e6db52d68ba2f3194f6fd1e0087e04",
  "0xcae07c9bec312a69856148f9821359d7c27dc51c",
  "0xd558914fa43581584b460bba220f25175bbcf67a",
  "0xd76224d26b01e9733a0e67209929b2eadff67d36",
  "0x6eb3f5d9b8f83fef7411709e0dfb42da9d4a85da",
  "0x6b16d808c4c9055b1d5b121cf100b9126178acb1",
  "0x2a468adaa4080f2c2fe29ea1755ce48dbdc0185b",
  "0x924ef47993be036ebe72be1449d8bef627cd30a2",
];

const marketsForCompetition = [
  "0x6c23b126799ac6e35ed7e46b475db63f66221ef6",
  "0x2f6dd67cbfba9cbcf1ab536296cf6976711bcfcc",
  "0xf585adc6cf19286346d5004cb39805012fa4fadd",
];

const COMPETITION_START_DATE = new Date("Oct 10 2021 10:00:00 UTC");
const COMPETITION_END_DATE = new Date("Nov 01 2021 11:00:00 UTC");

function mapToOptionTransactions(trade, market, network) {
  return {
    timestamp: trade.timestamp,
    hash: trade.transactionHash,
    type: getTradeType(trade, network),
    side: getSidePerTrade(trade, market, network),
    amount: getAmountOfTokens(trade, network),
    price: getPricePerToken(trade, network),
  };
}
