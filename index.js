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

let redisClient = null;

let mainnetOptionsMap = new Map();
let ropstenOptionsMap = new Map();
let mainnetWatchlistMap = new Map();
let ropstenWatchlistMap = new Map();
let leaderboardMainnetMap = new Map();
let leaderboardRopstenMap = new Map();
let displayNameMap = new Map();

const fetch = require("node-fetch");

app.get("/options/:networkParam/:addressParam", (req, res) => {
  let add = req.params.addressParam;
  let network = req.params.networkParam;
  if (network == 1) {
    if (mainnetOptionsMap.has(add)) {
      res.send(mainnetOptionsMap.get(add) + "");
    } else res.send("0");
  } else {
    if (ropstenOptionsMap.has(add)) {
      res.send(ropstenOptionsMap.get(add) + "");
    } else res.send("0");
  }
});

app.get("/watchlist/:networkParam/:walletAddressParam", (req, res) => {
  let walletAddress = req.params.walletAddressParam;
  let network = req.params.networkParam;
  if (network == 1) {
    res.send({ data: mainnetWatchlistMap.get(walletAddress) });
  } else {
    res.send({ data: ropstenWatchlistMap.get(walletAddress) });
  }
});

app.get("/leaderboard/:networkParam", (req, res) => {
  let network = req.params.networkParam;
  if (network == 1) {
    res.send({ data: Array.from(leaderboardMainnetMap) });
  } else {
    res.send({ data: Array.from(leaderboardRopstenMap) });
  }
});

app.get("/display-name/", (req, res) => {
  res.send({ data: Array.from(displayNameMap) });
});

app.get("/display-name/:walletAddress", (req, res) => {
  let walletAddress = req.params.walletAddress;
  res.send({ name: displayNameMap.get(walletAddress) });
});

app.post("/display-name", (req, res) => {
  const walletAddress = req.body.walletAddress;
  const displayName = req.body.displayName;
  const signature = req.body.signature;

  const recovered = sigUtil.recoverPersonalSignature({
    data: displayName,
    sig: signature,
  });

  if (recovered.toLowerCase() === walletAddress.toLowerCase()) {
    displayNameMap.set(walletAddress.toLowerCase(), displayName);
    redisClient.set(
      "displayNameMap",
      JSON.stringify([...displayNameMap]),
      function () {}
    );
    res.send({ name: displayNameMap.get(walletAddress) });
  }
});

app.post("/watchlist", (req, res) => {
  const network = req.body.networkId;
  const walletAddress = req.body.walletAddress;
  const marketAddress = req.body.marketAddress;

  if (network == 1) {
    let walletMarkets = mainnetWatchlistMap.get(walletAddress);
    if (walletMarkets) {
      if (!walletMarkets.includes(marketAddress)) {
        walletMarkets.push(marketAddress);
      } else {
        walletMarkets.splice(walletMarkets.indexOf(marketAddress), 1);
      }
    } else {
      walletMarkets = [];
      walletMarkets.push(marketAddress);
    }

    mainnetWatchlistMap.set(walletAddress, walletMarkets);
    redisClient.set(
      "mainnetWatchlistMap",
      JSON.stringify([...mainnetWatchlistMap]),
      function () {}
    );
    res.send({ data: mainnetWatchlistMap.get(walletAddress) });
  } else {
    let walletMarkets = ropstenWatchlistMap.get(walletAddress);
    if (walletMarkets) {
      if (!walletMarkets.includes(marketAddress)) {
        walletMarkets.push(marketAddress);
      } else {
        walletMarkets.splice(walletMarkets.indexOf(marketAddress), 1);
      }
    } else {
      walletMarkets = [];
      walletMarkets.push(marketAddress);
    }

    ropstenWatchlistMap.set(walletAddress, walletMarkets);
    redisClient.set(
      "ropstenWatchlistMap",
      JSON.stringify([...ropstenWatchlistMap]),
      function () {}
    );
    res.send({ data: ropstenWatchlistMap.get(walletAddress) });
  }
});

