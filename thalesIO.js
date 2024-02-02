require("dotenv").config();

const redis = require("redis");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");

let thalesIODuneDataMap = new Map();
let thalesIOWeeklyDuneDataMap = new Map();

let dailyStatsDisableFirstRunExecution = true;
let weeklyStatsDisableFirstRunExecution = false;

if (process.env.REDIS_URL && process.env.DUNE_API_KEY) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.get(KEYS.THALES_IO_DAILY_STATS, function (err, obj) {
    const thalesIOMapRaw = obj;
    console.log("thalesIOMapRaw:" + thalesIOMapRaw);
    if (thalesIOMapRaw) {
      thalesIODuneDataMap = new Map(JSON.parse(thalesIOMapRaw));
    }
  });

  redisClient.get(KEYS.THALES_IO_WEEKLY_STATS, function (err, obj) {
    const thalesIOMapRaw = obj;
    console.log("thalesIOWeeklyMapRaw:" + thalesIOMapRaw);
    if (thalesIOMapRaw) {
      thalesIOWeeklyDuneDataMap = new Map(JSON.parse(thalesIOMapRaw));
    }
  });

  redisClient.on("error", function (error) {
    console.error(error);
  });

  setTimeout(async () => {
    while (true) {
      try {
        if (!dailyStatsDisableFirstRunExecution) {
          console.log("fetch daily thales io data from dune");
          await fetchDailyDuneData();
        } else {
          dailyStatsDisableFirstRunExecution = false;
        }
      } catch (error) {
        console.log("error fetching daily thales io data from dune: ", error);
      }

      await delay(24 * 60 * 60 * 1000); // 24h 24 * 60 * 60 * 1000
    }
  }, 3000);

  setTimeout(async () => {
    while (true) {
      try {
        if (!weeklyStatsDisableFirstRunExecution) {
          console.log("fetch weekly thales io data from dune");
          await fetchWeeklyDuneData();
        } else {
          weeklyStatsDisableFirstRunExecution = false;
        }
      } catch (error) {
        console.log("error fetching weekly thales io data from dune: ", error);
      }

      await delay(60 * 60 * 1000); // 1h 60 * 60 * 1000
    }
  }, 3000);
}

async function fetchDailyDuneData() {
  try {
    // executing queries costs credits, our API KEY has 2500 credits per month (80 daily)
    // current credits being spent daily: 20
    // current credits being spent weekly: 160

    // execute queries
    // 10 credits
    await fetch("https://api.dune.com/api/v1/query/3350848/execute?api_key=" + process.env.DUNE_API_KEY, {
      method: "POST",
    });
    // 10 credits
    await fetch("https://api.dune.com/api/v1/query/3387824/execute?api_key=" + process.env.DUNE_API_KEY, {
      method: "POST",
    });

    await delay(5 * 60 * 1000); // 5 minutes

    //fetch data
    const thalesStats = await fetch(
      "https://api.dune.com/api/v1/query/3350848/results?api_key=" + process.env.DUNE_API_KEY,
    );
    const thalesStatsJson = await thalesStats.json();
    const thalesTVLStats = await fetch(
      "https://api.dune.com/api/v1/query/3387824/results?api_key=" + process.env.DUNE_API_KEY,
    );
    const thalesTVLStatsJson = await thalesTVLStats.json();

    // Optional chaining not available in version 12 of node
    if (
      (((thalesStatsJson || {}).result || {}).rows || [])[0] &&
      (((thalesTVLStatsJson || {}).result || {}).rows || [])[0]
    ) {
      const allThalesStats = {
        ...thalesStatsJson.result.rows[0],
        ...thalesTVLStatsJson.result.rows.reduce((prev, curr) => {
          return { ...prev, [toSnakeCase(curr.category + " tvl")]: curr.tvl };
        }, {}),
      };
      thalesIODuneDataMap = new Map(Object.entries(allThalesStats));

      redisClient.set(KEYS.THALES_IO_DAILY_STATS, JSON.stringify([...thalesIODuneDataMap]), function () {});
    }
  } catch (e) {
    console.log(e);
  }
}

async function fetchWeeklyDuneData() {
  try {
    // executing queries costs credits, our API KEY has 2500 credits per month (80 daily)
    // current credits being spent daily: 20
    // current credits being spent weekly: 160

    // execute queries
    // 10 credits

    // check if current day is Thursday and between 6 PM and 7 PM UTC in order to refresh CCIP data and save Dune credits
    const now = new Date();

    if (now.getDay() == 4 && now.getUTCHours() == 18) {
      console.log("Thursday, time for fetching CCIP rev share data");
      await fetch("https://api.dune.com/api/v1/query/3099522/execute?api_key=" + process.env.DUNE_API_KEY, {
        method: "POST",
      });
      // 10 credits
      await fetch("https://api.dune.com/api/v1/query/3400360/execute?api_key=" + process.env.DUNE_API_KEY, {
        method: "POST",
      });

      await delay(5 * 60 * 1000); // 5 minutes
    }

    //fetch data
    const thalesSafeboxFees = await fetch(
      "https://api.dune.com/api/v1/query/3099522/results?api_key=" + process.env.DUNE_API_KEY,
    );
    const thalesSafeboxFeesJson = await thalesSafeboxFees.json();

    const thalesRevShare = await fetch(
      "https://api.dune.com/api/v1/query/3400360/results?api_key=" + process.env.DUNE_API_KEY,
    );
    const thalesRevShareJson = await thalesRevShare.json();

    // Optional chaining not available in version 12 of node
    if (
      (((thalesSafeboxFeesJson || {}).result || {}).rows || [])[0] &&
      (((thalesRevShareJson || {}).result || {}).rows || [])[0]
    ) {
      const thalesSafeboxFeesPerWeekResponse = [];
      thalesSafeboxFeesJson.result.rows.reduce(function (res, value) {
        if (!res[value.w]) {
          res[value.w] = {
            fee: 0,
            w: value.w,
          };
          thalesSafeboxFeesPerWeekResponse.push(res[value.w]);
        }
        res[value.w].fee += value.fee;
        return res;
      }, {});
      const thalesSafeboxFeesPerWeek = Object.values(thalesSafeboxFeesPerWeekResponse);

      thalesIOWeeklyDuneDataMap = new Map([
        ["safebox", thalesSafeboxFeesPerWeek],
        ["revShare", thalesRevShareJson.result.rows],
      ]);

      redisClient.set(KEYS.THALES_IO_WEEKLY_STATS, JSON.stringify([...thalesIOWeeklyDuneDataMap]), function () {});
    }
  } catch (e) {
    console.log(e);
  }
}

function toSnakeCase(str) {
  return str.replace(/ /g, "_").toLowerCase();
}
