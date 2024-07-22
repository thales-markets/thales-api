const { redisClient } = require("../redis/client");
require("dotenv").config();
const express = require("express");
const request = require("request");
const compression = require("compression");
const app = express();

const stakersRoutes = require("./routes/stakers.route");
const cacheControlRoutes = require("./routes/cache.route");
const digitalOptionsRoutes = require("./routes/digitalOptions.route");
const sportMarketsRoutes = require("./routes/sportMarkets.route");

const cors = require("cors");
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(function (req, res, next) {
  for (const key in req.query) {
    req.query[key.toLowerCase()] = req.query[key];
  }
  next();
});

const ENDPOINTS = require("./endpoints");
const sigUtil = require("eth-sig-util");
const KEYS = require("../redis/redis-keys");
const { uniqBy, groupBy } = require("lodash");

const overtimeUsers = require("../overtimeApi/source/users");
const thalesUsers = require("../thalesApi/source/users");
const overtimeQuotes = require("../overtimeApi/source/quotes");
const thalesQuotes = require("../thalesApi/source/quotes");
const { COLLATERALS: OVERTIME_COLLATERALS } = require("../overtimeApi/constants/collaterals");
const { COLLATERALS: OVERTIME_V2_COLLATERALS } = require("../overtimeV2Api/constants/collaterals");
const { COLLATERALS: THALES_COLLATERALS } = require("../thalesApi/constants/collaterals");
const {
  getNonDefaultCollateralSymbols: getNonDefaultCollateralSymbolsOvertime,
} = require("../overtimeApi/utils/collaterals");
const {
  getNonDefaultCollateralSymbols: getNonDefaultCollateralSymbolsThales,
} = require("../thalesApi/utils/collaterals");
const overtimeSportsList = require("../overtimeApi/assets/overtime-sports.json");
const { isRangedPosition } = require("../thalesApi/utils/markets");
const { isNumeric } = require("../services/utils");

const { BigNumber } = require("ethers");
const thalesSpeedLimits = require("../thalesSpeedApi/source/limits");
const thalesSpeedAmmMarkets = require("../thalesSpeedApi/source/ammMarkets");
const thalesSpeedMarketsData = require("../thalesSpeedApi/source/marketsData");
const thalesPythPrice = require("../thalesSpeedApi/source/pythPrice");
const thalesSpeedConst = require("../thalesSpeedApi/constants/markets");
const thalesSpeedUtilsMarkets = require("../thalesSpeedApi/utils/markets");
const thalesSpeedUtilsNetworks = require("../thalesSpeedApi/utils/networks");
const thalesSpeedUtilsFormmaters = require("../thalesSpeedApi/utils/formatters");

const overtimeV2Markets = require("../overtimeV2Api/source/markets");
const overtimeV2Users = require("../overtimeV2Api/source/users");
const overtimeV2Quotes = require("../overtimeV2Api/source/quotes");
const { LeagueMap } = require("../overtimeV2Api/constants/sports");
const { MarketTypeMap } = require("../overtimeV2Api/constants/markets");
const {
  initializeSportsAMMBuyListener,
  initializeParlayAMMBuyListener,
  initializeSportsAMMLPListener,
  initializeParlayAMMLPListener,
} = require("./services/contractEventListener");

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

