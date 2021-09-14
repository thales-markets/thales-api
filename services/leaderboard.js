const KEYS = require("../redis/redis-keys");

const {
  getStableToken,
  getPhaseAndEndDate,
  getTradeSizeInSUSD,
  calculateNetProfit,
  calculateInvestment,
  getBalance,
} = require("../services/utils");

async function processLeaderboard(markets, network) {
  const leaderboard = new Map();

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
      if (
        "maturity" ==
        getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
      ) {
        allUsersForMarket.add(trade.maker);
        allUsersForMarket.add(trade.taker);
      }

      initUser(leaderboard, trade.maker);
      processTradeTx(
        leaderboard,
        market,
        trade,
        trade.maker,
        trade.makerToken,
        network
      );

      initUser(leaderboard, trade.taker);
      processTradeTx(
        leaderboard,
        market,
        trade,
        trade.taker,
        trade.takerToken,
        network
      );
    });

    // calculating options that were not excercised
    if (
      "maturity" ==
        getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase &&
      network === 1
    ) {
      await processUnclaimedOptions(market, allUsersForMarket, leaderboard);
    }
  }

  if (network === 1) {
    leaderboardMainnetMap = leaderboard;
  } else {
    leaderboardRopstenMap = leaderboard;
  }

  if (process.env.REDIS_URL) {
    redisClient.set(
      network === 1 ? KEYS.MAINNET_LEADERBOARD : KEYS.ROPSTEN_LEADERBOARD,
      JSON.stringify([...leaderboard]),
      function () {}
    );
  }
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
    const trades = leader.trades;
    const profile = leader.profile;
    let volume;
    let netProfit;
    let investment;

    if (addressesToExclude.includes(tx.account.toLowerCase())) {
      volume = leader.volume;
    } else {
      volume = leader.volume + tx.amount / 2;
    }

    if (
      "maturity" ==
      getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
    ) {
      netProfit = leader.netProfit - tx.amount / 2;
      investment = leader.investment + tx.amount / 2;
    } else {
      investment = leader.investment;
      netProfit = leader.netProfit;
    }
    const gain = ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(
      1
    );

    profile.mints.push({ market, tx });

    leaderboard.set(tx.account, {
      volume,
      trades,
      netProfit,
      investment,
      gain,
      profile,
    });
  } catch (e) {
    console.log(e);
  }
}

function processExcerciseTx(leaderboard, market, tx) {
  try {
    const leader = leaderboard.get(tx.account);
    const volume = leader.volume;
    const trades = leader.trades;
    const netProfit = leader.netProfit + tx.amount;
    const investment = leader.investment;
    const profile = leader.profile;
    const gain = ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(
      1
    );

    profile.excercises.push({ market, tx });

    leaderboard.set(tx.account, {
      volume,
      trades,
      netProfit,
      investment,
      gain,
      profile,
    });
  } catch (e) {
    console.log(e);
  }
}

function processTradeTx(leaderboard, market, trade, user, token, network) {
  try {
    const volume = Number(
      leaderboard.get(user).volume + getTradeSizeInSUSD(trade, network)
    );
    const trades = leaderboard.get(user).trades + 1;
    const profile = leaderboard.get(user).profile;
    const netProfit =
      "maturity" ==
      getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
        ? calculateNetProfit(
            trade,
            network,
            leaderboard.get(user).netProfit,
            token
          )
        : leaderboard.get(user).netProfit;

    const investment =
      "maturity" ==
      getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
        ? calculateInvestment(
            trade,
            network,
            leaderboard.get(user).investment,
            token
          )
        : leaderboard.get(user).investment;

    profile.trades.push({ market, trade });

    leaderboard.set(user, {
      volume,
      trades,
      netProfit,
      investment,
      gain: ((parseInt(netProfit) / parseInt(investment)) * 100).toFixed(1),
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
        const result = await getBalance(market.address, user);
        const longOptions = Web3Client.utils.fromWei(result.long);
        const shortOptions = Web3Client.utils.fromWei(result.short);
        const leader = leaderboard.get(user);
        const profile = leader.profile;
        let profit = Number(leader.netProfit);
        if (market.result === "long") {
          profit += Number(longOptions);
        } else {
          profit += Number(shortOptions);
        }

        if (longOptions > 0 || shortOptions > 0) {
          profile.unclaimed.push({
            market,
            long: longOptions,
            short: shortOptions,
          });
        }

        leaderboard.set(user, {
          volume: leader.volume,
          trades: leader.trades,
          netProfit: profit,
          investment: leader.investment,
          gain: (
            (parseInt(profit) / parseInt(leader.investment)) *
            100
          ).toFixed(3),
          profile,
        });
      })
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
      volume: 0,
      trades: 0,
      netProfit: 0,
      investment: 0,
      gain: 0,
      profile: {
        mints: [],
        trades: [],
        excercises: [],
        unclaimed: [],
      },
    });
  }
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

module.exports = processLeaderboard;
