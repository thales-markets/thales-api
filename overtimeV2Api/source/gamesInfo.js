const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const { format, addDays, subDays } = require("date-fns");
const bytes32 = require("bytes32");
const KEYS = require("../../redis/redis-keys");
const { EnetpulseRounds } = require("../constants/markets");
const {
  LeagueMap,
  Provider,
  LeagueIdMapEnetpulse,
  LeagueIdMapRundown,
  LeagueIdMapOpticOdds,
  League,
  AMERICAN_LEAGUES,
  PeriodType,
  Sport,
} = require("overtime-live-trading-utils");
const { getLeaguePeriodType, getLeagueSport } = require("overtime-live-trading-utils");
const { MAX_NUMBER_OF_SCORE_PERIODS } = require("../constants/opticOdds");
const { upperFirst } = require("lodash");
const { fetchOpticOddsResults, mapOpticOddsApiResults } = require("../utils/opticOddsResults");
const { fetchOpticOddsFixtures } = require("../utils/opticOddsFixtures");

const numberOfDaysInPast = Number(process.env.PROCESS_GAMES_INFO_NUMBER_OF_DAYS_IN_PAST);
const numberOfDaysInFuture = Number(process.env.PROCESS_GAMES_INFO_NUMBER_OF_DAYS_IN_FUTURE);

async function processGamesInfo() {
  if (process.env.REDIS_URL) {
    console.log("Games info: create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Games info: process games info");
          await processAllGamesInfo();
          const endTime = new Date().getTime();
          console.log(
            `Games info: === Seconds for processing games info: ${((endTime - startTime) / 1000).toFixed(0)} ===`,
          );
        } catch (error) {
          console.log("Games info: games info error: ", error);
        }

        await delay(10 * 60 * 1000); // 10min
      }
    }, 3000);
  }
}

const getRundownScore = (team, event, league) => {
  let score = undefined;

  if (league === League.UFC) {
    const numberOfRounds = Number(event.score?.game_period);
    const lastRoundEndTimeInfo = event.score?.event_status_detail.split(",");

    if (lastRoundEndTimeInfo.length > 0) {
      const lastRoundEndTimeNumber = Number(
        lastRoundEndTimeInfo[lastRoundEndTimeInfo.length - 1].trim().replace(":", "."),
      );
      let numberOfRoundsResult;
      if (lastRoundEndTimeNumber >= 2.3) {
        numberOfRoundsResult = numberOfRounds;
      } else {
        numberOfRoundsResult = Number(numberOfRounds) == 1 ? numberOfRounds : numberOfRounds - 1;
      }

      score =
        (team.is_home ? Number(event.score?.winner_home) : Number(event.score?.winner_away)) == 1
          ? numberOfRoundsResult
          : 0;
    }
  } else {
    score = team.is_home ? event.score?.score_home : event.score?.score_away;
  }
  return score;
};

const procesRundownGamesInfoPerDate = async (leagues, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < leagues.length; j++) {
    const league = Number(leagues[j]);
    const rundownLeague = LeagueIdMapRundown[league];

    // console.log(`Getting games info for Rundown sport: ${rundownLeague}, ${league} and date ${formattedDate}`);
    const apiUrl = `https://therundown.io/api/v1/sports/${rundownLeague}/events/${formattedDate}?key=${process.env.RUNDOWN_API_KEY}`;
    const response = await axios.get(apiUrl);

    response.data.events.forEach((event) => {
      if (event.event_id) {
        const gameId = bytes32({ input: event.event_id });
        gamesInfoMap.set(gameId, {
          lastUpdate: new Date().getTime(),
          gameStatus: event.score.event_status,
          isGameFinished:
            event.score.event_status === "STATUS_FINAL" ||
            event.score.event_status === "STATUS_FULL_TIME" ||
            event.score.event_status === "STATUS_CANCELED",
          tournamentName: "",
          tournamentRound: "",
          provider: Provider.RUNDOWN,
          teams: event.teams_normalized
            ? event.teams_normalized.map((team) => ({
                name: AMERICAN_LEAGUES.includes(league) ? `${team.name} ${team.mascot}` : team.name,
                isHome: team.is_home,
                score: getRundownScore(team, event, league),
                scoreByPeriod: team.is_home ? event.score.score_home_by_period : event.score.score_away_by_period,
              }))
            : [],
        });
      }
    });

    // await delay(1 * 1000);
  }
};

const getEnetpulseScoreByCode = (results, resultCode) => {
  const finalScore = results.find((result) => result.result_code == resultCode);
  if (finalScore !== undefined) {
    return Number(finalScore.value);
  }
  return undefined;
};

