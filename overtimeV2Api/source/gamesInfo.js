const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const axios = require("axios");
const { format, addDays, subDays } = require("date-fns");
const KEYS = require("../../redis/redis-keys");
const { EnetpulseRounds } = require("../constants/markets");
const {
  LeagueMap,
  Provider,
  LeagueIdMapEnetpulse,
  LeagueIdMapOpticOdds,
  League,
  PeriodType,
  Sport,
  mapFromOpticOddsFormatToBytes32,
} = require("overtime-live-trading-utils");
const { getLeaguePeriodType, getLeagueSport } = require("overtime-live-trading-utils");
const { MAX_NUMBER_OF_SCORE_PERIODS } = require("../constants/opticOdds");
const { fetchOpticOddsResults, mapOpticOddsApiResults } = require("../utils/opticOdds/opticOddsResults");
const { fetchOpticOddsFixtures } = require("../utils/opticOdds/opticOddsFixtures");
const { NETWORK } = require("../constants/networks");

const numberOfDaysInPast = Number(process.env.PROCESS_GAMES_INFO_NUMBER_OF_DAYS_IN_PAST);
const numberOfDaysInFuture = Number(process.env.PROCESS_GAMES_INFO_NUMBER_OF_DAYS_IN_FUTURE);

async function processGamesInfo() {
  if (process.env.REDIS_URL) {
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
        const gameId = mapFromOpticOddsFormatToBytes32(event.id);
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

  try {
    if (gameScores) {
      if (league === League.UFC) {
        if (gameScores.clock === null) {
          return {
            score,
            scoreByPeriod,
          };
        }
        const numberOfRounds = Number(gameScores.period);
        const lastRoundEndTimeNumber = Number(gameScores.clock.replace(":", "."));

        let numberOfRoundsResult;
        if (lastRoundEndTimeNumber >= 2.3) {
          numberOfRoundsResult = numberOfRounds;
        } else {
          numberOfRoundsResult = Number(numberOfRounds) == 1 ? numberOfRounds : numberOfRounds - 1;
        }
        score = getOpticOddsScoreByCode(gameScores, `${homeAwayType}Total`) == 1 ? numberOfRoundsResult : 0;
      } else if (leagueSport !== Sport.SOCCER) {
        score = getOpticOddsScoreByCode(gameScores, `${homeAwayType}Total`);
        for (let i = 1; i <= MAX_NUMBER_OF_SCORE_PERIODS; i++) {
          const code = `${homeAwayType}Period${i}`;
          const periodScore = getOpticOddsScoreByCode(gameScores, code);
          if (periodScore !== undefined) {
            scoreByPeriod.push(periodScore);
          } else {
            break;
          }
        }
      } else {
        // soccer
        const periodScore1 = getOpticOddsScoreByCode(gameScores, `${homeAwayType}Period1`);
        const periodScore2 = getOpticOddsScoreByCode(gameScores, `${homeAwayType}Period2`);
        if (periodScore1 !== undefined) {
          scoreByPeriod.push(periodScore1);
        }
        score = (periodScore1 !== undefined ? periodScore1 : 0) + (periodScore2 !== undefined ? periodScore2 : 0);
      }
    }
  } catch (e) {
    console.log(`Games info error during getOpticOddsScore: ${e}`);
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
        if (fixtureEvent.id) {
          const gameId = mapFromOpticOddsFormatToBytes32(fixtureEvent.id);
          const gameResults = opticOddsResult.find((result) => result.gameId === fixtureEvent.id);
          const fixtureStatus = fixtureEvent.status.toLowerCase();

          gamesInfoMap.set(gameId, {
            lastUpdate: new Date().getTime(),
            gameStatus: fixtureStatus,
            isGameFinished: fixtureStatus === "completed" || fixtureStatus === "cancelled",
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

async function getOpenMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
  const openMarkets = new Map(JSON.parse(obj));
  return openMarkets;
}

async function getGamesInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
}

async function processAllGamesInfo() {
  const startDate = subDays(new Date(), numberOfDaysInPast);
  const gamesInfoMap = await getGamesInfoMap();

  const allLeagues = Object.values(LeagueMap);
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
      procesEnetpulseGamesInfoPerDate(enetpulseLeagues, formattedDate, gamesInfoMap),
      procesOpticOdssGamesInfo(opticOddsLeagues, formattedDate, gamesInfoMap),
    ]);

    console.log(
      `Games info: Number of games info for date ${formattedDate}: ${Array.from(gamesInfoMap.values()).length}`,
    );
    redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]));
  }

  // Get Futures and Politics game info from open markets
  const openMarketsMap = await getOpenMarketsMap(NETWORK.Optimism);
  const futuresMarkets = Array.from(openMarketsMap.values()).filter(
    (market) => market.sport === Sport.FUTURES || market.sport === Sport.POLITICS,
  );

  futuresMarkets.forEach((market) => {
    gamesInfoMap.set(market.gameId, {
      lastUpdate: new Date().getTime(),
      gameStatus: "",
      isGameFinished: false,
      tournamentName: "",
      tournamentRound: "",
      provider: Provider.EMPTY,
      teams: [
        {
          name: market.homeTeam,
          isHome: true,
          score: undefined,
          scoreByPeriod: [],
        },
        {
          name: market.awayTeam,
          isHome: false,
          score: undefined,
          scoreByPeriod: [],
        },
      ],
    });
  });

  console.log(`Games info: Total number of games info: ${Array.from(gamesInfoMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO, JSON.stringify([...gamesInfoMap]));
}

module.exports = {
  processGamesInfo,
  getOpticOddsScore,
};