app.get("/", (req, res) => {
  res.sendStatus(200);
});
if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");
  redisClient.on("error", function (error) {
    console.error(error);
  });

  redisClient.get("mainnetOptionsMap", function (err, obj) {
    mainnetOptionsMapRaw = obj;
    console.log("mainnetOptionsMapRaw:" + mainnetOptionsMapRaw);
    if (mainnetOptionsMapRaw) {
      mainnetOptionsMap = new Map(JSON.parse(mainnetOptionsMapRaw));
      console.log("mainnetOptionsMap:" + mainnetOptionsMap);
    }
  });

  redisClient.get("ropstenOptionsMap", function (err, obj) {
    ropstenOptionsMapRaw = obj;
    console.log("ropstenOptionsMapRaw:" + ropstenOptionsMapRaw);
    if (ropstenOptionsMapRaw) {
      ropstenOptionsMap = new Map(JSON.parse(ropstenOptionsMapRaw));
      console.log("ropstenOptionsMap:" + ropstenOptionsMap);
    }
  });

  redisClient.get("ropstenWatchlistMap", function (err, obj) {
    ropstenWatchlistMapRaw = obj;
    console.log("ropstenWatchlistMap:" + ropstenWatchlistMapRaw);
    if (ropstenWatchlistMapRaw) {
      ropstenWatchlistMap = new Map(JSON.parse(ropstenWatchlistMapRaw));
      console.log("ropstenWatchlistMap:" + ropstenWatchlistMap);
    }
  });

  redisClient.get("mainnetWatchlistMap", function (err, obj) {
    mainnetWatchlistMapRaw = obj;
    console.log("mainnetWatchlistMapRaw:" + mainnetWatchlistMapRaw);
    if (mainnetWatchlistMapRaw) {
      mainnetWatchlistMap = new Map(JSON.parse(mainnetWatchlistMapRaw));
      console.log("ropstenWatchlistMap:" + mainnetWatchlistMap);
    }
  });

  redisClient.get("mainnetLeaderboardMap", function (err, obj) {
    mainnetLeaderboardMapRaw = obj;
    console.log("mainnetLeaderboardMap:" + mainnetLeaderboardMapRaw);
    if (mainnetLeaderboardMapRaw) {
      leaderboardMainnetMap = new Map(JSON.parse(mainnetLeaderboardMapRaw));
    }
  });

  redisClient.get("ropstenLeaderboardMap", function (err, obj) {
    ropstenLeaderboardMapRaw = obj;
    console.log("ropstenLeaderboardMap:" + ropstenLeaderboardMapRaw);
    if (ropstenLeaderboardMapRaw) {
      leaderboardRopstenMap = new Map(JSON.parse(ropstenLeaderboardMapRaw));
    }
  });

  redisClient.get("displayNameMap", function (err, obj) {
    displayNameMapRaw = obj;
    console.log("displayNameMap:" + displayNameMapRaw);
    if (displayNameMapRaw) {
      displayNameMap = new Map(JSON.parse(displayNameMapRaw));
    }
  });
}

async function processMainnetMarkets() {
  const mainnetOptionsMarkets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network: 1,
  });

  leaderboardMainnetMap = await getLeaderboard(mainnetOptionsMarkets, 1);

  if (process.env.REDIS_URL) {
    redisClient.set(
      "mainnetLeaderboardMap",
      JSON.stringify([...leaderboardMainnetMap]),
      function () {}
    );
  }
  for (const o of mainnetOptionsMarkets) {
    if ("trading" == getPhaseAndEndDate(o.maturityDate, o.expiryDate).phase) {
      try {
        let ordersCount = 0;
        let baseUrl = "https://api.0x.org/sra/v4/";
        let response = await fetch(
          baseUrl +
            `orderbook?baseToken=` +
            o.longAddress +
            "&quoteToken=" +
            "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51"
        );
        let responseJ = await response.json();
        const totalLong = responseJ.bids.total + responseJ.asks.total;

        response = await fetch(
          baseUrl +
            `orderbook?baseToken=` +
            o.shortAddress +
            "&quoteToken=" +
            "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51"
        );
        responseJ = await response.json();
        const totalShort = responseJ.bids.total + responseJ.asks.total;

        ordersCount = totalLong + totalShort;

        mainnetOptionsMap.set(o.address, ordersCount);
        if (process.env.REDIS_URL) {
          redisClient.set(
            "mainnetOptionsMap",
            JSON.stringify([...mainnetOptionsMap]),
            function () {}
          );
        }
      } catch (e) {
        mainnetOptionsMap.set(o.address, 0);
        if (process.env.REDIS_URL) {
          redisClient.set(
            "mainnetOptionsMap",
            JSON.stringify([...mainnetOptionsMap]),
            function () {}
          );
        }
      }
    }
  }
}

