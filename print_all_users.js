const SYNTH_USD_MAINNET = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
const SYNTH_USD_ROPSTEN = "0x21718c0fbd10900565fa57c76e1862cd3f6a4d8e";

require("dotenv").config();
const express = require("express");
const app = express();

var cors = require("cors");
app.use(cors());
app.use(express.json());

app.listen(process.env.PORT || 3002, () => {
  console.log("Server running on port " + (process.env.PORT || 3002));
});

const thalesData = require("thales-data");
const redis = require("redis");
const sigUtil = require("eth-sig-util");
const Web3 = require("web3");
const Web3Client = new Web3(
  new Web3.providers.HttpProvider(process.env.INFURA_URL)
);

let redisClient = null;

let addressesToIgnoreNoCase = [
  "0xD558914fa43581584b460BBa220F25175Bbcf67a",
  "0x6Eb3f5d9B8F83FEF7411709E0DfB42Da9d4a85da",
  "0x38c61e3d2458223aB993ac5A14f8d53c633dff9e",
  "0x924eF47993BE036ebe72Be1449D8Bef627cD30A2",
  "0x2A468AdaA4080f2c2fe29ea1755cE48DbDC0185b",
  "0xd76224d26B01E9733A0e67209929B2EadFf67d36",
  "0x6B16d808C4c9055b1D5b121cF100b9126178AcB1",
];

let addressesToIgnore = [];
addressesToIgnoreNoCase.forEach((a) => {
  addressesToIgnore.push(a.toLowerCase());
});

const fetch = require("node-fetch");

async function processMainnetMarkets() {
  const mainnetOptionsMarkets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network: 1,
  });

  await getLeaderboard(mainnetOptionsMarkets, 1);
}

processMainnetMarkets();

