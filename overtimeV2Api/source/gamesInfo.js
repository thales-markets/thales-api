require("dotenv").config();

const redis = require("redis");
const { delay } = require("../../overtimeApi/utils/general");
const { SPORTS_MAP, SPORT_ID_MAP_ENETPULSE, SPORT_ID_MAP_RUNDOWN } = require("../../overtimeApi/constants/tags");
const axios = require("axios");
const { format, addDays, subDays } = require("date-fns");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { getIsEnetpulseSportV2, getIsJsonOddsSport } = require("../../overtimeApi/utils/markets");

const AMERICAN_SPORTS = [1, 2, 3, 4, 5, 6, 8, 10, 20, 21];
const numberOfDaysInPast = Number(process.env.PROCESS_GAMES_INFO_NUMBER_OF_DAYS_IN_PAST);
const numberOfDaysInFuture = Number(process.env.PROCESS_GAMES_INFO_NUMBER_OF_DAYS_IN_FUTURE);

async function processGamesInfo() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          console.log("process games info");
          await processAllGamesInfo();
        } catch (error) {
          console.log("games info error: ", error);
        }

        await delay(10 * 60 * 1000);
      }
    }, 3000);
  }
}

const procesRundownGamesInfoPerDate = async (sports, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId - 9000;
    const rundownSport = SPORT_ID_MAP_RUNDOWN[sport];

    console.log(`Getting games info for Rundown sport: ${rundownSport}, ${sport} and date ${formattedDate}`);
    const apiUrl = `https://therundown.io/api/v1/sports/${rundownSport}/events/${formattedDate}?key=${process.env.RUNDOWN_API_KEY}`;
    const response = await axios.get(apiUrl);

    response.data.events.forEach((event) => {
      if (event.event_id && event.teams_normalized) {
        const gameId = bytes32({ input: event.event_id });
        gamesInfoMap.set(
          gameId,
          event.teams_normalized.map((team) => ({
            name: AMERICAN_SPORTS.includes(sport) ? `${team.name} ${team.mascot}` : team.name,
            isHome: team.is_home,
            score: team.is_home ? event.score.score_home : event.score.score_away,
            scoreByPeriod: team.is_home ? event.score.score_home_by_period : event.score.score_away_by_period,
          })),
        );
      }
    });

    await delay(1 * 1000);
  }
};

const getEnetpulseScore = (results, resultCode) => {
  const finalScore = results.find((result) => result.result_code == resultCode);
  if (finalScore) {
    return Number(finalScore.value);
  }
  return 0;
};

const procesEnetpulseGamesInfoPerDate = async (sports, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId - 9000;
    const enetpulseSport = SPORT_ID_MAP_ENETPULSE[sport];

    console.log(`Getting games info for Enetpulse sport: ${enetpulseSport}, ${sport} and date ${formattedDate}`);
    const apiUrl = `https://eapi.enetpulse.com/event/daily/?tournament_templateFK=${enetpulseSport}&date=${formattedDate}&username=${process.env.ENETPULSE_USERNAME}&token=${process.env.ENETPULSE_TOKEN}&includeEventProperties=no`;
    const response = await axios.get(apiUrl);

    Object.values(response.data.events).forEach((event) => {
      if (event.id && event.event_participants) {
        const gameId = bytes32({ input: event.id });
        gamesInfoMap.set(
          gameId,
          Object.values(event.event_participants).map((team) => ({
            name: team.participant.name,
            isHome: team.number === "1",
            score: team.result ? getEnetpulseScore(Object.values(team.result), "ordinarytime") : 0,
            // TODO: add logic for other sports
            scoreByPeriod: [team.result ? getEnetpulseScore(Object.values(team.result), "halftime") : 0],
          })),
        );
      }
    });

    await delay(1 * 1000);
  }
};

async function processAllGamesInfo() {
  const startDate = subDays(new Date(), numberOfDaysInPast);
  let gamesInfoMap = new Map();
  redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
    gamesInfoMap = new Map(JSON.parse(obj));
  });

  for (let i = 0; i <= numberOfDaysInPast + numberOfDaysInFuture; i++) {
    const formattedDate = format(addDays(startDate, i), "yyyy-MM-dd");
    console.log(`Getting games info for date: ${formattedDate}`);

    const allSports = Object.keys(SPORTS_MAP);
    const rundownSports = allSports.filter((sport) => !getIsEnetpulseSportV2(sport) && !getIsJsonOddsSport(sport));
    const enetpulseSports = allSports.filter((sport) => getIsEnetpulseSportV2(sport));

    await Promise.all([
      procesRundownGamesInfoPerDate(rundownSports, formattedDate, gamesInfoMap),
      procesEnetpulseGamesInfoPerDate(enetpulseSports, formattedDate, gamesInfoMap),
    ]);
  }

  console.log(`Number of games info: ${Array.from(gamesInfoMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]), function () {});
}

module.exports = {
  processGamesInfo,
};
