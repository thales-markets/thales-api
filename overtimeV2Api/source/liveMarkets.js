const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const axios = require("axios");
const { MAX_ALLOWED_STALE_ODDS_DELAY } = require("../constants/markets");
const dummyMarketsLive = require("../utils/dummy/dummyMarketsLive.json");
const { NETWORK } = require("../constants/networks");
const { groupBy } = require("lodash");
const {
  getLeagueIsDrawAvailable,
  getLeagueSport,
  getLiveSupportedLeagues,
  getTestnetLiveSupportedLeagues,
  getLeagueOpticOddsName,
} = require("../utils/sports");
const { Sport } = require("../constants/sports");
const { readCsvFromUrl } = require("../utils/csvReader");
const {
  getBookmakersArray,
  teamNamesMatching,
  gamesDatesMatching,
  checkGameContraints,
  getLeagueSpreadType,
  processMarket,
  getLeagueTotalType,
  fetchResultInCurrentSet,
  MONEYLINE,
} = require("overtime-live-trading-utils");
const {
  fetchTeamsMap,
  persistErrorMessages,
  checkTennisIsEnabled,
  fetchOpticOddsGamesForLeague,
} = require("../utils/liveMarkets");

async function processLiveMarkets() {
  if (process.env.REDIS_URL) {
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("process live markets");
          await Promise.all([
            processAllMarkets(NETWORK.Optimism),
            processAllMarkets(NETWORK.Arbitrum),
            processAllMarkets(NETWORK.OptimismSepolia),
          ]);
          const endTime = new Date().getTime();
          console.log(`=== Seconds for processing live markets: ${((endTime - startTime) / 1000).toFixed(0)} ===`);
        } catch (error) {
          console.log("live markets error: ", error);
        }

        await delay(2 * 1000);
      }
    }, 3000);
  }
}

