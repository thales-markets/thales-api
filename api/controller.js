require("dotenv").config();
const express = require("express");
const request = require("request");
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
    redisClient.get(KEYS.OPTIMISM_ORDERS, function (err, obj) {
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
    redisClient.get(KEYS.OPTIMISM_ORDERS, function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      res.send(Array.from(orders));
    });
  }
});

app.get(ENDPOINTS.RANGED_LIQUIDITY, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 69, 420, 137, 80001, 56, 42161].includes(Number(network))) {
    redisClient.get(KEYS.RANGED_AMM_LIQUIDITY[network], function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      res.send(Array.from(orders));
    });
  } else {
    res.send("Bad Network");
  }
});

app.get(ENDPOINTS.DISCOUNTS, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 420, 137, 42161].includes(Number(network))) {
    redisClient.get(KEYS.DISCOUNTS[network], function (err, obj) {
      const orders = new Map(JSON.parse(obj));
      res.send(Array.from(orders));
    });
  } else {
    res.send("Bad Network");
  }
});

app.get(ENDPOINTS.OP_REWARDS, (req, res) => {
  const network = req.params.networkParam;
  const period = req.params.period;
  if ([10, 69].includes(Number(network)) && [0, 1, 2, 3, 4, 5, 6, 7].includes(Number(period))) {
    redisClient.get(KEYS.OP_REWARDS[network], function (err, obj) {
      const rewards = new Map(JSON.parse(obj));
      try {
        res.send(Array.from(rewards.get(Number(period))));
      } catch (e) {
        console.log(e);
      }
    });
  } else {
    res.send("Bad Network or bad period");
  }
});

app.get(ENDPOINTS.OVERTIME_REWARDS, (req, res) => {
  const network = req.params.networkParam;
  const period = req.params.period;
  if ([10, 42].includes(Number(network)) && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(Number(period))) {
    redisClient.get(KEYS.OVERTIME_REWARDS[network], function (err, obj) {
      const rewards = new Map(JSON.parse(obj));
      try {
        res.send(rewards.get(Number(period)));
      } catch (e) {
        console.log(e);
      }
    });
  } else {
    res.send("Bad Network or bad period");
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

app.get(ENDPOINTS.ROYALE_USERS, (req, res) => {
  redisClient.get(KEYS.ROYALE_USERS, function (err, obj) {
    const royaleUsersData = new Map(JSON.parse(obj));
    res.send(Array.from(royaleUsersData));
  });
});

app.post(ENDPOINTS.ROYALE_USER_DATA, (req, res) => {
  const walletAddress = req.body.walletAddress;
  const name = req.body.name;
  const avatar = req.body.avatar;
  const signature = req.body.signature;

  const recovered = sigUtil.recoverPersonalSignature({
    data: name,
    sig: signature,
  });

  if (recovered.toLowerCase() === walletAddress.toLowerCase()) {
    const userData = { name: name, avatar: avatar };
    royaleUsersDataMap.set(walletAddress.toLowerCase(), userData);
    redisClient.set(KEYS.ROYALE_USERS, JSON.stringify([...royaleUsersDataMap]), function () {});
    res.send({ name: royaleUsersDataMap.get(walletAddress) });
  }
});

app.get(ENDPOINTS.ROYALE_USER, (req, res) => {
  const walletAddress = req.params.walletAddress;
  const user = royaleUsersDataMap.get(walletAddress.toLowerCase());

  res.send({ user: user });
});

app.get(ENDPOINTS.LEADERBOARD, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 69, 137, 80001].includes(Number(network))) {
    redisClient.get(KEYS.LEADERBOARD[network], function (err, obj) {
      res.send(obj);
    });
  } else {
    res.send("Bad Network");
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

app.post(ENDPOINTS.GAME_STARTED, (req, res) => {
  const walletAddress = req.body.walletAddress;
  let gameStartedCount = gameFinishersMap.get("gameStartedCount") || 0;
  gameFinishersMap.set("gameStartedCount", gameStartedCount + 1);

  if (walletAddress) {
    const userObject = gameFinishersMap.get(walletAddress);
    gameFinishersMap.set(walletAddress, { ...userObject, startedTime: Date.now() });
  }

  redisClient.set(KEYS.GAME_FINISHERS, JSON.stringify([...gameFinishersMap]), function () {});
  res.send();
});

app.post(ENDPOINTS.GAME_ENDED, (req, res) => {
  const walletAddress = req.body.walletAddress;
  let gameFinishedCount = gameFinishersMap.get("gameFinishedCount") || 0;
  gameFinishersMap.set("gameFinishedCount", gameFinishedCount + 1);

  if (walletAddress) {
    const userObject = gameFinishersMap.get(walletAddress);
    const endedTime = Date.now();
    gameFinishersMap.set(walletAddress, {
      ...userObject,
      endedTime,
      finished: userObject.finished || endedTime - userObject.startedTime > 120000,
    });
  }

  redisClient.set(KEYS.GAME_FINISHERS, JSON.stringify([...gameFinishersMap]), function () {});
  res.send();
});

app.get(ENDPOINTS.GAME_FINISHERS, (req, res) => {
  res.send(Array.from(gameFinishersMap));
});

app.get(ENDPOINTS.MEDIUM, (req, res) => {
  request({ url: "https://medium.com/feed/@thalesmarket" }, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: "error", message: error.message });
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", "application/rss+xml");
    res.send(Buffer.from(body));
  });
});
