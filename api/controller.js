require("dotenv").config();
const express = require("express");
const app = express();

var cors = require("cors");
app.use(cors());
app.use(express.json());

const ENDPOINTS = require("./endpoints");
const sigUtil = require("eth-sig-util");

const { checkAddress } = require("../services/twitter");

app.listen(process.env.PORT || 3002, () => {
  console.log("Server running on port " + (process.env.PORT || 3002));
});

app.get(ENDPOINTS.ROOT, (req, res) => {
  res.sendStatus(200);
});

app.get(ENDPOINTS.OPTIONS, (req, res) => {
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

app.get(ENDPOINTS.WATCHLIST_ADDRESS, (req, res) => {
  let walletAddress = req.params.walletAddressParam;
  let network = req.params.networkParam;
  if (network == 1) {
    res.send({ data: mainnetWatchlistMap.get(walletAddress) });
  } else {
    res.send({ data: ropstenWatchlistMap.get(walletAddress) });
  }
});

app.get(ENDPOINTS.LEADERBOARD, (req, res) => {
  let network = req.params.networkParam;
  if (network == 1) {
    res.send({ data: Array.from(leaderboardMainnetMap) });
  } else {
    res.send({ data: Array.from(leaderboardRopstenMap) });
  }
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
  let walletAddress = req.params.walletAddress.toLowerCase();
  res.send(verifiedUsers.has(walletAddress));
});

app.get(ENDPOINTS.TWITTER_CHECK, (req, res) => {
  let walletAddress = req.params.walletAddress.toLowerCase();
  checkAddress(walletAddress).then((val) => {
    res.send(val);
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

app.get(ENDPOINTS.TOKEN, (req, res) => {
  res.send(tokenMap);
});
