require("dotenv").config();
const express = require("express");
const app = express();

var cors = require("cors");
app.use(cors());
app.use(express.json());

const ENDPOINTS = require("./endpoints");
const sigUtil = require("eth-sig-util");
const KEYS = require("../redis/redis-keys");

app.listen(process.env.PORT || 3002, () => {
  console.log("Server running on port " + (process.env.PORT || 3002));
});

app.get(ENDPOINTS.ROOT, (req, res) => {
  res.sendStatus(200);
});

app.get(ENDPOINTS.OPTIONS, (req, res) => {
  const add = req.params.addressParam;
  const network = req.params.networkParam;
  if (network == 1) {
    redisClient.get(KEYS.MAINNET_ORDERS, function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      if (orders.has(add)) {
        res.send(orders.get(add) + "");
      } else res.send("0");
    });
  } else {
    redisClient.get(KEYS.ROPSTEN_ORDERS, function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      if (orders.has(add)) {
        res.send(orders.get(add) + "");
      } else res.send("0");
    });
  }
});

app.get(ENDPOINTS.ORDERS, (req, res) => {
  const network = req.params.networkParam;
  if (network == 1) {
    redisClient.get(KEYS.MAINNET_ORDERS, function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      res.send(Array.from(orders));
    });
  } else {
    redisClient.get(KEYS.ROPSTEN_ORDERS, function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      res.send(Array.from(orders));
    });
  }
});

app.get(ENDPOINTS.WATCHLIST_ADDRESS, (req, res) => {
  const walletAddress = req.params.walletAddressParam;
  const network = req.params.networkParam;
  if (network == 1) {
    res.send({ data: mainnetWatchlistMap.get(walletAddress) });
  } else {
    res.send({ data: ropstenWatchlistMap.get(walletAddress) });
  }
});

app.get(ENDPOINTS.TWITTER_ADDRESS, (req, res) => {
  let walletAddress = req.params.walletAddress;
  redisClient.get(KEYS.TWITTER_ACCOUNTS, function (err, obj) {
    const twitterAccMap = new Map(JSON.parse(obj));
    res.send(twitterAccMap.get(walletAddress));
  });
});

app.get(ENDPOINTS.TWITTER, (req, res) => {
  redisClient.get(KEYS.TWITTER_ACCOUNTS, function (err, obj) {
    const twitterAccMap = new Map(JSON.parse(obj));
    res.send(Array.from(twitterAccMap));
  });
});

app.get(ENDPOINTS.THALES_ROYALE, (req, res) => {
  redisClient.get(KEYS.DISCORD_USERS, function (err, obj) {
    const discordData = new Map(JSON.parse(obj));
    res.send(Array.from(discordData));
  });
});

app.get(ENDPOINTS.LEADERBOARD, (req, res) => {
  const network = req.params.networkParam;
  if (network == 1) {
    redisClient.get(KEYS.MAINNET_LEADERBOARD, function (err, obj) {
      const leaderboard = new Map(JSON.parse(obj));
      res.send(Array.from(leaderboard));
    });
  } else {
    redisClient.get(KEYS.ROPSTEN_LEADERBOARD, function (err, obj) {
      const leaderboard = new Map(JSON.parse(obj));
      res.send(Array.from(leaderboard));
    });
  }
});

app.get(ENDPOINTS.COMPETITION, (req, res) => {
  const network = req.params.networkParam;
  if (network == 1) {
    redisClient.get(KEYS.MAINNET_COMPETITION, function (err, obj) {
      const competition = new Map(JSON.parse(obj));
      res.send(Array.from(competition));
    });
  } else {
    redisClient.get(KEYS.ROPSTEN_COMPETITION, function (err, obj) {
      const competition = new Map(JSON.parse(obj));
      res.send(Array.from(competition));
    });
  }
});

app.get(ENDPOINTS.PROFILES, (req, res) => {
  const network = req.params.networkParam;
  if (network == 1) {
    redisClient.get(KEYS.MAINNET_PROFILES, function (err, obj) {
      const profiles = new Map(JSON.parse(obj));
      res.send(Array.from(profiles));
    });
  } else {
    redisClient.get(KEYS.ROPSTEN_PROFILES, function (err, obj) {
      const profiles = new Map(JSON.parse(obj));
      res.send(Array.from(profiles));
    });
  }
});

app.get(ENDPOINTS.TOKEN_PRICE, (req, res) => {
  redisClient.get(KEYS.TOKEN, function (err, obj) {
    const tokenMap = new Map(JSON.parse(obj));
    res.send(tokenMap.get("price") + "");
  });
});

app.get(ENDPOINTS.TOKEN_SUPLY, (req, res) => {
  redisClient.get(KEYS.TOKEN, function (err, obj) {
    const tokenMap = new Map(JSON.parse(obj));
    res.send(tokenMap.get("circulatingsupply") + "");
  });
});

app.get(ENDPOINTS.TOKEN_CAP, (req, res) => {
  redisClient.get(KEYS.TOKEN, function (err, obj) {
    const tokenMap = new Map(JSON.parse(obj));
    res.send(tokenMap.get("marketcap") + "");
  });
});

app.get(ENDPOINTS.DISPLAY_NAME, (req, res) => {
  res.send({ data: Array.from(displayNameMap) });
});

app.get(ENDPOINTS.DISPLAY_NAME_ADDRESS, (req, res) => {
  let walletAddress = req.params.walletAddress;
  res.send({ name: displayNameMap.get(walletAddress) });
});

app.post(ENDPOINTS.DISPLAY_NAME, (req, res) => {
  const walletAddress = req.body.walletAddress;
  const displayName = req.body.displayName;
  const signature = req.body.signature;

  const recovered = sigUtil.recoverPersonalSignature({
    data: displayName,
    sig: signature,
  });

  if (recovered.toLowerCase() === walletAddress.toLowerCase()) {
    displayNameMap.set(walletAddress.toLowerCase(), displayName);
    redisClient.set("displayNameMap", JSON.stringify([...displayNameMap]), function () {});
    res.send({ name: displayNameMap.get(walletAddress) });
  }
});

app.get(ENDPOINTS.AUTH, (req, res) => {
  const walletAddress = req.params.walletAddress.toLowerCase();
  redisClient.get(KEYS.VERIFIED_ACCOUNTS, function (err, obj) {
    const verifiedUsers = new Set(JSON.parse(obj));
    res.send(verifiedUsers.has(walletAddress));
  });
});

app.get(ENDPOINTS.VERIFIED_USERS, (req, res) => {
  redisClient.get(KEYS.VERIFIED_ACCOUNTS, function (err, obj) {
    res.send(obj);
  });
});

app.post(ENDPOINTS.WATCHLIST, (req, res) => {
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
    redisClient.set("mainnetWatchlistMap", JSON.stringify([...mainnetWatchlistMap]), function () {});
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
    redisClient.set("ropstenWatchlistMap", JSON.stringify([...ropstenWatchlistMap]), function () {});
    res.send({ data: ropstenWatchlistMap.get(walletAddress) });
  }
});

app.get(ENDPOINTS.ETH_BURNED, (req, res) => {
  redisClient.get(KEYS.TOKEN, function (err, obj) {
    const tokenMap = new Map(JSON.parse(obj));
    res.send(JSON.parse(tokenMap.get("ethburned")));
  });
});
