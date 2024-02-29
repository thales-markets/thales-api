require("dotenv").config();

const redis = require("redis");
const { delay } = require("../../overtimeApi/utils/general");
const { SPORTS_MAP, JSON_ODDS_SPORTS, ENETPULSE_SPORTS } = require("../../overtimeApi/constants/tags");
const axios = require("axios");
const { format, addDays, subDays } = require("date-fns");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");

let teamNamesMap = new Map();

const TODAYS_DATE = new Date();
const numberOfDaysInPast = Number(process.env.PROCESS_TEAM_NAMES_NUMBER_OF_DAYS_IN_PAST);
const numberOfDaysInFuture = Number(process.env.PROCESS_TEAM_NAMES_NUMBER_OF_DAYS_IN_FUTURE);

async function processTeamNames() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          console.log("process markets");
          await processAllTeamNames();
        } catch (error) {
          console.log("markets error: ", error);
        }

        await delay(10 * 1000);
      }
    }, 3000);
  }
}

const procesRundownTeamNames = async () => {
  const startDate = subDays(TODAYS_DATE, numberOfDaysInPast);

  for (let i = 0; i <= numberOfDaysInPast + numberOfDaysInFuture; i++) {
    const allSports = Object.keys(SPORTS_MAP);
    const formattedDate = format(addDays(startDate, i), "yyyy-MM-dd");

    console.log(`Getting team names for date: ${formattedDate}`);

    for (let j = 0; j < allSports.length; j++) {
      const sportId = Number(allSports[j]);
      const isEnetpulseSport = ENETPULSE_SPORTS.includes(sportId);
      const isJsonOddsSport = JSON_ODDS_SPORTS.includes(sportId);

      if (isEnetpulseSport || isJsonOddsSport) continue;
      const sport = sportId - 9000;

      const apiUrl = `https://therundown.io/api/v1/sports/${sport}/events/${formattedDate}?key=${process.env.RUNDOWN_API_KEY}`;
      const response = await axios.get(apiUrl);

      response.data.events.forEach((event) => {
        const gameId = bytes32({ input: event.event_id });
        teamNamesMap.set(
          gameId,
          event.teams_normalized.map((team) => team.name),
        );
      });
    }
  }
};

async function processAllTeamNames() {
  await procesRundownTeamNames();
  redisClient.set(KEYS.OVERTIME_V2_TEAM_NAMES, JSON.stringify([...teamNamesMap]), function () {});
}

module.exports = {
  processTeamNames,
};
