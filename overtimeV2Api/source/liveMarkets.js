const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const axios = require("axios");
const { getAverageOdds } = require("../utils/markets");
const { LIVE_TYPE_ID_BASE, MIN_ODDS_FOR_DIFF_CHECKING, MAX_ALLOWED_STALE_ODDS_DELAY } = require("../constants/markets");
const dummyMarketsLive = require("../utils/dummy/dummyMarketsLive.json");
const { NETWORK } = require("../constants/networks");
const {
  OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS,
  OPTIC_ODDS_API_SCORES_URL,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_SCORES_MAX_GAMES,
} = require("../constants/opticodds");
const { uniq } = require("lodash");
const {
  getLeagueIsDrawAvailable,
  getLeagueSport,
  getLiveSupportedLeagues,
  getTestnetLiveSupportedLeagues,
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
  fetchOpticOddsGamesForLeague,
} = require("../utils/liveMarkets");

async function processLiveMarkets() {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";
    const network = isTestnet ? "testnet" : "mainnets";
    console.log(`Live markets ${network}: create client from index`);

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log(`Live markets ${network}: process live markets`);
          await processAllMarkets(isTestnet);
          const endTime = new Date().getTime();
          console.log(
            `Live markets ${network}: === Seconds for processing live markets: ${((endTime - startTime) / 1000).toFixed(
              0,
            )} ===`,
          );
        } catch (error) {
          console.log(`Live markets ${network}: live markets error: `, error);
        }

        await delay(2 * 1000);
      }
    }, 3000);
  }
}