const getEnetpulseScore = (results, league) => {
  let score = undefined;
  const scoreByPeriod = [];

  const periodType = getLeaguePeriodType(league);

  if (periodType === PeriodType.QUARTER) {
    score = getEnetpulseScoreByCode(Object.values(results), "finalresult");
    for (let i = 1; i <= 4; i++) {
      const code = `quarter${i}`;
      const periodScore = getEnetpulseScoreByCode(Object.values(results), code);
      if (periodScore !== undefined) {
        scoreByPeriod.push(periodScore);
      } else {
        break;
      }
    }
  } else if (periodType === PeriodType.SET) {
    score = getEnetpulseScoreByCode(Object.values(results), "setswon");
    for (let i = 1; i <= 7; i++) {
      const code = `set${i}`;
      const periodScore = getEnetpulseScoreByCode(Object.values(results), code);
      if (periodScore !== undefined) {
        scoreByPeriod.push(periodScore);
      } else {
        break;
      }
    }
  } else if (league === League.CSGO || league === League.DOTA2 || league === League.LOL) {
    score = getEnetpulseScoreByCode(Object.values(results), "finalresult");
  } else {
    score = getEnetpulseScoreByCode(Object.values(results), "ordinarytime");
    const periodScore = getEnetpulseScoreByCode(Object.values(results), "halftime");
    if (periodScore !== undefined) {
      scoreByPeriod.push(periodScore);
    }
  }
  return {
    score,
    scoreByPeriod,
  };
};

const procesEnetpulseGamesInfoPerDate = async (leagues, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < leagues.length; j++) {
    const league = Number(leagues[j]);
    const enetpulseLeague = LeagueIdMapEnetpulse[league];

    // console.log(`Getting games info for Enetpulse sport: ${enetpulseLeague}, ${league} and date ${formattedDate}`);
    const apiUrl = `https://eapi.enetpulse.com/event/daily/?tournament_templateFK=${enetpulseLeague}&date=${formattedDate}&username=${process.env.ENETPULSE_USERNAME}&token=${process.env.ENETPULSE_TOKEN}&includeEventProperties=no`;
    const response = await axios.get(apiUrl);

    Object.values(response.data.events).forEach((event) => {
      if (event.id) {
        const gameId = bytes32({ input: event.id });
        gamesInfoMap.set(gameId, {
          lastUpdate: new Date().getTime(),
          gameStatus: event.status_type,
          isGameFinished: event.status_type === "finished" || event.status_type === "cancelled",
          tournamentName: event.tournament_stage_name,
          tournamentRound: EnetpulseRounds[Number(event.round_typeFK)],
          provider: Provider.ENETPULSE,
          teams: event.event_participants
            ? Object.values(event.event_participants).map((team) => ({
                name: team.participant.name,
                isHome: team.number === "1",
                ...(team.result
                  ? getEnetpulseScore(Object.values(team.result), league)
                  : {
                      score: undefined,
                      scoreByPeriod: [],
                    }),
              }))
            : [],
        });
      }
    });

    await delay(5);
  }
};

const getOpticOddsScoreByCode = (gameScores, code) => {
  const score = gameScores[code];
  if (score !== undefined) {
    return Number(score);
  }
  return undefined;
};

const getOpticOddsScore = (gameScores, league, homeAwayType) => {
  let score = undefined;
  const scoreByPeriod = [];
  const leagueSport = getLeagueSport(league);

  if (gameScores) {
    if (league === League.UFC) {
      const numberOfRounds = Number(gameScores.period);
      const lastRoundEndTimeNumber = Number(gameScores.clock.replace(":", "."));

      let numberOfRoundsResult;
      if (lastRoundEndTimeNumber >= 2.3) {
        numberOfRoundsResult = numberOfRounds;
      } else {
        numberOfRoundsResult = Number(numberOfRounds) == 1 ? numberOfRounds : numberOfRounds - 1;
      }
      score = getOpticOddsScoreByCode(gameScores, `score_${homeAwayType}_total`) == 1 ? numberOfRoundsResult : 0;
    } else if (leagueSport !== Sport.SOCCER) {
      score = getOpticOddsScoreByCode(gameScores, `score_${homeAwayType}_total`);
      for (let i = 1; i <= MAX_NUMBER_OF_SCORE_PERIODS; i++) {
        const code = `score_${homeAwayType}_period_${i}`;
        const periodScore = getOpticOddsScoreByCode(gameScores, code);
        if (periodScore !== undefined) {
          scoreByPeriod.push(periodScore);
        } else {
          break;
        }
      }
    } else {
      // soccer
      const periodScore1 = getOpticOddsScoreByCode(gameScores, `score_${homeAwayType}_period_1`);
      const periodScore2 = getOpticOddsScoreByCode(gameScores, `score_${homeAwayType}_period_2`);
      if (periodScore1 !== undefined) {
        scoreByPeriod.push(periodScore1);
      }
      score = (periodScore1 !== undefined ? periodScore1 : 0) + (periodScore2 !== undefined ? periodScore2 : 0);
    }
  }

  return {
    score,
    scoreByPeriod,
  };
};

