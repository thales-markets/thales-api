require("dotenv").config();

const redis = require("redis");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");

let thalesIODuneDataMap = new Map();

if (process.env.REDIS_URL && process.env.DUNE_API_KEY) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.get(KEYS.THALES_IO_STATS, function (err, obj) {
    const thalesIOMapRaw = obj;
    console.log("thalesIOMapRaw:" + thalesIOMapRaw);
    if (thalesIOMapRaw) {
      thalesIODuneDataMap = new Map(JSON.parse(thalesIOMapRaw));
    }
  });

  redisClient.on("error", function (error) {
    console.error(error);
  });

  setTimeout(async () => {
    while (true) {
      try {
        console.log("fetch thales io data from dune");
        await fetchDuneData();
      } catch (error) {
        console.log("error fetching thales io data from dune: ", error);
      }

      await delay(24 * 60 * 60 * 1000); // 24h 24 * 60 * 60 * 1000
    }
  }, 3000);
}

async function fetchDuneData() {
  try {
    const thalesStats = await fetch(
      "https://api.dune.com/api/v1/query/3350848/results?api_key=" + process.env.DUNE_API_KEY,
    );
    const thalesStatsJson = await thalesStats.json();

    // Optional chaining not available in version 12 of node
    if ((((thalesStatsJson || {}).result || {}).rows || [])[0]) {
      thalesIODuneDataMap = new Map(Object.entries(thalesStatsJson.result.rows[0]));

      redisClient.set(KEYS.THALES_IO_STATS, JSON.stringify([...thalesIODuneDataMap]), function () {});
    }
  } catch (e) {
    console.log(e);
  }
}
