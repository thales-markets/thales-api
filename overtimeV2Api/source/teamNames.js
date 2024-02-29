require("dotenv").config();

const redis = require("redis");
const { delay } = require("../../overtimeApi/utils/general");
const { SPORTS_MAP, JSON_ODDS_SPORTS, ENETPULSE_SPORTS } = require("../../overtimeApi/constants/tags");
const axios = require("axios");
const { format, addDays, subDays } = require("date-fns");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { getIsEnetpulseSport, getIsJsonOddsSport } = require("../../overtimeApi/utils/markets");

let teamNamesMap = new Map();

const AMERICAN_SPORTS = [1, 2, 3, 4, 5, 6, 8, 10, 20, 21];
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

const procesRundownTeamNamesPerDate = async (sports, formattedDate) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId - 9000;

    const apiUrl = `https://therundown.io/api/v1/sports/${sport}/events/${formattedDate}?key=${process.env.RUNDOWN_API_KEY}`;
    const response = await axios.get(apiUrl);

    response.data.events.forEach((event) => {
      if (event.event_id && event.teams_normalized) {
        const gameId = bytes32({ input: event.event_id });
        teamNamesMap.set(
          gameId,
          event.teams_normalized.map((team) => ({
            name: AMERICAN_SPORTS.includes(sport) ? `${team.name} ${team.mascot}` : team.name,
            isHome: team.is_home,
          })),
        );
      }
    });
  }
};

const procesEnetpulseTeamNamesPerDate = async (sports, formattedDate) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId - 9000;

    const apiUrl = `https://eapi.enetpulse.com/event/daily/?tournament_templateFK=${sport}&date=${formattedDate}&username=${process.env.ENETPULSE_USERNAME}&token=${process.env.ENETPULSE_TOKEN}&includeEventProperties=no`;
    const response = await axios.get(apiUrl);

    Object.values(response.data.events).forEach((event) => {
      if (event.id && event.event_participants) {
        const gameId = bytes32({ input: event.id });
        teamNamesMap.set(
          gameId,
          Object.values(event.event_participants).map((team) => ({
            name: team.participant.name,
            isHome: team.number === "1",
          })),
        );
      }
    });
  }
};

async function processAllTeamNames() {
  const startDate = subDays(TODAYS_DATE, numberOfDaysInPast);

  for (let i = 0; i <= numberOfDaysInPast + numberOfDaysInFuture; i++) {
    const formattedDate = format(addDays(startDate, i), "yyyy-MM-dd");
    console.log(`Getting team names for date: ${formattedDate}`);

    const allSports = Object.keys(SPORTS_MAP);
    const rundownSports = allSports.filter((sport) => !getIsEnetpulseSport(sport) && !getIsJsonOddsSport(sport));
    const enetpulseSports = allSports.filter((sport) => getIsEnetpulseSport(sport));

    await Promise.all([
      procesRundownTeamNamesPerDate(rundownSports, formattedDate),
      procesEnetpulseTeamNamesPerDate(enetpulseSports, formattedDate),
    ]);
  }

  redisClient.set(KEYS.OVERTIME_V2_TEAM_NAMES, JSON.stringify([...teamNamesMap]), function () {});
}

module.exports = {
  processTeamNames,
};