async function processAllMarkets(network) {
  const openMarkets = await getOpenMarkets(network);

  try {
    let openLiveMarkets = [];

    const liveOddsProvidersPerSport = new Map();
    const enabledDummyMarkets =
      Number(network) !== NETWORK.OptimismSepolia ? 0 : Number(process.env.LIVE_DUMMY_MARKETS_ENABLED);
    const errorsMap = new Map();

    const allMarkets = Array.from(openMarkets.values());
    const groupMarketsByStatus = groupBy(allMarkets, (market) => market.statusCode);
    const marketsByType = groupMarketsByStatus["ongoing"] || [];

    let availableLeagueIds =
      Number(network) == NETWORK.OptimismSepolia ? getTestnetLiveSupportedLeagues() : getLiveSupportedLeagues();
    availableLeagueIds = checkTennisIsEnabled(availableLeagueIds);

    const filteredMarkets = marketsByType.filter((market) => availableLeagueIds.includes(Number(market.leagueId)));

    if (filteredMarkets.length > 0) {
      const leagueIdsMap = {};
      filteredMarkets.forEach((market) => (leagueIdsMap[market.leagueId] = true));
      availableLeagueIds = Object.keys(leagueIdsMap);

      // FETCHING TEAM NAMES FOR MAPPING
      const teamsMap = await fetchTeamsMap();

      const bookmakersData = await readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV);
      const spreadData = await readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV);

      let opticOddsResponseData = [];
      for (const leagueId of availableLeagueIds) {
        const leagueName = getLeagueOpticOddsName(leagueId);

        // EXTRACTING BOOKMAKERS FOR LEAGUE
        const oddsProvidersForSport = getBookmakersArray(
          bookmakersData,
          Number(leagueId),
          process.env.LIVE_ODDS_PROVIDERS.split(","),
        );

        liveOddsProvidersPerSport.set(Number(leagueId), oddsProvidersForSport);

        // FETCHING GAMES FROM OPTIC ODDS FOR GIVEN LEAGUE
        const opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, leagueName, Number(network));

        opticOddsResponseData = opticOddsResponseData.concat(opticOddsGames);
      }

      // TEAM NAMES AND DATES MATCHING CHECK
      filteredMarkets.forEach((market) => {
        const opticOddsGameEvent = opticOddsResponseData.find((opticOddsGame) => {
          const teamsMatching = teamNamesMatching(
            Number(market.leagueId),
            market.homeTeam,
            market.awayTeam,
            opticOddsGame.home_team,
            opticOddsGame.away_team,
            teamsMap,
          );

          const datesMatching = gamesDatesMatching(
            new Date(market.maturityDate),
            new Date(opticOddsGame.start_date),
            Number(market.leagueId),
            Number(process.env.TENNIS_MATCH_TIME_DIFFERENCE_MINUTES),
          );

          return teamsMatching && datesMatching;
        });

        if (opticOddsGameEvent != undefined) {
          providerMarketsMatchingOffer.push({
            opticOddsGameEvent: opticOddsGameEvent,
            leagueId: Number(market.leagueId),
          });
        }
      });

      // IF NO MATCHES WERE FOUND WITH MATCHING CRITERIA
      if (providerMarketsMatchingOffer.length == 0 && enabledDummyMarkets == 0) {
        throw "Could not find any live matches matching the criteria for team names and date";
      }

      // FETCHING ODDS FOR THE GIVEN GAME
      const urlsGamesOdds = providerMarketsMatchingOffer.map((game) => {
        let url = `https://api.opticodds.com/api/v2/game-odds?game_id=${game.opticOddsGameEvent.id}&market_name=Moneyline&odds_format=Decimal`;
        const liveOddsProviders = liveOddsProvidersPerSport.get(game.leagueId);
        liveOddsProviders.forEach((liveOddsProvider) => {
          url = url.concat(`&sportsbook=${liveOddsProvider}`);
        });
        return axios.get(url, {
          headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
        });
      });

      const responsesOddsPerGame = await Promise.all(urlsGamesOdds);

      // MATCHING TEAM NAMES AND DATE AGAIN FOR EXTRACTING ODDS RESPONSE
      const filteredMarketsWithLiveOdds = filteredMarkets.map(async (market) => {
        const responseObject = responsesOddsPerGame.find((responseObject) => {
          const response = responseObject.data.data[0];
          const teamsMatching = teamNamesMatching(
            Number(market.leagueId),
            market.homeTeam,
            market.awayTeam,
            response.home_team,
            response.away_team,
            teamsMap,
          );

          const datesMatching = gamesDatesMatching(
            new Date(market.maturityDate),
            new Date(response.start_date),
            Number(market.leagueId),
            Number(process.env.TENNIS_MATCH_TIME_DIFFERENCE_MINUTES),
          );

          return teamsMatching && datesMatching;
        });

        // FETCHING CURRENT SCORE AND CLOCK FOR THE GAME
        if (responseObject != undefined) {
          const gameWithOdds = responseObject.data.data[0];

          // FETCHING ODDS FOR THE GIVEN GAME
          // SPREAD & TOTALS - FETCHING ODDS FOR ALL TYPES
          const urlsGamesOdds = providerMarketsMatchingOffer.map((game) => {
            let url = `https://api.opticodds.com/api/v2/game-odds?game_id=${game.opticOddsGameEvent.id}&odds_format=Decimal`;

            const betTypes = [MONEYLINE];
            // SPREAD & TOTALS - GET SPREAD TYPE
            const spreadType = getLeagueSpreadType(game.leagueId);

            if (spreadType != undefined) {
              betTypes.push(spreadType);
            }
            // SPREAD & TOTALS - GET TOTAL TYPE
            const totalType = getLeagueTotalType(game.leagueId);

            if (totalType != undefined) {
              betTypes.push(totalType);
            }

            betTypes.forEach((betType) => {
              url = url.concat(`&market_name=${betType}`);
            });
            const liveOddsProviders = liveOddsProvidersPerSport.get(game.leagueId);
            liveOddsProviders.forEach((liveOddsProvider) => {
              url = url.concat(`&sportsbook=${liveOddsProvider}`);
            });
            console.log("get URL: ", url);
            return axios.get(url, {
              headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
            });
          });

          if (
            gameWithOdds?.odds?.some((odds) => {
              if (typeof odds.timestamp !== "number") {
                return true;
              }
              const oddsDate = new Date(odds.timestamp * 1000);
              const now = new Date();
              const timeDiff = now.getTime() - oddsDate.getTime();
              return timeDiff > MAX_ALLOWED_STALE_ODDS_DELAY;
            })
          ) {
            gamePaused = true;
          }

          const responseOpticOddsScores = await axios.get(
            `https://api.opticodds.com/api/v2/scores?game_id=${gameWithOdds.id}`,
            {
              headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
            },
          );
          const gameTimeOpticOddsResponseData = responseOpticOddsScores.data.data[0];

          if (gameTimeOpticOddsResponseData == undefined || responseOpticOddsScores.data.data.length == 0) {
            errorsMap.set(market.gameId, {
              errorTime: new Date().toUTCString(),
              errorMessage: `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} due to game clock being unavailable`,
            });
            return null;
          }

          // READING CLOCK, PERIOD AND RESULT DATA FROM RESPONSE
          const currentScoreHome = gameTimeOpticOddsResponseData.score_home_total;
          const currentScoreAway = gameTimeOpticOddsResponseData.score_away_total;
          const currentClock = gameTimeOpticOddsResponseData.clock;
          const currentPeriod = gameTimeOpticOddsResponseData.period;
          const isLive = gameTimeOpticOddsResponseData.is_live;
          const currentGameStatus = gameTimeOpticOddsResponseData.status;
          const gamesHomeScoreByPeriod = [];
          const gamesAwayScoreByPeriod = [];

          if (currentGameStatus.toLowerCase() == "completed") {
            errorsMap.set(market.gameId, {
              errorTime: new Date().toUTCString(),
              errorMessage: `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} because it is finished.`,
            });
            return null;
          }

          // FETCHING CURRENT SCORE AND CLOCK FOR THE GAME
          if (responseObject != undefined) {
            const apiResponseWithOdds = responseObject.data.data[0];

            let gamePaused = false;

            if (
              apiResponseWithOdds?.odds?.some((odds) => {
                if (typeof odds.timestamp !== "number") {
                  return true;
                }
                const oddsDate = new Date(odds.timestamp * 1000);
                const now = new Date();
                const timeDiff = now.getTime() - oddsDate.getTime();
                return timeDiff > MAX_ALLOWED_STALE_ODDS_DELAY;
              })
            ) {
              gamePaused = true;
            }

            const responseOpticOddsScores = await axios.get(
              `https://api.opticodds.com/api/v2/scores?game_id=${apiResponseWithOdds.id}`,
              {
                headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
              },
            );

            const gameTimeOpticOddsResponseData = responseOpticOddsScores.data.data[0];

            if (gameTimeOpticOddsResponseData == undefined || responseOpticOddsScores.data.data.length == 0) {
              errorsMap.set(market.gameId, {
                errorTime: new Date().toUTCString(),
                errorMessage: `Blocking game ${apiResponseWithOdds.home_team} - ${apiResponseWithOdds.away_team} due to game clock being unavailable`,
              });
              return null;
            }

            // READING CLOCK, PERIOD AND RESULT DATA FROM RESPONSE
            const currentScoreHome = gameTimeOpticOddsResponseData.score_home_total;
            const currentScoreAway = gameTimeOpticOddsResponseData.score_away_total;
            const currentClock = gameTimeOpticOddsResponseData.clock;
            const currentPeriod = gameTimeOpticOddsResponseData.period;
            const isLive = gameTimeOpticOddsResponseData.is_live;
            const currentGameStatus = gameTimeOpticOddsResponseData.status;
            const gamesHomeScoreByPeriod = [];
            const gamesAwayScoreByPeriod = [];

            if (currentGameStatus.toLowerCase() == "completed") {
              errorsMap.set(market.gameId, {
                errorTime: new Date().toUTCString(),
                errorMessage: `Blocking game ${apiResponseWithOdds.home_team} - ${apiResponseWithOdds.away_team} because it is finished.`,
              });
              return null;
            }

            const passingConstraintsObject = checkGameContraints(
              gameTimeOpticOddsResponseData,
              Number(market.leagueId),
              constraintsMap,
            );

            if (passingConstraintsObject.allow == false) {
              errorsMap.set(market.gameId, {
                errorTime: new Date().toUTCString(),
                errorMessage: `Pausing game ${apiResponseWithOdds.home_team} - ${apiResponseWithOdds.away_team} due to odds being stale`,
              });
            }

            const leagueSport = getLeagueSport(Number(market.leagueId));

            if (leagueSport == Sport.SOCCER) {
              const constraintsMap = new Map();
              constraintsMap.set(Sport.SOCCER, Number(process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL));

              const passingConstraintsObject = checkGameContraints(
                gameTimeOpticOddsResponseData,
                Number(market.leagueId),
                constraintsMap,
              );

              if (passingConstraintsObject.allow == false) {
                errorsMap.set(market.gameId, {
                  errorTime: new Date().toUTCString(),
                  errorMessage: passingConstraintsObject.message,
                });
                return null;
              }
            }
          }

          if (leagueSport === Sport.TENNIS || leagueSport === Sport.VOLLEYBALL) {
            const resultInCurrentSet = fetchResultInCurrentSet(parseInt(currentPeriod), gameTimeOpticOddsResponseData);
            gamesHomeScoreByPeriod.push(resultInCurrentSet.home);
            gamesAwayScoreByPeriod.push(resultInCurrentSet.away);
          }

          const liveOddsProviders = liveOddsProvidersPerSport.get(Number(market.leagueId));

          // SET CURRENT RESULT AND PERIOD VALUES, PREPARE CHILD MARKETS
          market.homeScore = currentScoreHome;
          market.awayScore = currentScoreAway;
          market.gameClock = currentClock;
          market.gamePeriod = currentPeriod;
          market.childMarkets = [];
          market.proof = [];
          market.homeScoreByPeriod = gamesHomeScoreByPeriod;
          market.awayScoreByPeriod = gamesAwayScoreByPeriod;
          console.log("READY TO FETCH PARENT ODDS: ", apiResponseWithOdds);

          if (isLive == true) {
            const processedMarket = processMarket(
              market,
              apiResponseWithOdds,
              liveOddsProviders,
              spreadData,
              getLeagueIsDrawAvailable(market.leagueId),
              Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
              Number(process.env.MAX_PERCENTAGE_DIFF_BETWEEN_ODDS),
            );

            return processedMarket;
          } else {
            market.odds = market.odds.map(() => {
              return {
                american: 0,
                decimal: 0,
                normalizedImplied: 0,
              };
            });
            return market;
          }
        }
      });

      const resolvedMarketPromises = await Promise.all(filteredMarketsWithLiveOdds);

      let dummyMarkets = [];
      if (Number(network) == NETWORK.OptimismSepolia && enabledDummyMarkets) {
        dummyMarkets = [...dummyMarketsLive];
      }
      const filteredMarketsWithLiveOddsAndDummyMarkets = resolvedMarketPromises.concat(dummyMarkets);
      openLiveMarkets = filteredMarketsWithLiveOddsAndDummyMarkets.filter((market) => market != null);
    }

    // PERSISTING ERROR MESSAGES
    persistErrorMessages(errorsMap, network);

    redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS[network], JSON.stringify(openLiveMarkets), function () {});
  } catch (e) {
    console.log(`${network}: ${e}`);
  }
}

function getOpenMarkets(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], async function (err, obj) {
      const openMarkets = new Map(JSON.parse(obj));
      resolve(openMarkets);
    });
  });
}

module.exports = {
  processLiveMarkets,
};