async function processRopstenMarkets() {
  const ropstenOptionsMarkets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network: 3,
  });

  leaderboardRopstenMap = await getLeaderboard(ropstenOptionsMarkets, 3);

  if (process.env.REDIS_URL) {
    redisClient.set(
      "ropstenLeaderboardMap",
      JSON.stringify([...leaderboardRopstenMap]),
      function () {}
    );
  }

  for (const o of ropstenOptionsMarkets) {
    if ("trading" == getPhaseAndEndDate(o.maturityDate, o.expiryDate).phase) {
      try {
        let ordersCount = 0;
        let baseUrl = "https://ropsten.api.0x.org/sra/v4/";
        let response = await fetch(
          baseUrl +
            `orderbook?baseToken=` +
            o.longAddress +
            "&quoteToken=" +
            "0x21718C0FbD10900565fa57C76e1862cd3F6a4d8E"
        );
        let responseJ = await response.json();
        const totalLong = responseJ.bids.total + responseJ.asks.total;

        response = await fetch(
          baseUrl +
            `orderbook?baseToken=` +
            o.shortAddress +
            "&quoteToken=" +
            "0x21718C0FbD10900565fa57C76e1862cd3F6a4d8E"
        );
        responseJ = await response.json();
        const totalShort = responseJ.bids.total + responseJ.asks.total;

        ordersCount = totalLong + totalShort;

        ropstenOptionsMap.set(o.address, ordersCount);
        if (process.env.REDIS_URL) {
          redisClient.set(
            "ropstenOptionsMap",
            JSON.stringify([...ropstenOptionsMap]),
            function () {}
          );
        }
      } catch (e) {
        ropstenOptionsMap.set(o.address, 0);
        if (process.env.REDIS_URL) {
          redisClient.set(
            "ropstenOptionsMap",
            JSON.stringify([...ropstenOptionsMap]),
            function () {}
          );
        }
      }
    }
  }
}

setTimeout(processMainnetMarkets, 1000 * 3);
setInterval(processMainnetMarkets, 1000 * 30);

setTimeout(processRopstenMarkets, 1000 * 3);
setInterval(processRopstenMarkets, 1000 * 30);

async function getLeaderboard(markets, network) {
  const leaderboard = new Map();

  await Promise.all(
    markets.map(async (market) => {
      const trades0 = await thalesData.binaryOptions.trades({
        network: network,
        makerToken: market.longAddress,
        takerToken: getStableToken(network),
      });
      const trades2 = await thalesData.binaryOptions.trades({
        network: network,
        makerToken: getStableToken(network),
        takerToken: market.longAddress,
      });

      const trades1 = await thalesData.binaryOptions.trades({
        network: network,
        makerToken: market.shortAddress,
        takerToken: getStableToken(network),
      });

      const trades3 = await thalesData.binaryOptions.trades({
        network: network,
        makerToken: getStableToken(network),
        takerToken: market.shortAddress,
      });

      const transactions = await thalesData.binaryOptions.optionTransactions({
        network,
        market: market.address,
      });

      const mintsForMarket = transactions.filter(
        (tx) =>
          tx.type === "mint" &&
          !addressesToExclude.includes(tx.account.toLowerCase())
      );

      const excercisesForMarket = transactions.filter(
        (tx) =>
          tx.type === "exercise" &&
          !addressesToExclude.includes(tx.account.toLowerCase())
      );

      mintsForMarket.map((tx) => {
        if (!leaderboard.get(tx.account)) {
          leaderboard.set(tx.account, { volume: 0, trades: 0, netProfit: 0 });
        }
        const leader = leaderboard.get(tx.account);

        const volume = leader.volume + tx.amount / 2;
        const trades = leader.trades;
        let netProfit;
        if (
          "maturity" ==
          getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
        ) {
          netProfit = leader.netProfit - tx.amount / 2;
        } else {
          netProfit = leader.netProfit;
        }

        leaderboard.set(tx.account, {
          volume,
          trades,
          netProfit,
        });
      });

      excercisesForMarket.map((tx) => {
        if (!leaderboard.get(tx.account)) {
          leaderboard.set(tx.account, { volume: 0, trades: 0, netProfit: 0 });
        }
        const leader = leaderboard.get(tx.account);

        const volume = leader.volume;
        const trades = leader.trades;
        const netProfit = leader.netProfit + tx.amount;

        leaderboard.set(tx.account, {
          volume,
          trades,
          netProfit,
        });
      });

      const allTradesForMarket = [
        ...trades0,
        ...trades1,
        ...trades2,
        ...trades3,
      ];

      allTradesForMarket.map((trade) => {
        if (!leaderboard.get(trade.maker)) {
          leaderboard.set(trade.maker, { volume: 0, trades: 0, netProfit: 0 });
        }

        let volume = Number(
          leaderboard.get(trade.maker).volume +
            getTradeSizeInSUSD(trade, network)
        );

        let trades = leaderboard.get(trade.maker).trades + 1;

        let netProfit = calculateNetProfit(
          trade,
          network,
          leaderboard.get(trade.maker).netProfit,
          trade.makerToken
        );

        leaderboard.set(trade.maker, {
          volume,
          trades,
          netProfit,
        });

        if (!leaderboard.get(trade.taker)) {
          leaderboard.set(trade.taker, { volume: 0, trades: 0, netProfit: 0 });
        }
        volume = Number(
          leaderboard.get(trade.taker).volume +
            getTradeSizeInSUSD(trade, network)
        );
        trades = leaderboard.get(trade.taker).trades + 1;
        netProfit = calculateNetProfit(
          trade,
          network,
          leaderboard.get(trade.taker).netProfit,
          trade.takerToken
        );
        leaderboard.set(trade.taker, {
          volume,
          trades,
          netProfit,
        });
      });
    })
  );
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
