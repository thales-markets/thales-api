const redis = require("redis");
const KEYS = require("./redis/redis-keys");
const bearerToken =
  "AAAAAAAAAAAAAAAAAAAAAAPYUQEAAAAAx%2FGZtMGWAFJ%2BphCQciCzs7hIxzI%3DaxjEg5QRRADRu4Qjqm3KLXMm5xRhxpTe4ouMV3lqrHsmgYnHRj";
const { TwitterApi } = require("twitter-api-v2");
const twitterClient = new TwitterApi(bearerToken);
const { delay } = require("./services/utils");
const THREE_MONTHS = 1000 /*ms*/ * 60 /*s*/ * 60 /*min*/ * 24 /*h*/ * 30 /*days*/ * 3; /*months*/
const keyTweet = "I'm joining the @Thalesmarket trading competition with address";
const verifiedUsers = new Set();
const verifiedTwitterIds = new Set();
const twitterAccMap = new Map();

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("Verify Accounts");
        await verifyAccounts();
      } catch (e) {
        console.log("Verify Accounts Error: ", e);
      }
      await delay(5 * 1000);
    }
  }, 3000);
}

async function verifyAccounts() {
  const searchResult = await twitterClient.search(keyTweet, {
    expansions: "author_id",
    "user.fields": "created_at,profile_image_url,name,username",
    max_results: 100,
  });

  const tweets = searchResult.data.data;
  const users = searchResult.includes.users;

  if (tweets) {
    const usersInfoMap = users.reduce(function (map, user) {
      map[user.id] = {
        createdAt: user.created_at,
        avatar: user.profile_image_url,
        name: user.name,
        twitter: "https://twitter.com/" + user.username,
      };
      return map;
    }, {});

    tweets.map((tweet) => {
      if (tweet.text.startsWith(keyTweet) && !verifiedTwitterIds.has(tweet.author_id)) {
        const dotPosition = tweet.text.indexOf(".");
        const address = tweet.text.substring(keyTweet.length, dotPosition).trim().toLowerCase();
        const createdDate = new Date(usersInfoMap[tweet.author_id].createdAt);
        if (!verifiedUsers.has(address) && new Date() - createdDate > THREE_MONTHS) {
          verifiedUsers.add(address);
          verifiedTwitterIds.add(tweet.author_id);
          twitterAccMap.set(address, usersInfoMap[tweet.author_id]);
        }
      }
    });
  }

  if (process.env.REDIS_URL) {
    const users = Array.from(verifiedUsers);
    redisClient.set(KEYS.VERIFIED_ACCOUNTS, JSON.stringify(users));
    redisClient.set(KEYS.TWITTER_ACCOUNTS, JSON.stringify([...twitterAccMap]), function () {});
  }
}