app.post(ENDPOINTS.GAME_STARTED, (req, res) => {
  const walletAddress = req.body.walletAddress;
  const gameStartedCount = gameFinishersMap.get("gameStartedCount") || 0;
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
  const gameFinishedCount = gameFinishersMap.get("gameFinishedCount") || 0;
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
  const banners = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/dev/src/assets/images/banner/${network}.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.BANNERS_IMAGE, (req, res) => {
  const imageName = req.params.imageName;
  const url = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/dev/src/assets/images/banner/${imageName}`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.BANNERS_V2, async (req, res) => {
  const network = req.params.networkParam;
  const banners = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/dev/src/assets/images/banner-v2/${network}.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.BANNERS_V2_IMAGE, (req, res) => {
  const imageName = req.params.imageName;
  const url = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/dev/src/assets/images/banner-v2/${imageName}`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.THALES_BANNERS, async (req, res) => {
  const network = req.params.networkParam;
  const banners = `https://raw.githubusercontent.com/thales-markets/thales-dapp/dev/src/assets/images/banner/${network}.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.THALES_BANNERS_IMAGE, (req, res) => {
  const imageName = req.params.imageName;
  const url = `https://raw.githubusercontent.com/thales-markets/thales-dapp/dev/src/assets/images/banner/${imageName}`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.SPEED_BANNERS, async (req, res) => {
  const network = req.params.networkParam;
  const banners = `https://raw.githubusercontent.com/thales-markets/thales-speed-markets/dev/src/assets/images/banner/${network}.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.SPEED_BANNERS_IMAGE, (req, res) => {
  const imageName = req.params.imageName;
  const url = `https://raw.githubusercontent.com/thales-markets/thales-speed-markets/dev/src/assets/images/banner/${imageName}`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.PROMOTIONS, async (req, res) => {
  const branchName = req.query["branch-name"];
  const banners = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/${
    branchName ? branchName : "main"
  }/src/assets/promotions/index.json`;
  request.get(banners).pipe(res);
});

app.get(ENDPOINTS.LIVE_RESULT, (req, res) => {
  const gameId = req.params.gameId;
  const url = `https://therundown.io/api/v2/events/${gameId}?key=${process.env.RUNDOWN_API_KEY}`;
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
    res.setHeader("content-type", "application/json");
    res.send(IDAddress);
  } else {
    res.send();
  }
});

app.get(ENDPOINTS.GET_ADDRESS_REFFERER_ID, (req, res) => {
  const walletAddress = req.params.walletAddress;
  const reffererID = [...userReffererIDsMap].find(([, val]) => val == walletAddress);
  if (reffererID && walletAddress) {
    res.setHeader("content-type", "application/json");
    res.send(reffererID[0]);
  } else {
    res.send();
  }
});

app.post(ENDPOINTS.THALES_SPEED_MARKETS_SOLANA_ADDRESS, (req, res) => {
  const walletAddress = req.body.walletAddress;
  const solanaAddress = req.body.solanaAddress;
  const smartAccountAddress = req.body.smartAccountAddress;

  const signature = req.body.signature;
  const recovered = sigUtil.recoverPersonalSignature({
    data: solanaAddress,
    sig: signature,
  });

  if (walletAddress && solanaAddress && recovered.toLowerCase() === walletAddress.toLowerCase()) {
    solanaAddressesMap.set(smartAccountAddress ?? walletAddress, solanaAddress);
  }

  redisClient.set(KEYS.SOLANA_ADDRESSES, JSON.stringify([...solanaAddressesMap]), function () {});
  res.send(JSON.stringify({ error: false }));
});

app.get(ENDPOINTS.THALES_SPEED_MARKETS_SOLANA_ADDRESS_FOR_ADDRESS, (req, res) => {
  const walletAddress = req.params.walletAddress;
  const solanaAddress = solanaAddressesMap.get(walletAddress);
  if (walletAddress) {
    res.setHeader("content-type", "application/json");
    res.send(solanaAddress);
  } else {
    res.send();
  }
});

app.get(ENDPOINTS.THALES_SPEED_MARKETS_SOLANA_ADDRESS, (req, res) => {
  res.setHeader("content-type", "application/json");
  res.send(Array.from(solanaAddressesMap));
});

app.get(ENDPOINTS.ENETPULSE_RESULT, (req, res) => {
  const sportId = req.params.sportId;
  const date = req.params.date;
  const url = `https://eapi.enetpulse.com/event/daily/?tournament_templateFK=${sportId}&username=${process.env.ENETPULSE_USERNAME}&token=${process.env.ENETPULSE_TOKEN}&date=${date}&includeEventProperties=no`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.GET_REFFERER_MAP, (req, res) => {
  res.send(Object.fromEntries(userReffererIDsMap));
});

app.get(ENDPOINTS.JSON_ODDS_DATA, (req, res) => {
  const sportParameter = req.params.sportParameter;
  const url = `https://jsonodds.com/api/odds/${sportParameter}`;

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
      res.send(OVERTIME_COLLATERALS[Number(network)]);
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
  const type = req.query.type;
  const sport = req.query.sport;
  const leagueId = req.query.leagueid;
  const ungroup = req.query.ungroup;

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
      "homeruns",
      "strikeouts",
      "passingyards",
      "rushingyards",
      "pasingtouchdowns",
      "receivingyards",
      "scoringtouchdowns",
      "fieldgoalsmade",
      "pitcherhitsallowed",
      "points",
      "shots",
      "goals",
      "hitsrecorded",
      "rebounds",
      "assists",
      "doubledouble",
      "tripledouble",
      "receptions",
      "firsttouchdown",
      "lasttouchdown",
      "threepointsmade,",
    ].includes(type.toLowerCase())
  ) {
    res.send(
      "Unsupported type. Supported types: moneyline, spread, total, doubleChance, homeruns, strikeouts, passingYards, rushingYards, pasingTouchdowns, receivingYards, scoringTouchdowns, fieldGoalsMade, pitcherHitsAllowed, points, shots, goals, hitsRecorded, rebounds, assists, doubleDouble, tripleDouble, receptions, firstTouchdown, lastTouchdown, threePointsMade.",
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
      const allMarkets = [];

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
    overtimeUsers.processUserSinglePositions(network, userAddress.toLowerCase()),
    overtimeUsers.processUserParlayPositions(network, userAddress.toLowerCase()),
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
    overtimeUsers.processUserSingleTransactions(network, userAddress.toLowerCase()),
    overtimeUsers.processUserParlayTransactions(network, userAddress.toLowerCase()),
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

  const supportedCollaterals = getNonDefaultCollateralSymbolsOvertime(Number(network));
  if (
    collateral &&
    !supportedCollaterals.map((c) => c.toLowerCase()).includes(collateral.toLowerCase()) &&
    Number(network) !== 420
  ) {
    res.send(`Unsupported different collateral. Supported different collaterals: ${supportedCollaterals.join(", ")}`);
    return;
  }

  const ammQuote = await overtimeQuotes.getAmmQuote(
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
  if (collateral && Number(network) === 420) {
    res.send("Optimism Goerli do not support buying with different collateral.");
    return;
  }

  const supportedCollaterals = getNonDefaultCollateralSymbolsOvertime(Number(network));
  if (
    collateral &&
    !supportedCollaterals.map((c) => c.toLowerCase()).includes(collateral.toLowerCase()) &&
    Number(network) !== 420
  ) {
    res.send(`Unsupported different collateral. Supported different collaterals: ${supportedCollaterals.join(", ")}`);
    return;
  }

  const parlayAmmQuote = await overtimeQuotes.getParlayAmmQuote(
    Number(network),
    marketsArray,
    positionsArray,
    Number(buyin),
    collateral,
  );

  return res.send(parlayAmmQuote);
});

app.get(ENDPOINTS.THALES_COLLATERALS, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 137, 8453, 42161].includes(Number(network))) {
    try {
      res.send(THALES_COLLATERALS[Number(network)]);
    } catch (e) {
      console.log(e);
    }
  } else {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
  }
});

