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
  AMERICAN_LEAGUES,
  League,
  LeagueIdMapOpticOdds,
  PeriodType,
  Sport,
} = require("overtime-live-trading-utils");
const { getLeaguePeriodType, getLeagueSport } = require("overtime-live-trading-utils");
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

        await delay(10 * 60 * 1000);
      }
    }, 3000);
  }
}

const getRundownScore = (team, event, sport) => {
  let score = undefined;

  if (sport === League.UFC) {
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

const procesRundownGamesInfoPerDate = async (sports, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId;
    const rundownSport = LeagueIdMapRundown[sport];

    // console.log(`Getting games info for Rundown sport: ${rundownSport}, ${sport} and date ${formattedDate}`);
    const apiUrl = `https://therundown.io/api/v1/sports/${rundownSport}/events/${formattedDate}?key=${process.env.RUNDOWN_API_KEY}`;
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
                name: AMERICAN_LEAGUES.includes(sport) ? `${team.name} ${team.mascot}` : team.name,
                isHome: team.is_home,
                score: getRundownScore(team, event, sport),
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

const getEnetpulseScore = (results, sport) => {
  let score = undefined;
  const scoreByPeriod = [];

  const periodType = getLeaguePeriodType(sport);

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
  } else if (sport === League.CSGO || sport === League.DOTA2 || sport === League.LOL) {
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

const procesEnetpulseGamesInfoPerDate = async (sports, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId;
    const enetpulseSport = LeagueIdMapEnetpulse[sport];

    // console.log(`Getting games info for Enetpulse sport: ${enetpulseSport}, ${sport} and date ${formattedDate}`);
    const apiUrl = `https://eapi.enetpulse.com/event/daily/?tournament_templateFK=${enetpulseSport}&date=${formattedDate}&username=${process.env.ENETPULSE_USERNAME}&token=${process.env.ENETPULSE_TOKEN}&includeEventProperties=no`;
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
                  ? getEnetpulseScore(Object.values(team.result), sport)
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

const getOpticOddsScore = (gameScores, sport, homeAwayType) => {
  let score = undefined;
  const scoreByPeriod = [];
  const leagueSport = getLeagueSport(sport);

  if (gameScores) {
    if (sport === League.UFC) {
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
      // set 50 as max number of periods
      for (let i = 1; i <= 50; i++) {
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

const procesOpticOdssGamesInfo = async (sports, formattedDate, gamesInfoMap) => {
  for (let j = 0; j < sports.length; j++) {
    const sportId = Number(sports[j]);
    const sport = sportId;
    const opticOddsSport = LeagueIdMapOpticOdds[sport];

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      // console.log(
      //   `Getting games info for OpticOdds sport: ${opticOddsSport}, ${sport}, date ${formattedDate} and page ${page}`,
      // );
      const schedulesApiUrl = `https://api.opticodds.com/api/v2/schedules/list?game_date=${formattedDate}&league=${opticOddsSport}&page=${page}`;
      const schedulesResponse = await axios.get(schedulesApiUrl, {
        headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
      });
      page++;
      totalPages = Number(schedulesResponse.data.total_pages);

      const gameIds = schedulesResponse.data.data.map((data) => `game_id=${data.game_id}`);
      const scoresApiUrl = `https://api.opticodds.com/api/v2/scores?${gameIds.join("&")}`;
      const scoresResponse = await axios.get(scoresApiUrl, {
        headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
      });

      schedulesResponse.data.data.forEach((event) => {
        if (event.game_id) {
          const gameId = bytes32({ input: event.game_id });
          const gameScores = scoresResponse.data.data.find((score) => score.game_id === event.game_id);

          gamesInfoMap.set(gameId, {
            lastUpdate: new Date().getTime(),
            gameStatus: event.status,
            isGameFinished: event.status === "Completed" || event.status === "Cancelled",
            tournamentName: "",
            tournamentRound: "",
            provider: Provider.OPTICODDS,
            teams: [
              {
                name: event.home_team,
                isHome: true,
                ...(gameScores
                  ? getOpticOddsScore(gameScores, sport, "home")
                  : {
                      score: undefined,
                      scoreByPeriod: [],
                    }),
              },
              {
                name: event.away_team,
                isHome: false,
                ...(gameScores
                  ? getOpticOddsScore(gameScores, sport, "away")
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
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO_V2);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
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

  console.log(`Games info: Number of games info: ${Array.from(gamesInfoMap.values()).length}`);
  redisClient.set(KEYS.OVERTIME_V2_GAMES_INFO_V2, JSON.stringify([...gamesInfoMap]));
}

module.exports = {
  processGamesInfo,
  getOpticOddsScore,
};
