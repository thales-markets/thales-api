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
  if ([10, 420, 42161].includes(Number(network))) {
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