app.get(ENDPOINTS.THALES_MARKETS, (req, res) => {
  const network = req.params.networkParam;
  const asset = req.query.asset;
  const maturityDate = req.query.maturitydate;
  const positions = req.query.positions;
  const onlyWithBonus = req.query.onlywithbonus;
  const ungroup = req.query.ungroup;

  if (![10, 137, 8453, 42161].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
    return;
  }
  let positionsArray = [];
  if (positions) {
    positionsArray = positions.split(",").map((position) => position.toLowerCase());
    if (!Array.isArray(positionsArray)) {
      res.send("Invalid value for market positions. The market positions must be an array.");
      return;
    }
    let isUnsupportedPosition = false;
    positionsArray.every((position) => {
      if (position && !["up", "down", "in", "out"].includes(position)) {
        isUnsupportedPosition = true;
        return false;
      }
      return true;
    });
    if (isUnsupportedPosition) {
      res.send("Unsupported position. Supported positions: UP, DOWN, IN, OUT.");
      return;
    }
  }
  if (onlyWithBonus && !["true", "false"].includes(onlyWithBonus.toLowerCase())) {
    res.send("Invalid value for onlyWithBonus. Possible values: true or false.");
    return;
  }
  if (ungroup && !["true", "false"].includes(ungroup.toLowerCase())) {
    res.send("Invalid value for ungroup. Possible values: true or false.");
    return;
  }

  redisClient.get(KEYS.THALES_MARKETS[network], function (err, obj) {
    const markets = JSON.parse(obj);
    try {
      const filteredMarkets = markets.filter(
        (market) =>
          (!asset || market.asset.toLowerCase() === asset.toLowerCase()) &&
          (!maturityDate || market.maturityDate.startsWith(maturityDate)) &&
          (!positions || positionsArray.includes(market.position.toLowerCase())) &&
          (!onlyWithBonus || (onlyWithBonus.toLowerCase() === "true" && market.bonus > 0)),
      );

      if (ungroup && ungroup.toLowerCase() === "true") {
        res.send(filteredMarkets);
        return;
      }

      const groupMarkets = groupBy(JSON.parse(JSON.stringify(filteredMarkets)), (market) => market.asset);
      Object.keys(groupMarkets).forEach((assetKey) => {
        groupMarkets[assetKey] = groupBy(groupMarkets[assetKey], (market) => market.maturityDate);
        Object.keys(groupMarkets[assetKey]).forEach((maturityDateKey) => {
          groupMarkets[assetKey][maturityDateKey] = groupBy(
            groupMarkets[assetKey][maturityDateKey],
            (market) => market.position,
          );
        });
      });

      res.send(groupMarkets);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.THALES_MARKETS_COUNT, (req, res) => {
  const network = req.params.networkParam;

  try {
    redisClient.mget([KEYS.THALES_MARKETS[network], KEYS.THALES_MARKETS_LAST_UPDATED_AT[network]], function (err, obj) {
      if (!obj) return res.sendStatus(204);
      const markets = JSON.parse(obj[0]);

      const groupByAsset = groupBy(markets, "asset");
      const data = [];

      Object.entries(groupByAsset).forEach(([assetKey, byAsset]) => {
        const groupByMaturityDate = groupBy(JSON.parse(JSON.stringify(byAsset)), "maturityDate");

        const byMaturityData = [];
        let totalCountByAsset = 0;
        Object.entries(groupByMaturityDate).forEach(([maturityKey, byMaturity]) => {
          const groupByPosition = groupBy(JSON.parse(JSON.stringify(byMaturity)), "position");

          const byPositionData = [];
          let totalCountByPositions = 0;
          Object.entries(groupByPosition).forEach(([positionKey, byPositions]) => {
            byPositionData.push({ position: positionKey, count: byPositions.length });
            totalCountByPositions += byPositions.length;
          });

          totalCountByAsset += totalCountByPositions;
          byMaturityData.push({ maturity: maturityKey, count: totalCountByPositions, positions: byPositionData });
        });

        data.push({ asset: assetKey, count: totalCountByAsset, byMaturity: byMaturityData });
      });

      return res.send({ data, lastUpdatedAt: obj[1] ? obj[1] : "" });
    });
  } catch (e) {
    console.log("Error ", e);
    return null;
  }
});

app.get(ENDPOINTS.THALES_MARKET, (req, res) => {
  const network = req.params.networkParam;
  const marketAddress = req.params.marketAddress;

  if (![10, 137, 8453, 42161].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
    return;
  }

  redisClient.get(KEYS.THALES_MARKETS[network], function (err, obj) {
    const markets = JSON.parse(obj);
    try {
      const market = markets.find((market) => market.address.toLowerCase() === marketAddress.toLowerCase());
      return res.send(market || `Market with address ${marketAddress} not found or not open.`);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.THALES_MARKET_BUY_QUOTE, async (req, res) => {
  const network = req.params.networkParam;
  const marketAddress = req.params.marketAddress;
  const position = req.query.position;
  const buyin = req.query.buyin;
  const collateral = req.query.differentcollateral;

  if (![10, 137, 8453, 42161].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
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
  if (collateral && Number(network) !== 10) {
    res.send("Polygon, Arbitrum and Base do not support buying with different collateral.");
    return;
  }

  const supportedCollaterals = getNonDefaultCollateralSymbolsThales(Number(network));
  if (
    collateral &&
    !supportedCollaterals.map((c) => c.toLowerCase()).includes(collateral.toLowerCase()) &&
    Number(network) === 10
  ) {
    res.send(`Unsupported different collateral. Supported different collaterals: ${supportedCollaterals.join(", ")}`);
    return;
  }

  redisClient.get(KEYS.THALES_MARKETS[network], async function (err, obj) {
    const markets = JSON.parse(obj);
    try {
      const market = markets.find((market) => market.address.toLowerCase() === marketAddress.toLowerCase());

      if (!market) {
        res.send(`Market with address ${marketAddress} not found or not open.`);
        return;
      }

      const isRangedMarket = isRangedPosition(market.position);

      if (![0, 1].includes(Number(position))) {
        res.send(
          `Unsupported position for market with address ${marketAddress}. Supported positions: 0 (${
            isRangedMarket ? "IN" : "UP"
          }) or 1 (${isRangedMarket ? "OUT" : "DOWN"}).`,
        );
        return;
      }

      const ammQuote = await thalesQuotes.getAmmQuote(
        Number(network),
        marketAddress.toLowerCase(),
        Number(position),
        Number(buyin),
        collateral,
        isRangedMarket,
        true,
      );

      return res.send(ammQuote);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.THALES_MARKET_SELL_QUOTE, async (req, res) => {
  const network = req.params.networkParam;
  const marketAddress = req.params.marketAddress;
  const position = req.query.position;
  const sellAmount = req.query.sellamount;
  const collateral = req.query.differentcollateral;

  if (![10, 137, 8453, 42161].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
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
  if (!sellAmount) {
    res.send("Sell amount is required.");
    return;
  }
  if (!isNumeric(sellAmount) || Number(sellAmount) === 0) {
    res.send("Invalid value for sell amount. The sell amount must be a number greater than 0.");
    return;
  }
  if (collateral) {
    res.send("Sell in different collateral is not supported.");
    return;
  }

  redisClient.get(KEYS.THALES_MARKETS[network], async function (err, obj) {
    const markets = JSON.parse(obj);
    try {
      const market = markets.find((market) => market.address.toLowerCase() === marketAddress.toLowerCase());

      if (!market) {
        res.send(`Market with address ${marketAddress} not found or not open.`);
        return;
      }

      const isRangedMarket = isRangedPosition(market.position);

      if (![0, 1].includes(Number(position))) {
        res.send(
          `Unsupported position for market with address ${marketAddress}. Supported positions: 0 (${
            isRangedMarket ? "IN" : "UP"
          }) or 1 (${isRangedMarket ? "OUT" : "DOWN"}).`,
        );
        return;
      }

      const ammQuote = await thalesQuotes.getAmmQuote(
        Number(network),
        marketAddress.toLowerCase(),
        Number(position),
        Number(sellAmount),
        undefined,
        isRangedMarket,
        false,
      );

      return res.send(ammQuote);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.THALES_USER_POSITIONS, async (req, res) => {
  const network = req.params.networkParam;
  const userAddress = req.params.userAddress;
  const status = req.query.status;

  if (![10, 137, 8453, 42161].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
    return;
  }
  if (status && !["open", "claimable", "closed"].includes(status.toLowerCase())) {
    res.send("Unsupported status. Supported statuses: open, claimable, closed.");
    return;
  }

  const userPositions = await thalesUsers.processUserPositions(network, userAddress.toLowerCase());

  let positions = {};
  if (!status) {
    positions = userPositions;
  } else {
    positions = {
      [status.toLowerCase()]: userPositions[status.toLowerCase()],
    };
  }

  return res.send(positions);
});

app.get(ENDPOINTS.THALES_USER_TRANSACTIONS, async (req, res) => {
  const network = req.params.networkParam;
  const userAddress = req.params.userAddress;

  if (![10, 137, 8453, 42161].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 137 (polygon), 42161 (arbitrum), 8453 (base).");
    return;
  }

  const userTransactions = await thalesUsers.processUserTransactions(network, userAddress.toLowerCase());

  return res.send(userTransactions);
});

// THALES SPEED MARKETS

app.get(ENDPOINTS.THALES_SPEED_MARKETS_BUY_PARAMS, async (req, res) => {
  const network = Number(req.params.networkParam);
  const asset = req.query.asset;
  const deltaTimeSec = Number(req.query.deltaTimeSec || 0);
  const strikeTimeSec = Number(req.query.strikeTimeSec || 0);
  const direction = req.query.direction;
  const collateral = req.query.collateral;
  const buyin = Number(req.query.buyin || 0);

  const nowSec = Math.floor(Date.now() / 1000);

  let response;
  let responseError = "";
  if (!thalesSpeedUtilsMarkets.getIsNetworkSupported(network)) {
    responseError = "Unsupported network. Supported networks: " + thalesSpeedUtilsNetworks.getSupportedNetworks();
  }
  if (!thalesSpeedUtilsMarkets.getIsAssetSupported(asset)) {
    responseError +=
      (responseError ? "\n" : "") +
      "Unsupported asset. Supported assets: " +
      thalesSpeedConst.SUPPORTED_ASSETS.join(", ");
  }
  const speedLimits = await thalesSpeedLimits.getSpeedMarketsLimits(network);
  if (speedLimits.minBuyinAmount == 0) {
    responseError += (responseError ? "\n" : "") + "Cannot fetch data from speed AMM data contract!";
  }
  if (deltaTimeSec) {
    if (deltaTimeSec < speedLimits.minimalTimeToMaturity || deltaTimeSec > speedLimits.maximalTimeToMaturity) {
      responseError +=
        (responseError ? "\n" : "") +
        "Unsupported delta time. Minimal delta: " +
        speedLimits.minimalTimeToMaturity +
        ", maximal delta: " +
        speedLimits.maximalTimeToMaturity;
    }
  } else if (strikeTimeSec) {
    if (strikeTimeSec.toString().length != 10) {
      responseError += (responseError ? "\n" : "") + "Unsupported strike time. Strike time has to be in seconds!";
    }
    if (
      strikeTimeSec < nowSec + speedLimits.minimalTimeToMaturity ||
      strikeTimeSec > nowSec + speedLimits.maximalTimeToMaturity
    ) {
      responseError +=
        (responseError ? "\n" : "") +
        "Unsupported strike time. Minimal strike time: " +
        speedLimits.minimalTimeToMaturity +
        " seconds from now" +
        ", maximal strike time: " +
        speedLimits.maximalTimeToMaturity +
        " seconds from now";
    }
  } else {
    responseError += (responseError ? "\n" : "") + "Missing delta time or strike time!";
  }
  if (!["UP", "DOWN"].includes(direction)) {
    responseError += (responseError ? "\n" : "") + "Unsupported direction. Supported directions: UP, DOWN";
  }
  if (collateral && !thalesSpeedConst.SUPPORTED_COLLATERALS[network].includes(collateral)) {
    responseError +=
      (responseError ? "\n" : "") +
      "Unsupported collateral for network. Supported collaterals: " +
      thalesSpeedConst.SUPPORTED_COLLATERALS[network].join(", ");
  }
  // Buy-in calculation and validation
  const isDefaultCollateral = !collateral || thalesSpeedUtilsMarkets.getIsDefaultCollateral(network, collateral);
  let stableBuyin = buyin;
  let buyinAmount = thalesSpeedUtilsFormmaters.coinParser(
    thalesSpeedUtilsFormmaters.truncToDecimals(buyin),
    network,
    collateral,
  );
  const skewImpact = thalesSpeedUtilsMarkets.getSkewImpact(speedLimits, asset);
  if (!isDefaultCollateral) {
    const lpFee = thalesSpeedUtilsMarkets.getFeeByTimeThreshold(
      deltaTimeSec ? deltaTimeSec : strikeTimeSec - nowSec,
      speedLimits.timeThresholdsForFees,
      speedLimits.lpFees,
      speedLimits.defaultLPFee,
    );
    const skew = skewImpact[direction];
    const oppositeDirection = direction == "UP" ? "DOWN" : "UP";
    const discount = skewImpact[oppositeDirection] / 2;
    const totalFee = lpFee + skew - discount + speedLimits.safeBoxImpact;

    if (thalesSpeedUtilsMarkets.getIsStableCollateral(collateral)) {
      stableBuyin = buyin;
      const buyinWithFees = buyin * (1 + totalFee + thalesSpeedConst.STABLECOIN_CONVERSION_BUFFER_PERCENTAGE);
      buyinAmount = thalesSpeedUtilsFormmaters.coinParser(
        thalesSpeedUtilsFormmaters.truncToDecimals(buyinWithFees),
        network,
        collateral,
      );
    } else {
      stableBuyin = await thalesSpeedUtilsMarkets.getConvertedToStable(buyin, collateral, network);
      if (stableBuyin == 0) {
        responseError += (responseError ? "\n" : "") + "Conversion to stable collateral failed! Please try again...";
      }
      const buyinWithFees = buyin * (1 + totalFee);
      buyinAmount = thalesSpeedUtilsFormmaters.coinParser(
        thalesSpeedUtilsFormmaters.truncToDecimals(
          buyinWithFees,
          thalesSpeedUtilsMarkets.getCollateralDecimals(collateral),
        ),
        network,
        collateral,
      );
    }
  }
  if (stableBuyin && (stableBuyin < speedLimits.minBuyinAmount || stableBuyin > speedLimits.maxBuyinAmount)) {
    const minBuyin = await thalesSpeedUtilsMarkets.getConvertedFromStable(
      speedLimits.minBuyinAmount,
      collateral,
      true,
      network,
    );
    const maxBuyin = await thalesSpeedUtilsMarkets.getConvertedFromStable(
      speedLimits.maxBuyinAmount,
      collateral,
      false,
      network,
    );
    responseError +=
      (responseError ? "\n" : "") + "Unsupported buyin. Minimal buyin: " + minBuyin + ", maximal buyin: " + maxBuyin;
  }
  // Liquidity per assset and direction validation
  const riskPerAssetAndDirectionData = speedLimits.risksPerAssetAndDirection.filter(
    (data) => data.currency == asset && data.position == direction,
  )[0];
  const liquidityPerDirection = riskPerAssetAndDirectionData.max - riskPerAssetAndDirectionData.current;
  if (stableBuyin > liquidityPerDirection) {
    responseError +=
      (responseError ? "\n" : "") +
      "Out of liquidity for asset and direction. Current liquidity: " +
      liquidityPerDirection;
  }
  // Liquidity validation
  const riskPerAssetData = speedLimits.risksPerAsset.filter((data) => data.currency == asset)[0];
  const liquidity = riskPerAssetData.max - riskPerAssetData.current;
  if (stableBuyin > liquidity) {
    responseError += (responseError ? "\n" : "") + "Out of liquidity for asset. Current liquidity: " + liquidity;
  }

  let pythPriceData = { priceUpdateData: [], updateFee: 0, pythPrice: 0 };
  if (!responseError) {
    pythPriceData = await thalesPythPrice.getPythLatestPriceData(network, asset);

    response = {
      methodName: isDefaultCollateral ? "createNewMarket" : "createNewMarketWithDifferentCollateral",
      asset: thalesSpeedUtilsFormmaters.assetFormatter(asset),
      strikeTime: deltaTimeSec ? 0 : strikeTimeSec,
      delta: deltaTimeSec ? deltaTimeSec : 0,
      direction: direction == "UP" ? 0 : 1,
      priceUpdateData: pythPriceData.priceUpdateData,
      pythPrice: pythPriceData.pythPrice,
      referrer: thalesSpeedConst.ZERO_ADDRESS,
      skewImpact: thalesSpeedUtilsFormmaters.skewParser(skewImpact[direction]),
    };

    const isEth = thalesSpeedUtilsMarkets.getIsEth(collateral);
    response = isDefaultCollateral
      ? {
          ...response,
          buyinAmount,
        }
      : {
          ...response,
          collateral: thalesSpeedUtilsMarkets.getCollateralAddress(network, collateral),
          collateralAmount: buyinAmount,
          isEth,
        };
    response = { ...response, value: isEth ? buyinAmount.add(pythPriceData.updateFee) : pythPriceData.updateFee };
  }

  if (responseError) {
    return res.status(400).send(responseError);
  } else {
    return res.send(response);
  }
});

app.get(ENDPOINTS.THALES_SPEED_MARKETS_USER_CLAIMABLE, async (req, res) => {
  const network = Number(req.params.networkParam);
  const user = req.params.userAddress;

  let response;
  let responseError = "";
  if (!thalesSpeedUtilsMarkets.getIsNetworkSupported(network)) {
    responseError = "Unsupported network. Supported networks: " + thalesSpeedUtilsNetworks.getSupportedNetworks();
  } else {
    const markets = await thalesSpeedAmmMarkets.getUserActiveMarkets(network, user);
    const marketsData = await thalesSpeedMarketsData.getSpeedMarketsData(network, markets);
    const maturedMarketsData = marketsData.filter((marketData) => marketData.strikeTime * 1000 < Date.now());
    const assetsAndTimes = maturedMarketsData.map((marketData) => ({
      asset: marketData.asset,
      time: marketData.strikeTime,
    }));
    const pythDataArray = await thalesPythPrice.getPythHistoricalPricesData(network, assetsAndTimes);

    const claimable = maturedMarketsData
      .filter(
        (marketData, i) =>
          pythDataArray[i].pythPrice > 0 &&
          thalesSpeedUtilsMarkets.getIsUserWon(
            marketData.direction,
            marketData.strikePrice,
            pythDataArray[i].pythPrice,
          ),
      )
      .map((marketData) => marketData.address);
    const priceUnknown = maturedMarketsData
      .filter((_, i) => pythDataArray[i].pythPrice == 0)
      .map((marketData) => marketData.address);

    response = { claimable, priceUnknown };
  }

  if (responseError) {
    return res.status(400).send(responseError);
  } else {
    return res.send(response);
  }
});

app.get(ENDPOINTS.THALES_SPEED_MARKETS_RESOLVE_PARAMS, async (req, res) => {
  const network = Number(req.params.networkParam);
  const markets = req.query.markets;

  let response;
  let responseError = "";
  if (!thalesSpeedUtilsMarkets.getIsNetworkSupported(network)) {
    responseError = "Unsupported network. Supported networks: " + thalesSpeedUtilsNetworks.getSupportedNetworks();
  }
  if (!markets) {
    responseError += (responseError ? "\n" : "") + "At least one market is required!";
  }

  if (!responseError) {
    const marketsData = await thalesSpeedMarketsData.getSpeedMarketsData(network, markets);
    if (marketsData.length == 0) {
      responseError += (responseError ? "\n" : "") + "Market address not found!";
    } else {
      const maturedMarketsData = marketsData.filter((marketData) => marketData.strikeTime * 1000 < Date.now());
      const assetsAndTimes = maturedMarketsData.map((marketData) => ({
        asset: marketData.asset,
        time: marketData.strikeTime,
      }));
      const pythDataArray = await thalesPythPrice.getPythHistoricalPricesData(network, assetsAndTimes);

      const marketsToResolve = maturedMarketsData
        .filter((_, i) => pythDataArray[i].pythPrice > 0)
        .map((marketData) => marketData.address);

      const priceUpdateDataToResolve = pythDataArray
        .map((pythData) => (pythData.pythPrice > 0 ? pythData.priceUpdateData[0] : undefined))
        .filter((p) => p != undefined);

      const totalUpdateFee = pythDataArray.reduce(
        (acc, pythData) => acc.add(pythData.pythPrice > 0 ? pythData.updateFee : BigNumber.from(0)),
        BigNumber.from(0),
      );

      const priceUnknown = maturedMarketsData
        .filter((_, i) => pythDataArray[i].pythPrice == 0)
        .map((marketData) => marketData.address);

      response = {
        methodName: "resolveMarketsBatch",
        markets: marketsToResolve,
        priceUpdateData: priceUpdateDataToResolve,
        value: totalUpdateFee,
        priceUnknown,
      };
    }
  }

  if (responseError) {
    return res.status(400).send(responseError);
  } else {
    return res.send(response);
  }
});

app.get(ENDPOINTS.THALES_SPEED_MARKETS_RESOLVE_OFFRAMP_PARAMS, async (req, res) => {
  const network = Number(req.params.networkParam);
  const market = req.params.marketAddress;
  const collateral = req.query.collateral;

  let response;
  let responseError = "";
  if (!thalesSpeedUtilsMarkets.getIsNetworkSupported(network)) {
    responseError = "Unsupported network. Supported networks: " + thalesSpeedUtilsNetworks.getSupportedNetworks();
  }
  if (!thalesSpeedConst.SUPPORTED_COLLATERALS[network].includes(collateral)) {
    responseError +=
      (responseError ? "\n" : "") +
      "Unsupported collateral for network. Supported collaterals: " +
      thalesSpeedConst.SUPPORTED_COLLATERALS[network]
        .filter((collateral) => collateral != thalesSpeedUtilsMarkets.getDefaultCollateral(network))
        .join(", ");
  }
  const isDefaultCollateral = thalesSpeedUtilsMarkets.getIsDefaultCollateral(network, collateral);
  if (isDefaultCollateral) {
    responseError +=
      (responseError ? "\n" : "") +
      "Unsupported collateral offramp with default collateral! Please use other collateral or use resolve API without offramp.";
  }

  if (!responseError) {
    const marketsData = await thalesSpeedMarketsData.getSpeedMarketsData(network, [market]);
    if (marketsData.length == 0) {
      responseError += (responseError ? "\n" : "") + "Market address not found!";
    } else {
      const marketData = marketsData[0];

      if (marketData.strikeTime * 1000 > Date.now()) {
        responseError += (responseError ? "\n" : "") + "Market is not matured! Strike time: " + marketData.strikeTime;
      } else {
        const assetsAndTimes = [
          {
            asset: marketData.asset,
            time: marketData.strikeTime,
          },
        ];
        const pythDataArray = await thalesPythPrice.getPythHistoricalPricesData(network, assetsAndTimes);

        if (pythDataArray[0].pythPrice == 0) {
          responseError +=
            (responseError ? "\n" : "") + "Cannot fetch price from pyth! Publish time: " + assetsAndTimes[0].time;
        } else {
          const collateralAddress = thalesSpeedUtilsMarkets.getCollateralAddress(network, collateral);
          const toEth = thalesSpeedUtilsMarkets.getIsEth(collateral);

          response = {
            methodName: "resolveMarketWithOfframp",
            market,
            priceUpdateData: pythDataArray[0].priceUpdateData,
            collateral: collateralAddress,
            toEth,
            value: pythDataArray[0].updateFee,
          };
        }
      }
    }
  }

  if (responseError) {
    return res.status(400).send(responseError);
  } else {
    return res.send(response);
  }
});

// THALES IO

app.get(ENDPOINTS.THALES_IO_USERS_DATA, async (req, res) => {
  const url = `https://raw.githubusercontent.com/thales-markets/thales-io-dapp/dev/src/assets/json/users-data.json`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.THALES_IO_VOLUME_DATA, async (req, res) => {
  const url = `https://raw.githubusercontent.com/thales-markets/thales-io-dapp/dev/src/assets/json/volume-data.json`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.THALES_IO_TIMELINE, async (req, res) => {
  const url = `https://raw.githubusercontent.com/thales-markets/thales-io-dapp/dev/src/assets/json/timeline.json`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.THALES_IO_ECOSYSTEM_APPS, async (req, res) => {
  const url = `https://raw.githubusercontent.com/thales-markets/thales-io-dapp/dev/src/assets/json/ecosystem-apps.json`;
  request.get(url).pipe(res);
});

app.get(ENDPOINTS.THALES_IO_DAILY_STATS, async (req, res) => {
  redisClient.get(KEYS.THALES_IO_DAILY_STATS, function (err, obj) {
    const stats = new Map(JSON.parse(obj));
    try {
      res.send(Object.fromEntries(stats));
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.THALES_IO_WEEKLY_STATS, async (req, res) => {
  redisClient.get(KEYS.THALES_IO_WEEKLY_STATS, function (err, obj) {
    const stats = new Map(JSON.parse(obj));
    try {
      res.send(Object.fromEntries(stats));
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_SPORTS, (req, res) => {
  try {
    res.send(LeagueMap);
  } catch (e) {
    console.log(e);
  }
});

app.get(ENDPOINTS.OVERTIME_V2_MARKET_TYPES, (req, res) => {
  try {
    res.send(MarketTypeMap);
  } catch (e) {
    console.log(e);
  }
});

app.get(ENDPOINTS.OVERTIME_V2_COLLATERALS, (req, res) => {
  const network = req.params.networkParam;
  if ([10, 11155420].includes(Number(network))) {
    try {
      res.send(OVERTIME_V2_COLLATERALS[Number(network)]);
    } catch (e) {
      console.log(e);
    }
  } else {
    res.send("Unsupported network. upported networks: 10 (optimism), 11155420 (optimism sepolia).");
  }
});

app.get(ENDPOINTS.OVERTIME_V2_MARKETS, (req, res) => {
  const network = req.params.networkParam;
  let status = req.query.status;
  const typeId = req.query.typeId;
  const sport = req.query.sport;
  const leagueId = req.query.leagueid;
  const ungroup = req.query.ungroup;
  const minMaturity = req.query.minMaturity;

  if (!status) {
    status = "open";
  }
  status = status.toLowerCase();

  if (![10, 11155420].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 11155420 (optimism sepolia).");
    return;
  }

  if (!["open", "resolved", "cancelled", "paused", "ongoing"].includes(status)) {
    res.send("Unsupported status. Supported statuses: open, resolved, cancelled, paused, ongoing.");
    return;
  }

  const allTypes = Object.values(MarketTypeMap);
  const allTypeIds = allTypes.map((type) => type.id);

  if (typeId && !allTypeIds.includes(Number(typeId))) {
    res.send(
      `Unsupported type ID. Supported type IDs: ${allTypeIds.join(", ")}. See details on: /overtime-v2/market-types.`,
    );
    return;
  }

  if (ungroup && !["true", "false"].includes(ungroup.toLowerCase())) {
    res.send("Invalid value for ungroup. Possible values: true or false.");
    return;
  }

  if (!!minMaturity && !isNumeric(minMaturity.toString())) {
    res.send("Invalid value for min maturity. The min maturity must be a number");
    return;
  }

  const allLeagues = Object.values(LeagueMap);
  const allLeagueIds = allLeagues.map((league) => league.id);
  const allSports = uniqBy(allLeagues.map((league) => league.sport.toLowerCase()));

  if (sport && !allSports.includes(sport.toLowerCase())) {
    res.send(`Unsupported sport. Supported sports: ${allSports.join(", ")}. See details on: /overtime-v2/sports.`);
    return;
  }
  if (leagueId && !allLeagueIds.includes(Number(leagueId))) {
    res.send(
      `Unsupported league ID. Supported league IDs: ${allLeagueIds.join(", ")}. See details on: /overtime-v2/sports.`,
    );
    return;
  }

  const redisKey =
    status === "resolved" || status === "cancelled"
      ? KEYS.OVERTIME_V2_CLOSED_MARKETS[network]
      : KEYS.OVERTIME_V2_OPEN_MARKETS[network];

  redisClient.get(redisKey, async function (err, obj) {
    const markets = new Map(JSON.parse(obj));

    try {
      const allMarkets = Array.from(markets.values());
      const groupMarketsByStatus = groupBy(allMarkets, (market) => market.statusCode);

      const marketsByStatus = groupMarketsByStatus[status] || [];
      let marketsByType = marketsByStatus;
      if (typeId) {
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
          (!typeId || Number(market.typeId) === Number(typeId)) &&
          (!minMaturity || Number(market.maturity) >= Number(minMaturity)),
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

app.get(ENDPOINTS.OVERTIME_V2_LIVE_MARKETS, (req, res) => {
  const network = req.params.networkParam;
  const typeId = req.query.typeId;
  const sport = req.query.sport;
  const ungroup = req.query.ungroup;
  const leagueId = req.query.leagueId;

  if (![10, 11155420].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 11155420 (optimism sepolia).");
    return;
  }

  const allTypes = Object.values(MarketTypeMap);
  const allTypeIds = allTypes.map((type) => type.id);

  if (typeId && !allTypeIds.includes(Number(typeId))) {
    res.send(
      `Unsupported type ID. Supported type IDs: ${allTypeIds.join(", ")}. See details on: /overtime-v2/market-types.`,
    );
    return;
  }

  if (ungroup && !["true", "false"].includes(ungroup.toLowerCase())) {
    res.send("Invalid value for ungroup. Possible values: true or false.");
    return;
  }

  const allLiveLeagues = Object.values(LeagueMap).filter((league) =>
    Number(network) == 11155420 ? league.isLiveTestnet : league.live,
  );
  const allLiveLeagueIds = allLiveLeagues.map((league) => league.id);
  const allLiveSports = uniqBy(allLiveLeagues.map((league) => league.sport.toLowerCase()));

  if (sport && !allLiveSports.includes(sport.toLowerCase())) {
    res.send(
      `Unsupported live sport. Supported live sports: ${allLiveSports.join(
        ", ",
      )}. See details on: /overtime-v2/sports.`,
    );
    return;
  }
  if (leagueId && !allLiveLeagueIds.includes(Number(leagueId))) {
    res.send(
      `Unsupported live league ID. Supported live league IDs: ${allLiveLeagueIds.join(
        ", ",
      )}. See details on: /overtime-v2/sports.`,
    );
    return;
  }

  const errors = [];
  redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[network], async function (err, obj) {
    const markets = JSON.parse(obj);

    try {
      const filteredMarkets = markets.filter(
        (market) =>
          (!sport || (market.sport && market.sport.toLowerCase() === sport.toLowerCase())) &&
          (!leagueId || Number(market.leagueId) === Number(leagueId)) &&
          (!typeId || Number(market.typeId) === Number(typeId)),
      );

      res.send({
        markets: filteredMarkets,
        errors,
      });
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_MARKET, (req, res) => {
  const network = req.params.networkParam;
  const marketAddress = req.params.marketAddress;

  redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], async function (err, objOpen) {
    redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], async function (err, objClosed) {
      const openMarkets = new Map(JSON.parse(objOpen));
      const closedMarkets = new Map(JSON.parse(objClosed));

      try {
        const allMarkets = [...Array.from(openMarkets.values()), ...Array.from(closedMarkets.values())];
        const market = allMarkets.find((market) => market.gameId.toLowerCase() === marketAddress.toLowerCase());

        return res.send(market || `Market with gameId ${marketAddress} not found.`);
      } catch (e) {
        console.log(e);
      }
    });
  });
});

app.get(ENDPOINTS.OVERTIME_V2_GAMES_INFO, (req, res) => {
  redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
    const gamesInfo = new Map(JSON.parse(obj));
    try {
      res.send(Object.fromEntries(gamesInfo));
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_GAME_INFO, (req, res) => {
  const gameId = req.params.gameId;

  redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, async function (err, obj) {
    const gamesInfo = new Map(JSON.parse(obj));

    try {
      const gameInfo = gamesInfo.get(gameId);
      return res.send(gameInfo);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_PLAYERS_INFO, (req, res) => {
  redisClient.get(KEYS.OVERTIME_V2_PLAYERS_INFO, function (err, obj) {
    const playersInfo = new Map(JSON.parse(obj));
    try {
      res.send(Object.fromEntries(playersInfo));
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_PLAYER_INFO, (req, res) => {
  const playerId = req.params.playerId;

  redisClient.get(KEYS.OVERTIME_V2_PLAYERS_INFO, async function (err, obj) {
    const playersInfo = new Map(JSON.parse(obj));

    try {
      const playerInfo = playersInfo.get(playerId);
      return res.send(playerInfo);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_LIVE_SCORES, (req, res) => {
  redisClient.get(KEYS.OVERTIME_V2_LIVE_SCORES, function (err, obj) {
    const liveScores = new Map(JSON.parse(obj));
    try {
      res.send(Object.fromEntries(liveScores));
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_LIVE_SCORE, (req, res) => {
  const gameId = req.params.gameId;

  redisClient.get(KEYS.OVERTIME_V2_LIVE_SCORES, async function (err, obj) {
    const liveScores = new Map(JSON.parse(obj));

    try {
      const liveScore = liveScores.get(gameId);
      return res.send(liveScore);
    } catch (e) {
      console.log(e);
    }
  });
});

app.get(ENDPOINTS.OVERTIME_V2_USER_HISTORY, async (req, res) => {
  const network = req.params.networkParam;
  const userAddress = req.params.userAddress;
  const status = req.query.status;

  if (![10, 11155420].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 11155420 (optimism sepolia).");
    return;
  }

  if (status && !["open", "claimable", "closed"].includes(status.toLowerCase())) {
    res.send("Unsupported status. Supported statuses: open, claimable, closed.");
    return;
  }

  const userHistory = await overtimeV2Users.processUserHistory(network, userAddress.toLowerCase());
  const history = status ? userHistory[status.toLowerCase()] : userHistory;

  return res.send(history);
});

app.post(ENDPOINTS.OVERTIME_V2_UPDATE_MERKLE_TREE, async (req, res) => {
  const gameIds = req.body.gameIds;

  if (!gameIds) {
    res.send("Game IDs are required.");
    return;
  }
  const gameIdsArray = gameIds.split(",");
  if (!Array.isArray(gameIdsArray)) {
    res.send("Invalid value for game IDs. The game IDs must be an array.");
    return;
  }
  await overtimeV2Markets.updateMerkleTree(gameIdsArray);
  res.send();
});

app.post(ENDPOINTS.OVERTIME_V2_QUOTE, async (req, res) => {
  const network = req.params.networkParam;
  const tradeData = req.body.tradeData;
  const buyInAmount = req.body.buyInAmount;
  const collateral = req.body.collateral;

  if (![10, 11155420].includes(Number(network))) {
    res.send("Unsupported network. Supported networks: 10 (optimism), 11155420 (optimism sepolia).");
    return;
  }

  if (!tradeData) {
    res.send("Trade data is required.");
    return;
  }
  if (!Array.isArray(tradeData)) {
    res.send("Invalid value for trade data. Trade data must be an array.");
    return;
  }

  if (!buyInAmount) {
    res.send("Buy-in amount is required.");
    return;
  }
  if (!isNumeric(buyInAmount.toString()) || Number(buyInAmount) === 0) {
    res.send("Invalid value for buy-in amount. The buy-in amount must be a number greater than 0.");
    return;
  }

  const supportedCollaterals = OVERTIME_V2_COLLATERALS[Number(network)].map((collateral) => collateral.symbol);
  if (collateral && !supportedCollaterals.map((c) => c.toLowerCase()).includes(collateral.toLowerCase())) {
    res.send(`Unsupported collateral. Supported collaterals: ${supportedCollaterals.join(", ")}`);
    return;
  }

  const quote = await overtimeV2Quotes.getAmmQuote(Number(network), tradeData, Number(buyInAmount), collateral);
  res.send(quote);
});

app.put(ENDPOINTS.OVERTIME_V2_LIVE_TRADING_ADAPTER_MESSAGE_WRITE, (req, res) => {
  const requestId = req.body.requestId;
  const message = req.body.message;
  const allow = req.body.allow;
  const networkId = req.body.networkId;
  const apiKey = req.body.key;

  if (apiKey == process.env.LIVE_TRADING_MESSAGE_API_KEY) {
    redisClient.get(KEYS.OVERTIME_V2_LIVE_TRADE_ADAPTER_MESSAGES[networkId], function (err, obj) {
      const messagesMap = new Map(JSON.parse(obj));
      messagesMap.set(requestId, { message: message, allow: allow });
      redisClient.set(
        KEYS.OVERTIME_V2_LIVE_TRADE_ADAPTER_MESSAGES[networkId],
        JSON.stringify([...messagesMap]),
        function () {},
      );
      try {
        res.send();
      } catch (e) {
        console.log(e);
      }
    });
  } else {
    res.send("Wrong API key for writing live trading error message");
  }
});

app.get(ENDPOINTS.OVERTIME_V2_LIVE_TRADING_ADAPTER_MESSAGE_READ, (req, res) => {
  const requestId = req.params.requestId;
  const networkId = req.params.networkParam;

  redisClient.get(KEYS.OVERTIME_V2_LIVE_TRADE_ADAPTER_MESSAGES[networkId], function (err, obj) {
    const messagesMap = new Map(JSON.parse(obj));
    const message = messagesMap.get(requestId);
    try {
      res.send(message);
    } catch (e) {
      console.log(e);
    }
  });
});

// V1 Digital Options and Sport Markets API with cache response logic
app.use("/v1/stakers", stakersRoutes);
app.use("/v1/digital-options", digitalOptionsRoutes);
app.use("/v1/sport-markets", sportMarketsRoutes);
app.use("/v1/cache-control", cacheControlRoutes);

// Contract listeners
initializeSportsAMMBuyListener();
initializeParlayAMMBuyListener();
initializeSportsAMMLPListener();
initializeParlayAMMLPListener();