/*
  Remove from thales-api env:
	  - "ODDS_AGGREGATION_ENABLED=0"
	  - "LIVE_DUMMY_MARKETS_ENABLED=1"
    - "LIVE_ODDS_PROVIDERS=draftkings,bovada,espn bet"

  Remove from overtime-v2-api env:
    - "ENABLED_TENNIS_MASTERS=1"
    - "ENABLED_TENNIS_GRAND_SLAM=1"

  Update these params from 0/1 to false/true:
	  - "ODDS_AGGREGATION_ENABLED=false"
	  - "LIVE_DUMMY_MARKETS_ENABLED=true"

  Processing steps:
    - Get supported live league IDs from config(LeagueMap) and from env for tennis
    - Get open markets from Redis and filter by ongoing and live supported
    - Get teams map, bookmakers and spread data from Github
    - Map bookmakers by league
    - Get OpticOdds games for supported live leagues from OpticOdds API by league
    - Filter by OpticOdds games (teams name and date)
    - Get OpticOdds odds for games from OpticOdds API by game IDs and league provider
    - Get OpticOdds scores from OpticOdds API

*/
async function processAllMarkets(isTestnet) {
  const SUPPORTED_NETWORKS = isTestnet ? [NETWORK.OptimismSepolia] : [NETWORK.Optimism, NETWORK.Arbitrum];

  let liveMarkets = [];
  const errorsMap = new Map();

  try {
    const supportedLiveLeagueIds = isTestnet ? getTestnetLiveSupportedLeagues() : getLiveSupportedLeagues();
    // Read open markets only from one network as markets are the same on all networks
    const openMarketsMap = await getOpenMarkets(SUPPORTED_NETWORKS[0]);

    const supportedLiveMarkets = Array.from(openMarketsMap.values())
      .filter((market) => market.statusCode === "ongoing")
      .filter((market) => supportedLiveLeagueIds.includes(market.leagueId));
    const uniqueLiveLeagueIds = uniq(supportedLiveMarkets.map((market) => market.leagueId));

    if (supportedLiveMarkets.length > 0) {
      // Get teams map, bookmakers and spread data from Github
      const teamsMapPromise = fetchTeamsMap();
      const bookmakersDataPromise = readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV);
      const spreadDataPromise = readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV);
      let teamsMap, bookmakersData, spreadData;
      try {
        [teamsMap, bookmakersData, spreadData] = await Promise.all([
          teamsMapPromise,
          bookmakersDataPromise,
          spreadDataPromise,
        ]);
      } catch (e) {
        console.log(`Live markets: Fetching from Github config data error: ${e}`);
        teamsMap = new Map();
        bookmakersData = spreadData = [];
      }

      // Fetching games from Optic Odds for given leagues
      // one API call if no tennis games or max 2 calls for tennis and all other leagues
      const opticOddsGames = await fetchOpticOddsGamesForLeague(uniqueLiveLeagueIds, isTestnet);

      // Add Optic Odds game data and filter by Optic Odds games (teams name and date)
      const supportedLiveMarketsByOpticOddsGames = supportedLiveMarkets
        .map((market) => {
          const opticOddsGameEvent = opticOddsGames.find((opticOddsGame) => {
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

          return { ...market, opticOddsGameEvent };
        })
        .filter((market) => market.opticOddsGameEvent != undefined);

      const isDummyMarketsEnabled = isTestnet && process.env.LIVE_DUMMY_MARKETS_ENABLED === "true";

      if (supportedLiveMarketsByOpticOddsGames.length > 0 || isDummyMarketsEnabled) {
        // Extracting bookmakers for league
        const liveOddsProvidersPerSport = new Map();
        for (const leagueId of uniqueLiveLeagueIds) {
          const oddsProvidersForSport = getBookmakersArray(
            bookmakersData,
            Number(leagueId),
            process.env.LIVE_ODDS_PROVIDERS.split(","),
          );
          liveOddsProvidersPerSport.set(Number(leagueId), oddsProvidersForSport);
        }

        //============================= FETCHING ODDS BY LEAGUE =============================
        const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };
        let oddsRequestUrl = OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS;
        const opticOddsGameOddsPromises = [];

        const uniqueProviderLeagueIds = uniq(supportedLiveMarketsByOpticOddsGames.map((game) => game.leagueId));
        // For each unique league prepare separate request with max num of games
        uniqueProviderLeagueIds.forEach((uniqueProviderLeagueId) => {
          supportedLiveMarketsByOpticOddsGames
            .filter((game) => game.leagueId == uniqueProviderLeagueId)
            .forEach((market, index, markets) => {
              oddsRequestUrl += `&game_id=${market.opticOddsGameEvent.id}`;

              const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_ODDS_MAX_GAMES;
              // creating new request after max num of games or when last game in request
              if (gameNumInRequest == 0 || index == markets.length - 1) {
                const liveOddsProvider = liveOddsProvidersPerSport.get(uniqueProviderLeagueId);
                oddsRequestUrl += `&sportsbook=${liveOddsProvider.join("&sportsbook=")}`;

                opticOddsGameOddsPromises.push(axios.get(oddsRequestUrl, { headers }));
                oddsRequestUrl = OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS;
              }
            });
        });

        let oddsPerGameResponses = [];
        try {
          oddsPerGameResponses = await Promise.all(opticOddsGameOddsPromises);
        } catch (e) {
          console.log(`Live markets: Fetching Optic Odds game odds data error: ${e}`);
          oddsPerGameResponses = [];
        }
        const oddsPerGames = oddsPerGameResponses.map((oddsPerGameResponse) => oddsPerGameResponse.data.data).flat();

        //============================= FETCHING SCORES FOR ALL GAMES =============================
        let opticOddsScoresRequestUrl = OPTIC_ODDS_API_SCORES_URL;
        const opticOddsScoresPromises = [];

        // Add Optic Odds game odds data and filter it
        const supportedLiveMarketsByOpticOddsOdds = supportedLiveMarketsByOpticOddsGames
          .map((market) => {
            const opticOddsGameOdds = oddsPerGames.find((game) => game.id == market.opticOddsGameEvent.id);
            return { ...market, opticOddsGameOdds };
          })
          .filter((market) => market.opticOddsGameOdds != undefined);

        //  Prepare request for scores
        const uniqueOpticOddsGameIds = uniq(
          supportedLiveMarketsByOpticOddsOdds.map((market) => market.opticOddsGameOdds.id),
        );
        // For each unique game ID prepare separate request with max num of games
        uniqueOpticOddsGameIds.forEach((gameId, index, allGameIds) => {
          const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_SCORES_MAX_GAMES;
          opticOddsScoresRequestUrl += `${gameNumInRequest > 1 ? "&" : ""}game_id=${gameId}`;

          // creating new request after max num of games or when last game in request
          if (gameNumInRequest == 0 || index == allGameIds.length - 1) {
            opticOddsScoresPromises.push(axios.get(opticOddsScoresRequestUrl, { headers }));
            opticOddsScoresRequestUrl = OPTIC_ODDS_API_SCORES_URL;
          }
        });

        let opticOddsScoresResponses = [];
        try {
          opticOddsScoresResponses = await Promise.all(opticOddsScoresPromises);
        } catch (e) {
          console.log(`Live markets: Fetching Optic Odds game scores data error: ${e}`);
          opticOddsScoresResponses = [];
        }
        const scoresPerGame = opticOddsScoresResponses
          .map((opticOddsScoresResponse) => opticOddsScoresResponse.data.data)
          .flat();

        // Add Optic Odds game scores data and filter it
        const supportedLiveMarketsByScores = supportedLiveMarketsByOpticOddsOdds
          .map((market) => {
            const opticOddsScoreData = scoresPerGame.find((game) => game.game_id == market.opticOddsGameOdds.id);
            return { ...market, opticOddsScoreData };
          })
          .filter((market) => {
            const opticOddsScoreData = market.opticOddsScoreData;

            if (opticOddsScoreData == undefined) {
              errorsMap.set(market.gameId, {
                errorTime: new Date().toUTCString(),
                errorMessage: `Blocking game ${market.opticOddsGameOdds.home_team} - ${market.opticOddsGameOdds.away_team} due to game clock being unavailable`,
              });
              return false;
            }

            if (opticOddsScoreData.status.toLowerCase() == "completed") {
              errorsMap.set(market.gameId, {
                errorTime: new Date().toUTCString(),
                errorMessage: `Blocking game ${market.opticOddsGameOdds.home_team} - ${market.opticOddsGameOdds.away_team} because it is finished.`,
              });
              return false;
            }

            const leagueSport = getLeagueSport(Number(market.leagueId));
            if (leagueSport == Sport.SOCCER) {
              const constraintsMap = new Map();
              constraintsMap.set(Sport.SOCCER, Number(process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL));

              const passingConstraintsObject = checkGameContraints(
                opticOddsScoreData,
                Number(market.leagueId),
                constraintsMap,
              );

              if (passingConstraintsObject.allow == false) {
                errorsMap.set(market.gameId, {
                  errorTime: new Date().toUTCString(),
                  errorMessage: passingConstraintsObject.message,
                });
                return false;
              }
            }

            return true;
          });

        liveMarkets = supportedLiveMarketsByScores.map((market) => {
          let gamePaused = false;

          if (
            market.opticOddsGameOdds?.odds?.some((odds) => {
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

          // READING CLOCK, PERIOD AND RESULT DATA FROM RESPONSE
          const currentScoreHome = market.opticOddsScoreData.score_home_total;
          const currentScoreAway = market.opticOddsScoreData.score_away_total;
          const currentClock = market.opticOddsScoreData.clock;
          const currentPeriod = market.opticOddsScoreData.period;
          const isLive = market.opticOddsScoreData.is_live;
          const currentGameStatus = market.opticOddsScoreData.status;
          const gamesHomeScoreByPeriod = [];
          const gamesAwayScoreByPeriod = [];

          if (currentGameStatus.toLowerCase().includes("half") || ("" + currentPeriod).toLowerCase().includes("half")) {
            gamePaused = false;
          }

          if (gamePaused) {
            errorsMap.set(market.gameId, {
              errorTime: new Date().toUTCString(),
              errorMessage: `Pausing game ${market.opticOddsGameOdds.home_team} - ${market.opticOddsGameOdds.away_team} due to odds being stale`,
            });
            market.opticOddsGameOdds.odds = [];
          }

          const leagueSport = getLeagueSport(Number(market.leagueId));

          if (leagueSport === Sport.TENNIS || leagueSport === Sport.VOLLEYBALL) {
            const resultInCurrentSet = fetchResultInCurrentSet(parseInt(currentPeriod), market.opticOddsScoreData);
            gamesHomeScoreByPeriod.push(resultInCurrentSet.home);
            gamesAwayScoreByPeriod.push(resultInCurrentSet.away);
          }

          const liveOddsProviders = liveOddsProvidersPerSport.get(Number(market.leagueId));

          // EXTRACTING ODDS FROM THE RESPONSE
          const linesMap = extractOddsForGamePerProvider(
            liveOddsProviders,
            market.opticOddsGameOdds,
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

          delete market.opticOddsGameEvent;
          delete market.opticOddsGameOdds;
          delete market.opticOddsScoreData;

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
              return { american: 0, decimal: 0, normalizedImplied: 0 };
            });
            return market;
          } else {
            const isAggregationEnabled = process.env.ODDS_AGGREGATION_ENABLED === "true";
            if (isAggregationEnabled) {
              const aggregatedOdds = getAverageOdds(oddsList);
              // ADJUSTING SPREAD AND RETURNING MARKET WITH AGGREGATED LIVE ODDS
              return adjustSpreadAndReturnMarketWithOdds(market, spreadData, aggregatedOdds, LIVE_TYPE_ID_BASE);
            } else {
              const primaryBookmakerOdds = oddsList[0];
              // ADJUSTING SPREAD AND RETURNING MARKET WITH LIVE ODDS FROM PRIMARY BOOKMAKER
              return adjustSpreadAndReturnMarketWithOdds(market, spreadData, primaryBookmakerOdds, LIVE_TYPE_ID_BASE);
            }
          }
        });

        if (isTestnet && isDummyMarketsEnabled) {
          liveMarkets.push(...dummyMarketsLive);
        }

        console.log(`Live markets:
          Number of supported live markets ${supportedLiveMarkets.length}
          Number of Optic Odds games ${opticOddsGames.length} and matching games ${supportedLiveMarketsByOpticOddsGames.length}
          Number of Optic Odds odds ${oddsPerGames.length} and matching odds ${supportedLiveMarketsByOpticOddsOdds.length}
          Number of Optic Odds scores ${scoresPerGame.length} and matching scores ${supportedLiveMarketsByScores.length}`);
      } else {
        // IF NO MATCHES WERE FOUND WITH MATCHING CRITERIA
        console.log(`Live markets: Could not find any live matches matching the criteria for team names and date`);

        console.log(`Live markets:
          Number of supported live markets ${supportedLiveMarkets.length}
          Number of Optic Odds games ${opticOddsGames.length} and matching games ${supportedLiveMarketsByOpticOddsGames.length}`);
      }
    }

    SUPPORTED_NETWORKS.forEach((network) => {
      redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS[network], JSON.stringify(liveMarkets), function () {});

      // PERSISTING ERROR MESSAGES
      if (errorsMap.size > 0) {
        persistErrorMessages(errorsMap, network);
      }
    });
  } catch (e) {
    console.log(`Live markets: Processing error: ${e}`);
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
