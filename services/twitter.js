const { TwitterApi } = require("twitter-api-v2");

const THREE_MONTHS =
  1000 /*ms*/ * 60 /*s*/ * 60 /*min*/ * 24 /*h*/ * 30 /*days*/ * 3; /*months*/

const bearerToken =
  "AAAAAAAAAAAAAAAAAAAAAGz6TQEAAAAA8WX%2FHd3qh7tphr62GpkPpy6Me2c%3D5G4axPWp5ANxy2a4sAwir5mi7wZRGKV39TqFqlly6tuPL7mAJL";

const twitterClient = new TwitterApi(bearerToken);

const keyTweet =
  "Please let me join the Thales trading competition with address";

async function verifyAccounts() {
  const searchResult = await twitterClient.search(keyTweet, {
    expansions: "author_id",
    "user.fields": "created_at",
  });

  const tweets = searchResult.data.data;
  const users = searchResult.includes.users;

  if (tweets) {
    const createdAt = users.reduce(function (map, user) {
      map[user.id] = user.created_at;
      return map;
    }, {});

    tweets.map((tweet) => {
      if (!verifiedTwitterIds.has(tweet.author_id)) {
        const address = tweet.text
          .substring(keyTweet.length)
          .trim()
          .toLowerCase();
        const createdDate = new Date(createdAt[tweet.author_id]);
        if (
          !verifiedUsers.has(address) &&
          new Date() - createdDate > THREE_MONTHS
        ) {
          verifiedUsers.add(address);
          verifiedTwitterIds.add(tweet.author_id);
        }
      }
    });
  }
}

async function checkAddress(walletAddress) {
  const searchResult = await twitterClient.search(
    keyTweet + " " + walletAddress,
    {
      expansions: "author_id",
      "user.fields": "created_at",
    }
  );

  const tweets = searchResult.data.data;
  const users = searchResult.includes.users;

  if (tweets) {
    const createdAt = users.reduce(function (map, user) {
      map[user.id] = user.created_at;
      return map;
    }, {});

    tweets.map((tweet) => {
      if (!verifiedTwitterIds.has(tweet.author_id)) {
        const createdDate = new Date(createdAt[tweet.author_id]);
        if (
          !verifiedUsers.has(walletAddress) &&
          new Date() - createdDate > THREE_MONTHS
        ) {
          verifiedUsers.add(walletAddress);
          verifiedTwitterIds.add(tweet.author_id);
        }
      }
    });
  }

  if (verifiedUsers.has(walletAddress)) {
    return true;
  } else {
    return false;
  }
}

module.exports = {
  verifyAccounts,
  checkAddress,
};
