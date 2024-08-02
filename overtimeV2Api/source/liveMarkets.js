const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const axios = require("axios");
const { getAverageOdds } = require("../utils/markets");
const { LIVE_TYPE_ID_BASE, MIN_ODDS_FOR_DIFF_CHECKING } = require("../constants/markets");
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
  extractOddsForGamePerProvider,
  checkOddsFromBookmakers,
  fetchResultInCurrentSet,
} = require("overtime-live-trading-utils");
const {
  fetchTeamsMap,
  adjustSpreadAndReturnMarketWithOdds,
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
          await Promise.all([processAllMarkets(NETWORK.Optimism), processAllMarkets(NETWORK.OptimismSepolia)]);
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
  let availableLeagueIds =
    Number(network) == NETWORK.OptimismSepolia ? getTestnetLiveSupportedLeagues() : getLiveSupportedLeagues();

  const liveOddsProvidersPerSport = new Map();

  const bookmakersData = await readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV);
  const spreadData = await readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV);

  availableLeagueIds = checkTennisIsEnabled(availableLeagueIds);

  redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], async function (err, obj) {
    const markets = new Map(JSON.parse(obj));

    const enabledDummyMarkets =
      Number(network) !== NETWORK.OptimismSepolia ? 0 : Number(process.env.LIVE_DUMMY_MARKETS_ENABLED);
    try {
      const allMarkets = Array.from(markets.values());
      const groupMarketsByStatus = groupBy(allMarkets, (market) => market.statusCode);

      const marketsByStatus = groupMarketsByStatus["ongoing"] || [];
      const marketsByType = marketsByStatus;

      const errorsMap = new Map();

      const filteredMarkets = marketsByType.filter((market) => availableLeagueIds.includes(Number(market.leagueId)));
      if (filteredMarkets.length > 0) {
        const leagueIdsMap = {};

        filteredMarkets.forEach((market) => (leagueIdsMap[market.leagueId] = true));
        availableLeagueIds = Object.keys(leagueIdsMap);

        // FETCHING TEAM NAMES FOR MAPPING
        const teamsMap = await fetchTeamsMap();

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
          const opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, leagueName);

          opticOddsResponseData = opticOddsResponseData.concat(opticOddsGames);
        }

        const providerMarketsMatchingOffer = [];

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
          console.log(`Could not find anylive matches on the provider side for the given leagues`);
          return;
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

            if (leagueSport === Sport.TENNIS || leagueSport === Sport.VOLLEYBALL) {
              const resultInCurrentSet = fetchResultInCurrentSet(currentPeriod, gameTimeOpticOddsResponseData);
              gamesHomeScoreByPeriod.push(resultInCurrentSet.currentHomeGameScore);
              gamesAwayScoreByPeriod.push(resultInCurrentSet.currentAwayGameScore);
            }

            const liveOddsProviders = liveOddsProvidersPerSport.get(Number(market.leagueId));

            // EXTRACTING ODDS FROM THE RESPONSE
            const linesMap = extractOddsForGamePerProvider(
              liveOddsProviders,
              gameWithOdds,
              market,
              teamsMap,
              getLeagueIsDrawAvailable(Number(market.leagueId)),
            );

            // CHECKING AND COMPARING ODDS FOR THE GIVEN BOOKMAKERS
            const oddsList = checkOddsFromBookmakers(
              linesMap,
              liveOddsProviders,
              !getLeagueIsDrawAvailable(Number(market.leagueId)),
              Number(process.env.MAX_PERCENTAGE_DIFF_BETWEEN_ODDS),
              MIN_ODDS_FOR_DIFF_CHECKING,
            );

            const isThere100PercentOdd = oddsList.some(
              (oddsObject) => oddsObject.homeOdds == 1 || oddsObject.awayOdds == 1 || oddsObject.drawOdds == 1,
            );

            market.homeScore = currentScoreHome;
            market.awayScore = currentScoreAway;
            market.gameClock = currentClock;
            market.gamePeriod = currentPeriod;
            market.childMarkets = [];
            market.proof = [];
            market.homeScoreByPeriod = gamesHomeScoreByPeriod;
            market.awayScoreByPeriod = gamesAwayScoreByPeriod;

            if (
              isThere100PercentOdd ||
              (oddsList[0].homeOdds == 0 && oddsList[0].awayOdds == 0 && oddsList[0].drawOdds == 0) ||
              isLive == false
            ) {
              // RETURNING MARKET WITH ZERO ODDS IF CONDITIONS FOR ODDS ARE NOT MET OR LIVE FLAG ON OPTIC ODDS API IS FALSE BUT GAME IS IN PROGRESS
              market.odds = market.odds.map(() => {
                return {
                  american: 0,
                  decimal: 0,
                  normalizedImplied: 0,
                };
              });
              return market;
            } else {
              const aggregationEnabled = Number(process.env.ODDS_AGGREGATION_ENABLED);
              if (aggregationEnabled > 0) {
                const aggregatedOdds = getAverageOdds(oddsList);
                // ADJUSTING SPREAD AND RETURNING MARKET WITH AGGREGATED LIVE ODDS
                return adjustSpreadAndReturnMarketWithOdds(market, spreadData, aggregatedOdds, LIVE_TYPE_ID_BASE);
              } else {
                const primaryBookmakerOdds = oddsList[0];
                // ADJUSTING SPREAD AND RETURNING MARKET WITH LIVE ODDS FROM PRIMARY BOOKMAKER
                return adjustSpreadAndReturnMarketWithOdds(market, spreadData, primaryBookmakerOdds, LIVE_TYPE_ID_BASE);
              }
            }
          } else {
            return null;
          }
        });

        const resolvedMarketPromises = await Promise.all(filteredMarketsWithLiveOdds);

        let dummyMarkets = [];
        if (Number(network) == NETWORK.OptimismSepolia) {
          dummyMarkets = [...dummyMarketsLive];
        }
        const filteredMarketsWithLiveOddsAndDummyMarkets = resolvedMarketPromises.concat(dummyMarkets);

        redisClient.set(
          KEYS.OVERTIME_V2_LIVE_MARKETS[network],
          JSON.stringify(filteredMarketsWithLiveOddsAndDummyMarkets.filter((market) => market != null)),
          function () {},
        );

        // PERSISTING ERROR MESSAGES
        persistErrorMessages(errorsMap, network);

        return;
      }

      // PERSISTING ERROR MESSAGES
      persistErrorMessages(errorsMap, network);

      redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS[network], JSON.stringify([]), function () {});
    } catch (e) {
      console.log(e);
    }
  });
}

module.exports = {
  processLiveMarkets,
};