const procesOpticOdssGamesInfo = async (leagues, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < leagues.length; j++) {
    const league = Number(leagues[j]);
    const opticOddsLeague = LeagueIdMapOpticOdds[league];

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      // console.log(
      //   `Getting games info for OpticOdds league: ${opticOddsLeague}, ${league}, date ${formattedDate} and page ${page}`,
      // );

      // API call for fixtures
      const opticOddsApiFixturesResponseData = await fetchOpticOddsFixtures(opticOddsLeague, formattedDate, page);
      if (opticOddsApiFixturesResponseData === null) {
        break; // continue with next league
      }

      page++;
      totalPages = Number(opticOddsApiFixturesResponseData.total_pages);

      // API call for results
      const opticOddsFixtureIds = opticOddsApiFixturesResponseData.data.map((data) => data.id);
      const opticOddsApiResults = await fetchOpticOddsResults(opticOddsFixtureIds);
      const opticOddsResult = mapOpticOddsApiResults(opticOddsApiResults);

      opticOddsApiFixturesResponseData.data.forEach((fixtureEvent) => {
        if (fixtureEvent.game_id) {
          const gameId = bytes32({ input: fixtureEvent.game_id });
          const gameResults = opticOddsResult.find((result) => result.fixture_id === fixtureEvent.id);
          const fixtureStatus = upperFirst(fixtureEvent.status); // adjust V3 to V2 format, from completed to Completed

          gamesInfoMap.set(gameId, {
            fixtureId: fixtureEvent.id,
            lastUpdate: new Date().getTime(),
            gameStatus: fixtureStatus,
            isGameFinished: fixtureStatus === "Completed" || fixtureStatus === "Cancelled",
            tournamentName: "",
            tournamentRound: "",
            provider: Provider.OPTICODDS,
            teams: [
              {
                name: fixtureEvent.home_team_display,
                isHome: true,
                ...(gameResults
                  ? getOpticOddsScore(gameResults, league, "home")
                  : {
                      score: undefined,
                      scoreByPeriod: [],
                    }),
              },
              {
                name: fixtureEvent.away_team_display,
                isHome: false,
                ...(gameResults
                  ? getOpticOddsScore(gameResults, league, "away")
                  : {
                      score: undefined,
                      scoreByPeriod: [],
                    }),
              },
            ],
          });
        }
      });

      await delay(5);
    }
  }
};

function getGamesInfoMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
      const gamesInfoMap = new Map(JSON.parse(obj));
      resolve(gamesInfoMap);
    });
  });
}

async function processAllGamesInfo() {
  const startDate = subDays(new Date(), numberOfDaysInPast);
  const gamesInfoMap = await getGamesInfoMap();

  const allLeagues = Object.values(LeagueMap);
  const rundownLeagues = allLeagues.filter((league) => league.provider === Provider.RUNDOWN).map((league) => league.id);
  const enetpulseLeagues = allLeagues
    .filter((league) => league.provider === Provider.ENETPULSE)
    .map((league) => league.id);
  const opticOddsLeagues = allLeagues
    .filter((league) => league.provider === Provider.OPTICODDS)
    .map((league) => league.id);

  for (let i = 0; i <= numberOfDaysInPast + numberOfDaysInFuture; i++) {
    const formattedDate = format(addDays(startDate, i), "yyyy-MM-dd");
    console.log(`Games info: Getting games info for date: ${formattedDate}`);

    await Promise.all([
      procesRundownGamesInfoPerDate(rundownLeagues, formattedDate, gamesInfoMap),
      procesEnetpulseGamesInfoPerDate(enetpulseLeagues, formattedDate, gamesInfoMap),
      procesOpticOdssGamesInfo(opticOddsLeagues, formattedDate, gamesInfoMap),
    ]);

    console.log(
      `Games info: Number of games info for date ${formattedDate}: ${Array.from(gamesInfoMap.values()).length}`,
    );
    redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]), function () {});
  }

  // TODO hardcode US Election 2024
  gamesInfoMap.set("0x3764616430383334656435643464643038386661336166643230613033343336", {
    lastUpdate: new Date().getTime(),
    gameStatus: "",
    isGameFinished: false,
    tournamentName: "",
    tournamentRound: "",
    provider: Provider.EMPTY,
    teams: [
      {
        name: "US Election 2024",
        isHome: true,
        score: undefined,
        scoreByPeriod: [],
      },
      {
        name: "",
        isHome: false,
        score: undefined,
        scoreByPeriod: [],
      },
    ],
  });

  console.log(`Games info: Total number of games info: ${Array.from(gamesInfoMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]), function () {});
}

module.exports = {
  processGamesInfo,
  getOpticOddsScore,
};
