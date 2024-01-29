const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const PushNotifications = require("node-pushnotifications");

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

const publicVapidKey = process.env.PUBLIC_VAPID_KEY; // REPLACE_WITH_YOUR_KEY
const privateVapidKey = process.env.PRIVATE_VAPID_KEY; //REPLACE_WITH_YOUR_KEY

app.post("/subscribe", (req, res) => {
  // Get pushSubscription object
  const subscription = req.body;
  console.log(subscription);
  const settings = {
    web: {
      vapidDetails: {
        subject: "mailto: " + process.env.EMAIL_PUSH,
        publicKey: publicVapidKey,
        privateKey: privateVapidKey,
      },
      gcmAPIKey: "gcmkey",
      TTL: 2419200,
      contentEncoding: "aes128gcm",
      headers: {},
    },
    isAlwaysUseFCM: false,
  };

  // Send 201 - resource created
  const push = new PushNotifications(settings);

  // Create payload
  const payload = { title: "New NFL games added" };
  push.send(subscription, payload, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
    }
  });
});

const port = 3002;

app.listen(port, () => console.log(`Server started on port ${port}`));