async function getLeaderboard(markets, network) {
  let addressesToPrint = new Set();
  const leaderboard = new Map();

  // const addressForReport = "0xb8d08d9537fc8e5624c298302137c5b5ce2f301d";
  // let index = 0;
  for (let market of markets) {
    // index++;
    // if (network === 1) console.log("index: ", index);
    // let mints = 0;
    // let excercises = 0;
    // let leftToExcercise = 0;
    // let buys = 0;
    // let sells = 0;

    // if (!market.customMarket) {
    //   continue;
    // }
    const allUsersForMarket = new Set();
    const allTradesForMarket = [];
    const tradesPromiseArray = await Promise.all([
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

    tradesPromiseArray.slice(1).map((arr) => {
      allTradesForMarket.push(...arr);
    });

    const transactions = tradesPromiseArray[0];

    transactions.map((tx) => {
      allUsersForMarket.add(tx.account);
      if (!leaderboard.get(tx.account)) {
        leaderboard.set(tx.account, { volume: 0, trades: 0, netProfit: 0 });
      }
      const leader = leaderboard.get(tx.account);
      if (tx.type === "mint") {
        let volume;

        if (addressesToExclude.includes(tx.account.toLowerCase())) {
          volume = leader.volume;
        } else {
          volume = leader.volume + tx.amount / 2;
        }
        const trades = leader.trades;
        let netProfit;
        if (
          "maturity" ==
          getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
        ) {
          // if (network === 1 && tx.account.toLowerCase() === addressForReport) {
          //   mints += tx.amount / 2;
          // }

          netProfit = leader.netProfit - tx.amount / 2;
        } else {
          netProfit = leader.netProfit;
        }

        leaderboard.set(tx.account, {
          volume,
          trades,
          netProfit,
        });
      }

      if (tx.type === "exercise") {
        addressesToPrint.add(tx.account);
        const volume = leader.volume;
        const trades = leader.trades;
        const netProfit = leader.netProfit + tx.amount;

        leaderboard.set(tx.account, {
          volume,
          trades,
          netProfit,
        });
        // if (network === 1 && tx.account.toLowerCase() === addressForReport) {
        //   excercises += tx.amount;
        // }
      }
    });

    allTradesForMarket.map((trade) => {
      if (
        "maturity" ==
        getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
      ) {
        allUsersForMarket.add(trade.maker);
        allUsersForMarket.add(trade.taker);
      }
      if (!leaderboard.get(trade.maker)) {
        leaderboard.set(trade.maker, { volume: 0, trades: 0, netProfit: 0 });
      }

      if (!leaderboard.get(trade.taker)) {
        leaderboard.set(trade.taker, {
          volume: 0,
          trades: 0,
          netProfit: 0,
        });
      }

      let volume = Number(
        leaderboard.get(trade.maker).volume + getTradeSizeInSUSD(trade, network)
      );

      let trades = leaderboard.get(trade.maker).trades + 1;

      let netProfit =
        "maturity" ==
        getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
          ? calculateNetProfit(
              trade,
              network,
              leaderboard.get(trade.maker).netProfit,
              trade.makerToken
            )
          : leaderboard.get(trade.maker).netProfit;

      leaderboard.set(trade.maker, {
        volume,
        trades,
        netProfit,
      });

      // if (
      //   "maturity" ==
      //   getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
      // ) {
      //   if (network === 1 && addressForReport === trade.maker.toLowerCase()) {
      //     if (trade.makerToken === getStableToken(1)) {
      //       buys += getTradeSizeInSUSD(trade, 1);
      //     } else {
      //       sells += getTradeSizeInSUSD(trade, 1);
      //     }
      //   }
      // }

      let amount = Number(
        leaderboard.get(trade.taker).volume + getTradeSizeInSUSD(trade, network)
      );
      trades = leaderboard.get(trade.taker).trades + 1;
      netProfit =
        "maturity" ==
        getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
          ? calculateNetProfit(
              trade,
              network,
              leaderboard.get(trade.taker).netProfit,
              trade.takerToken
            )
          : leaderboard.get(trade.taker).netProfit;
      leaderboard.set(trade.taker, {
        volume: amount,
        trades,
        netProfit,
      });
    });

    if (
      "maturity" ==
        getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase &&
      network === 1
    ) {
      await Promise.all(
        [...allUsersForMarket].map(async (user) => {
          if (!leaderboard.get(user)) {
            leaderboard.set(user, { volume: 0, trades: 0, netProfit: 0 });
          }
          const result = await getBalance(market.address, user);
          const longOptions = Web3Client.utils.fromWei(result.long);
          const shortOptions = Web3Client.utils.fromWei(result.short);
          const leader = leaderboard.get(user);
          let profit = Number(leader.netProfit);
          if (market.result === "long") {
            profit += Number(longOptions);
            // if (user.toLowerCase() === addressForReport) {
            //   leftToExcercise += Number(longOptions);
            // }
          } else {
            profit += Number(shortOptions);
            // if (user.toLowerCase() === addressForReport) {
            //   leftToExcercise += Number(shortOptions);
            // }
          }
          leaderboard.set(user, {
            volume: leader.volume,
            trades: leader.trades,
            netProfit: profit,
          });
        })
      );
    }
  }
  // console.log("Olympic winners are:");
  // addressesToPrint.forEach((a) => {
  //   if (!addressesToIgnore.includes(a.toLowerCase())) {
  //     console.log(a);
  //   }
  // });
  console.log("All olympic users are:");
  leaderboard.forEach((value, key) => {
    if (!addressesToIgnore.includes(key)) {
      console.log(key);
    }
  });
  return leaderboard;
}

function getStableToken(network) {
  return network === 1 ? SYNTH_USD_MAINNET : SYNTH_USD_ROPSTEN;
}

function getTradeSizeInSUSD(trade, network) {
  return trade.makerToken === getStableToken(network)
    ? trade.makerAmount
    : trade.takerAmount;
}

function calculateNetProfit(trade, network, currentProfit, token) {
  return token === getStableToken(network)
    ? currentProfit - getTradeSizeInSUSD(trade, network)
    : currentProfit + getTradeSizeInSUSD(trade, network);
}

function getPhaseAndEndDate(maturityDate, expiryDate) {
  const now = Date.now();

  if (maturityDate > now) {
    return {
      phase: "trading",
      timeRemaining: maturityDate,
    };
  }

  if (expiryDate > now) {
    return {
      phase: "maturity",
      timeRemaining: expiryDate,
    };
  }

  return {
    phase: "expiry",
    timeRemaining: expiryDate,
  };
}

const balanceAbi = [
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balancesOf",
    outputs: [
      {
        internalType: "uint256",
        name: "long",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "short",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

async function getBalance(marketAddress, walletAddress) {
  const contract = new Web3Client.eth.Contract(balanceAbi, marketAddress);
  try {
    const result = await contract.methods.balancesOf(walletAddress).call();
    return result;
  } catch (e) {
    console.log(e);
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
