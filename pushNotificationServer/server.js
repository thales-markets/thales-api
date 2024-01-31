console.log("jes");
require("dotenv").config();
const PushNotifications = require("node-pushnotifications");
let subscribers = new Set();
const redis = require("redis");
const KEYS = require("../redis/redis-keys");

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Set static path
app.use(express.static(path.join(__dirname, "client")));

app.use(bodyParser.json());
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

  // Request headers you wish to allow
  res.setHeader("Access-Control-Allow-Headers", "*");

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

console.log(process.env.PUBLIC_VAPID_KEY);

const SETTINGS = {
  web: {
    vapidDetails: {
      subject: "mailto: <gorstak@thalesmarket.io>",
      publicKey: "BCafw6fkkZll8BEesV3KjFjqpj7CtCgNDLpkUmPKmHxqPIt1GrYW5g6Xgr_BiGgkk5WlXDG-uUH31lhdqd4hJ1c",
      privateKey: "NOClDkYXMH8Q6LsTj9sw2SNrIWhH4FQ1R68iOUW4yxs",
    },
    gcmAPIKey: "gcmkey",
    TTL: 2419200,
    contentEncoding: "aes128gcm",
    headers: {},
  },
  isAlwaysUseFCM: false,
};

app.post("/subscribe", (req, res) => {
  // Get pushSubscription object
  const subscription = req.body;
  console.log(subscription);
  subscribers.add(subscription);
  // redisClient.set(KEYS.PUSH_SUBSCRIPTIONS, JSON.stringify(Array.from(subscribers)), function () {});
});

app.post("/push-notification", (req, res) => {
  // Send 201 - resource created
  const push = new PushNotifications(SETTINGS);
  // Create payload
  const payload = { title: "New NFL games added" };
  push.send(Array.from(subscribers), payload, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
    }
  });
});

const port = 3002;
app.listen(port, () => console.log(`Server started on port ${port}`));

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.get(KEYS.PUSH_SUBSCRIPTIONS, function (err, obj) {
    const subscribers_obj = obj;
    if (subscribers_obj) {
      subscribers = new Set(JSON.parse(subscribers_obj));
    }
  });

  redisClient.on("error", function (error) {
    console.error(error);
  });
}
