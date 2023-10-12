require("dotenv").config();
const express = require("express");
const request = require("request");
const app = express();

var cors = require("cors");
app.use(cors());
app.use(express.json());
app.use(function (req, res, next) {
  for (var key in req.query) {
    req.query[key.toLowerCase()] = req.query[key];
  }
  next();
});

const ENDPOINTS = require("./endpoints");
const sigUtil = require("eth-sig-util");
const KEYS = require("../redis/redis-keys");
const { uniqBy, groupBy } = require("lodash");

const users = require("../overtimeApi/source/users");
const quotes = require("../overtimeApi/source/quotes");
const { isNumeric } = require("../overtimeApi/utils/general");
const { COLLATERALS } = require("../overtimeApi/constants/collaterals");
const { getNonDefaultCollateralSymbols } = require("../overtimeApi/utils/collaterals");

app.listen(process.env.PORT || 3002, () => {
  console.log("Server running on port " + (process.env.PORT || 3002));
});

app.get(ENDPOINTS.ROOT, (req, res) => {
  res.sendStatus(200);
});

app.get(ENDPOINTS.OP_REWARDS, (req, res) => {
  const network = req.params.networkParam;
  const period = req.params.period;
  if (
    [10, 69].includes(Number(network)) &&
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(Number(period))
  ) {
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

app.get(ENDPOINTS.OP_REWARDS_V2, (req, res) => {
  const network = req.params.networkParam;
  const period = req.params.period;
  if (
    [10].includes(Number(network)) &&
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(Number(period))
  ) {
    redisClient.get(KEYS.OP_REWARDS_V2[network], function (err, obj) {
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
  if ([10, 42].includes(Number(network))) {
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

app.get(ENDPOINTS.PARLAY_LEADERBOARD, (req, res) => {
  const network = req.params.networkParam;
  const period = req.params.period;
  if ([10, 420, 8453, 42161].includes(Number(network))) {
    redisClient.get(KEYS.PARLAY_LEADERBOARD[network], function (err, obj) {
      const rewards = new Map(JSON.parse(obj));
      try {
        res.send(rewards.get(Number(period)));
      } catch (e) {
        console.log(e);
      }
    });
  } else {
    res.send("Bad Network ");
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

app.get(ENDPOINTS.BANNERS, async (req, res) => {
  const network = req.params.networkParam;
  var banners = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/dev/src/assets/images/banner/${network}.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.BANNERS_IMAGE, (req, res) => {
  const imageName = req.params.imageName;
  var url = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/dev/src/assets/images/banner/${imageName}`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.THALES_BANNERS, async (req, res) => {
  const network = req.params.networkParam;
  var banners = `https://raw.githubusercontent.com/thales-markets/thales-dapp/dev/src/assets/images/banner/${network}.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.THALES_BANNERS_IMAGE, (req, res) => {
  const imageName = req.params.imageName;
  var url = `https://raw.githubusercontent.com/thales-markets/thales-dapp/dev/src/assets/images/banner/${imageName}`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.LIVE_RESULT, (req, res) => {
  const gameId = req.params.gameId;
  var url = `https://therundown.io/api/v2/events/${gameId}?key=${process.env.RUNDOWN_API_KEY}`;
  request.get(url).pipe(res);
});

app.post(ENDPOINTS.UPDATE_REFFERER_ID, (req, res) => {
  const walletAddress = req.body.walletAddress;
  const reffererID = req.body.reffererID;
  const previousReffererID = req.body.previousReffererID;

  const existingID = userReffererIDsMap.get(reffererID);

  if (existingID) {
    res.send(JSON.stringify({ error: true }));
    return;
  }

  const signature = req.body.signature;
  const recovered = sigUtil.recoverPersonalSignature({
    data: reffererID,
    sig: signature,
  });

  if (walletAddress && reffererID && recovered.toLowerCase() === walletAddress.toLowerCase()) {
    if (previousReffererID) {
      const previousExistingID = userReffererIDsMap.get(previousReffererID);
      if (walletAddress.toLowerCase() === previousExistingID.toLowerCase()) {
        userReffererIDsMap.delete(previousReffererID);
      }
    }
    userReffererIDsMap.set(reffererID, walletAddress);
  }

  redisClient.set(KEYS.USER_REFFERER_IDS, JSON.stringify([...userReffererIDsMap]), function () {});
  res.send(JSON.stringify({ error: false }));
});

app.get(ENDPOINTS.GET_REFFERER_ID_ADDRESS, (req, res) => {
  const reffererID = req.params.reffererID;
  const IDAddress = userReffererIDsMap.get(reffererID);
  if (reffererID && IDAddress) {
    res.send(IDAddress);
  } else {
    res.send();
  }
});

app.get(ENDPOINTS.GET_ADDRESS_REFFERER_ID, (req, res) => {
  const walletAddress = req.params.walletAddress;
  const reffererID = [...userReffererIDsMap].find(([key, val]) => val == walletAddress);
  if (reffererID && walletAddress) {
    res.send(reffererID[0]);
  } else {
    res.send();
  }
});

app.get(ENDPOINTS.ENETPULSE_RESULT, (req, res) => {
  const sportId = req.params.sportId;
  const date = req.params.date;
  var url = `https://eapi.enetpulse.com/event/daily/?tournament_templateFK=${sportId}&username=${process.env.ENETPULSE_USERNAME}&token=${process.env.ENETPULSE_TOKEN}&date=${date}&includeEventProperties=no`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.GET_REFFERER_MAP, (req, res) => {
  res.send(Object.fromEntries(userReffererIDsMap));
});

app.get(ENDPOINTS.JSON_ODDS_DATA, (req, res) => {
  const sportParameter = req.params.sportParameter;
  var url = `https://jsonodds.com/api/odds/${sportParameter}`;

  request.get(url, { headers: { "x-api-key": process.env.JSON_ODDS_KEY.toString() } }).pipe(res);
});

app.get(ENDPOINTS.OVERTIME_SPORTS, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 420, 8453, 42161].includes(Number(network))) {
    try {
      res.send(overtimeSportsList);
    } catch (e) {
      console.log(e);
    }
  } else {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
  }
});

app.get(ENDPOINTS.OVERTIME_COLLATERALS, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 420, 8453, 42161].includes(Number(network))) {
    try {
      res.send(COLLATERALS[Number(network)]);
    } catch (e) {
      console.log(e);
    }
  } else {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
  }
});

app.get(ENDPOINTS.OVERTIME_MARKETS, (req, res) => {
  const network = req.params.networkParam;
  let status = req.query.status;
  let type = req.query.type;
  let sport = req.query.sport;
  let leagueId = req.query.leagueid;
  let ungroup = req.query.ungroup;

  if (!status) {
    status = "open";
  }
  status = status.toLowerCase();

  if (![10, 420, 8453, 42161].includes(Number(network))) {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
    return;
  }
  if (!["open", "resolved", "canceled", "paused", "ongoing"].includes(status)) {
    res.send("Unsupported status. Supported statuses: open, resolved, canceled, paused, ongoing.");
    return;
  }
  if (
    type &&
    ![
      "moneyline",
      "spread",
      "total",
      "doublechance",
      "passingyards",
      "rushingyards",
      "pasingtouchdowns",
      "receivingyards",
      "scoringtouchdowns",
      "fieldgoalsmade",
    ].includes(type.toLowerCase())
  ) {
    res.send(
      "Unsupported type. Supported types: moneyline, spread, total, doubleChance, passingYards, rushingYards, pasingTouchdowns, receivingYards, scoringTouchdowns, fieldGoalsMade.",
    );
    return;
  }
  if (ungroup && !["true", "false"].includes(ungroup.toLowerCase())) {
    res.send("Invalid value for ungroup. Possible values: true or false.");
    return;
  }

  const sports = overtimeSportsList;
  const allLeagueIds = sports.map((sport) => Number(sport.id));
  const allSports = uniqBy(sports.map((sport) => sport.sport.toLowerCase()));

  if (sport && !allSports.includes(sport.toLowerCase())) {
    res.send(`Unsupported sport. Supported sports: ${allSports.join(", ")}. See details on: /overtime/sports.`);
    return;
  }
  if (leagueId && !allLeagueIds.includes(Number(leagueId))) {
    res.send(
      `Unsupported league ID. Supported league IDs: ${allLeagueIds.join(", ")}. See details on: /overtime/sports.`,
    );
    return;
  }

  redisClient.get(KEYS.OVERTIME_MARKETS[network], function (err, obj) {
    const markets = new Map(JSON.parse(obj));
    try {
      const marketsByStatus = markets.get(status);
      let marketsByType = marketsByStatus;
      if (type) {
        marketsByType = [];
        marketsByStatus.forEach((market) => {
          marketsByType.push(market);
          marketsByType.push(...market.childMarkets);
        });
      }

      const filteredMarkets = marketsByType.filter(
        (market) =>
          (!sport || (market.sport && market.sport.toLowerCase() === sport.toLowerCase())) &&
          (!leagueId || Number(market.leagueId) === Number(leagueId)) &&
          (!type || market.type.toLowerCase() === type.toLowerCase()),
      );

      if (ungroup && ungroup.toLowerCase() === "true") {
        res.send(filteredMarkets);
        return;
      }

      const groupMarkets = groupBy(filteredMarkets, (market) => market.sport);
      Object.keys(groupMarkets).forEach((key) => {
        groupMarkets[key] = groupBy(groupMarkets[key], (market) => market.leagueId);
      });

      res.send(groupMarkets);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_MARKET, (req, res) => {
  const network = req.params.networkParam;
  const marketAddress = req.params.marketAddress;

  if (![10, 420, 8453, 42161].includes(Number(network))) {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
    return;
  }

  redisClient.get(KEYS.OVERTIME_MARKETS[network], function (err, obj) {
    const markets = new Map(JSON.parse(obj));
    try {
      let allMarkets = [];

      markets.forEach((marketsByStatus) => {
        marketsByStatus.forEach((market) => {
          allMarkets.push(market);
          allMarkets.push(...market.childMarkets);
        });
      });

      const market = allMarkets.find((market) => market.address.toLowerCase() === marketAddress.toLowerCase());

      return res.send(market || `Market with address ${marketAddress} not found.`);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_USER_POSITIONS, async (req, res) => {
  const network = req.params.networkParam;
  const userAddress = req.params.userAddress;
  const type = req.query.type;
  const status = req.query.status;

  if (![10, 420, 8453, 42161].includes(Number(network))) {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
    return;
  }
  if (type && !["single", "parlay"].includes(type.toLowerCase())) {
    res.send("Unsupported type. Supported types: single or parlay.");
    return;
  }
  if (status && !["open", "claimable", "closed"].includes(status.toLowerCase())) {
    res.send("Unsupported status. Supported statuses: open, claimable, closed.");
    return;
  }

  const [userSinglePositions, userParlayPositions] = await Promise.all([
    users.processUserSinglePositions(network, userAddress.toLowerCase()),
    users.processUserParlayPositions(network, userAddress.toLowerCase()),
  ]);

  const positions = {};
  if (!type || type.toLowerCase() === "single") {
    if (!status) {
      positions.singles = userSinglePositions;
    } else {
      positions.singles = {
        [status.toLowerCase()]: userSinglePositions[status.toLowerCase()],
      };
    }
  }
  if (!type || type.toLowerCase() === "parlay") {
    if (!status) {
      positions.parlays = userParlayPositions;
    } else {
      positions.parlays = {
        [status.toLowerCase()]: userParlayPositions[status.toLowerCase()],
      };
    }
  }

  return res.send(positions);
});

app.get(ENDPOINTS.OVERTIME_USER_TRANSACTIONS, async (req, res) => {
  const network = req.params.networkParam;
  const userAddress = req.params.userAddress;
  const type = req.query.type;

  if (![10, 420, 8453, 42161].includes(Number(network))) {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
    return;
  }
  if (type && !["single", "parlay"].includes(type.toLowerCase())) {
    res.send("Unsupported type. Supported types: single or parlay.");
    return;
  }

  const [userSingleTransactions, userParlayTransactions] = await Promise.all([
    users.processUserSingleTransactions(network, userAddress.toLowerCase()),
    users.processUserParlayTransactions(network, userAddress.toLowerCase()),
  ]);

  const transactions = {};
  if (!type || type.toLowerCase() === "single") {
    transactions.singles = userSingleTransactions;
  }
  if (!type || type.toLowerCase() === "parlay") {
    transactions.parlays = userParlayTransactions;
  }

  return res.send(transactions);
});

app.get(ENDPOINTS.OVERTIME_MARKET_QUOTE, async (req, res) => {
  const network = req.params.networkParam;
  const marketAddress = req.params.marketAddress;
  const position = req.query.position;
  const buyin = req.query.buyin;
  const collateral = req.query.differentcollateral;

  if (![10, 420, 8453, 42161].includes(Number(network))) {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
    return;
  }
  if (!position) {
    res.send("Market position is required.");
    return;
  }
  if (!isNumeric(position)) {
    res.send("Invalid value for market position. The market position must be a number.");
    return;
  }
  if (!buyin) {
    res.send("Buy-in amount is required.");
    return;
  }
  if (!isNumeric(buyin) || Number(buyin) === 0) {
    res.send("Invalid value for buy-in amount. The buy-in amount must be a number greater than 0.");
    return;
  }
  if (collateral && Number(network) === 420) {
    res.send("Optimism Goerli do not support buying with different collateral.");
    return;
  }
  const supporetedCollaterals = getNonDefaultCollateralSymbols(Number(network));

  if (
    collateral &&
    !supporetedCollaterals.map((c) => c.toLowerCase()).includes(collateral.toLowerCase()) &&
    Number(network) !== 420
  ) {
    res.send(`Unsupported different collateral. Supported different collaterals: ${supporetedCollaterals.join(", ")}`);
    return;
  }

  const ammQuote = await quotes.getAmmQuote(
    Number(network),
    marketAddress.toLowerCase(),
    Number(position),
    Number(buyin),
    collateral,
  );

  return res.send(ammQuote);
});

app.get(ENDPOINTS.OVERTIME_PARLAY_QUOTE, async (req, res) => {
  const network = req.params.networkParam;
  const markets = req.query.markets;
  const positions = req.query.positions;
  const buyin = req.query.buyin;
  const collateral = req.query.differentcollateral;

  if (![10, 420, 8453, 42161].includes(Number(network))) {
    res.send(
      "Unsupported network. Supported networks: 10 (optimism), 42161 (arbitrum), 8453 (base), 420 (optimism goerli).",
    );
    return;
  }

  if (!markets) {
    res.send("Market addresses are required.");
    return;
  }
  const marketsArray = markets.split(",").map((market) => market.toLowerCase());
  if (!Array.isArray(marketsArray)) {
    res.send("Invalid value for market addresses. The market addresses must be an array.");
    return;
  }
  if (!positions) {
    res.send("Market positions are required.");
    return;
  }
  const positionsArray = positions.split(",").map((position) => Number(position));
  if (!Array.isArray(positionsArray)) {
    res.send("Invalid value for market positions. The market positions must be an array.");
    return;
  }
  if (!buyin) {
    res.send("Buy-in amount is required.");
    return;
  }
  if (!isNumeric(buyin) || Number(buyin) === 0) {
    res.send("Invalid value for buy-in amount. The buy-in amount must be a number greater than 0.");
    return;
  }
  if (collateral && (Number(network) === 42161 || Number(network) === 8453)) {
    res.send("Arbitrum and Base do not support buying with different collateral.");
    return;
  }
  if (
    collateral &&
    !["dai", "usdc", "usdt"].includes(collateral.toLowerCase()) &&
    (Number(network) === 10 || Number(network) === 420)
  ) {
    res.send("Unsupported different collateral for optimism. Supported different collaterals: DAI, USDC, USDT.");
    return;
  }

  const parlayAmmQuote = await quotes.getParlayAmmQuote(
    Number(network),
    marketsArray,
    positionsArray,
    Number(buyin),
    collateral,
  );

  return res.send(parlayAmmQuote);
});
