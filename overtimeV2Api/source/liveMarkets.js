require("dotenv").config();
const { delay } = require("../utils/general");
const { redisClient } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const dummyMarketsLive = require("../utils/dummy/dummyMarketsLive.json");
const { NETWORK } = require("../constants/networks");
const { uniq } = require("lodash");
const {
  Sport,
  getBookmakersArray,
  teamNamesMatching,
  gamesDatesMatching,
  checkGameContraints,
  processMarket,
  fetchResultInCurrentSet,
  getLeagueIsDrawAvailable,
  getLeagueSport,
  getLiveSupportedLeagues,
  getBetTypesForLeague,
} = require("overtime-live-trading-utils");
const {
  fetchRiskManagementConfig,
  fetchOpticOddsGamesForLeague,
  persistErrorMessages,
  getRedisKeyForOpticOddsApiOdds,
  getRedisKeyForOpticOddsApiResults,
  isOddsTimeStale,
  filterStaleOdds,
  isMarketPaused,
} = require("../utils/liveMarkets");
const {
  getRedisKeyForOpticOddsStreamEventOddsId,
  getRedisKeyForOpticOddsStreamEventResults,
} = require("../utils/opticOdds/opticOddsStreamsConnector");
const {
  fetchOpticOddsFixtureOdds,
  mapOpticOddsApiFixtureOdds,
  mapOddsStreamEvents,
  startOddsStreams,
  closeInactiveOddsStreams,
  isOpticOddsStreamOddsDisabled,
} = require("../utils/opticOdds/opticOddsFixtureOdds");
const {
  fetchOpticOddsResults,
  mapOpticOddsApiResults,
  mapResultsStreamEvents,
  isOpticOddsStreamResultsDisabled,
} = require("../utils/opticOdds/opticOddsResults");

async function processLiveMarkets() {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";
    const network = isTestnet ? "testnet" : "mainnets";

    const oddsStreamsInfoByLeagueMap = new Map();
    const oddsInitializedByLeagueMap = new Map();
    const resultsInitializedByLeagueMap = new Map();

    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log(`Live markets ${network}: process live markets`);
          await processAllMarkets(
            oddsStreamsInfoByLeagueMap,
            oddsInitializedByLeagueMap,
            resultsInitializedByLeagueMap,
            isTestnet,
          );
          const endTime = new Date().getTime();
          console.log(
            `Live markets ${network}: === Seconds for processing live markets: ${((endTime - startTime) / 1000).toFixed(
              0,
            )} ===`,
          );
        } catch (error) {
          console.log(`Live markets ${network}: live markets error: ${error}`);
        }

        await delay(2 * 1000);
      }
    }, 3000);
  }
}

/*
  Processing steps:
    - Get teams map, bookmakers, spread and leagues data from Github
    - Get supported live league IDs from config
    - Get open markets from Redis and filter by ongoing and live supported
    - Process markets from each league
*/
async function processAllMarkets(
  oddsStreamsInfoByLeagueMap,
  oddsInitializedByLeagueMap,
  resultsInitializedByLeagueMap,
  isTestnet,
) {
  const SUPPORTED_NETWORKS = isTestnet ? [NETWORK.OptimismSepolia] : [NETWORK.Optimism, NETWORK.Arbitrum];

  // Get teams map, bookmakers and spread data from Github
  const config = await fetchRiskManagementConfig(isTestnet);
  // Get supported live leagues
  const supportedLiveLeagueIds = getLiveSupportedLeagues(config.leaguesData);
  // Read open markets only from one network as markets are the same on all networks
  const openMarkets = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[SUPPORTED_NETWORKS[0]]);
  const openMarketsMap = new Map(JSON.parse(openMarkets));

  const supportedLiveMarkets = Array.from(openMarketsMap.values())
    .filter((market) => market.statusCode === "ongoing" && !market.isWholeGameResolved && !market.noTickets)
    .filter((market) => supportedLiveLeagueIds.includes(market.leagueId));
  const uniqueLiveLeagueIds = uniq(supportedLiveMarkets.map((market) => market.leagueId));

  console.log(`Live markets: Number of ongoing leagues ${uniqueLiveLeagueIds.length}`);

  // Process games per league
  const processMarketsByLeaguePromises = uniqueLiveLeagueIds.map((leagueId) => {
    // Start or re-start one stream for each league except for tennis GS where starting multiple leagues (ATP and WTA)
    startOddsStreams(leagueId, config.bookmakersData, oddsStreamsInfoByLeagueMap, isTestnet);

    const ongoingLeagueMarkets = supportedLiveMarkets.filter((market) => market.leagueId === leagueId);
    return processMarketsByLeague(
      leagueId,
      ongoingLeagueMarkets,
      config,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );
  });

  // Close inactive streams
  closeInactiveOddsStreams(oddsStreamsInfoByLeagueMap, uniqueLiveLeagueIds);

  const processedMarketsResponses = await Promise.all(processMarketsByLeaguePromises);
  const liveMarkets = processedMarketsResponses.flat();

  SUPPORTED_NETWORKS.forEach((network) =>
    redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS[network], JSON.stringify(liveMarkets)),
  );
}

/*
  Processing steps:
    - Get OpticOdds games for supported live leagues from OpticOdds API by league
    - Filter by OpticOdds games (teams name and date)
    - Get OpticOdds odds for games from OpticOdds API (initially and then from stream) by game IDs and league providers
    - Get OpticOdds results for games from OpticOdds API (initially and then from stream)
    - Returns processed matched live markets
*/
async function processMarketsByLeague(
  leagueId,
  ongoingMarkets,
  config,
  oddsInitializedByLeagueMap,
  resultsInitializedByLeagueMap,
  isTestnet,
) {
  const PROCESSING_START_TIME = new Date().toUTCString();
  const SUPPORTED_NETWORKS = isTestnet ? [NETWORK.OptimismSepolia] : [NETWORK.Optimism, NETWORK.Arbitrum];

  const { teamsMap, bookmakersData, spreadData } = config;

  let liveMarkets = [];
  const errorsMap = new Map();

  try {
    // Fetching games from Optic Odds for given league
    const opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, isTestnet);

    // Add Optic Odds game data to market and filter by Optic Odds games (teams name and date)
    const ongoingMarketsByOpticOddsGames = ongoingMarkets
      .map((market) => {
        const opticOddsGameEvent = opticOddsGames.find((opticOddsGame) => {
          const teamsMatching = teamNamesMatching(
            market.leagueId,
            market.homeTeam,
            market.awayTeam,
            opticOddsGame.home_team,
            opticOddsGame.away_team,
            teamsMap,
          );
          const datesMatching = gamesDatesMatching(
            new Date(market.maturityDate),
            new Date(opticOddsGame.start_date),
            market.leagueId,
            Number(process.env.TENNIS_MATCH_TIME_DIFFERENCE_MINUTES),
          );

          return teamsMatching && datesMatching;
        });

        return { ...market, opticOddsGameEvent };
      })
      .filter((market) => market.opticOddsGameEvent !== undefined);

    const isDummyMarketsEnabled = isTestnet && process.env.LIVE_DUMMY_MARKETS_ENABLED === "true";

    if (ongoingMarketsByOpticOddsGames.length > 0 || isDummyMarketsEnabled) {
      // ======================================== ODDS PROCESSING ========================================
      let oddsPerGame = [];
      const isOddsInitialized = !!oddsInitializedByLeagueMap.get(leagueId);

      // Extracting bookmakers for league
      const bookmakers = getBookmakersArray(bookmakersData, leagueId, process.env.LIVE_ODDS_PROVIDERS.split(","));
      /*
       * Read odds received from stream, example:
       *
       * One fixture ID key="opticOddsStreamEventOddsIdByFixtureIdB176303C982E"
       * contains multiple keys for game odds:
       * value=[
       *  "31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5",
       *  "31209-39104-2024-40:draftkings:game_spread:terence_atmane_+1_5"
       * ]
       * and for key="31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5" value={odds event object}
       */
      const opticOddsGameEvents = ongoingMarketsByOpticOddsGames.map((market) => market.opticOddsGameEvent);
      const redisStreamGameKeys = opticOddsGameEvents.map((opticOddsGameEvent) =>
        getRedisKeyForOpticOddsStreamEventOddsId(opticOddsGameEvent.fixture_id),
      );
      const redisStreamOddsKeys = (await redisClient.mGet(redisStreamGameKeys))
        .filter((obj) => obj !== null)
        .map((obj) => JSON.parse(obj))
        .flat();

      if (!isOddsInitialized) {
        // Initially fetch game odds from Optic Odds API for given markets
        const betTypes = getBetTypesForLeague(leagueId, config.leaguesData);
        const fixtureIds = ongoingMarketsByOpticOddsGames.map((market) => market.opticOddsGameEvent.fixture_id);

        const oddsFromApi = await fetchOpticOddsFixtureOdds(bookmakers, betTypes, fixtureIds);
        oddsPerGame = mapOpticOddsApiFixtureOdds(oddsFromApi);

        if (!isOpticOddsStreamOddsDisabled && oddsPerGame.length > 0) {
          await redisClient.set(getRedisKeyForOpticOddsApiOdds(leagueId), JSON.stringify(oddsPerGame));
          oddsInitializedByLeagueMap.set(leagueId, true);

          // clean up old odds from stream
          const cleanUpArray = redisStreamOddsKeys.flatMap((value) => [value, ""]);
          await redisClient.mSet(cleanUpArray);
        }
      } else {
        // Update odds using stream

        // get previous odds
        const previousOddsPerGame = JSON.parse(await redisClient.get(getRedisKeyForOpticOddsApiOdds(leagueId))) || [];
        // filter odds only for matched live games
        const previousLiveOddsPerGame = previousOddsPerGame.filter((game) =>
          ongoingMarketsByOpticOddsGames.some((market) => market.opticOddsGameEvent.fixture_id === game.fixture_id),
        );

        // Read odds received from stream
        const oddsStreamEvents =
          redisStreamOddsKeys.length > 0
            ? (await redisClient.mGet(redisStreamOddsKeys))
                .filter((obj) => obj !== null && obj !== "")
                .map((obj) => JSON.parse(obj))
            : [];

        // Remove locked odds
        const lockedEventOddsIds = oddsStreamEvents
          .filter((streamEvent) => !!streamEvent.isLocked)
          .map((streamEvent) => streamEvent.id);

        const previousLiveActiveOddsPerGame = previousLiveOddsPerGame.map((game) => {
          const withoutLockedOdds = game.odds.filter((odds) => !lockedEventOddsIds.includes(odds.id));
          return { ...game, odds: withoutLockedOdds };
        });

        const oddsStreamActiveEvents = oddsStreamEvents.filter((streamEvent) => !streamEvent.isLocked);

        oddsPerGame = mapOddsStreamEvents(oddsStreamActiveEvents, previousLiveActiveOddsPerGame, opticOddsGameEvents);

        await redisClient.set(getRedisKeyForOpticOddsApiOdds(leagueId), JSON.stringify(oddsPerGame));
      }

      oddsPerGame = filterStaleOdds(oddsPerGame);

      // Add Optic Odds game odds data and filter it
      const ongoingMarketsByOpticOddsOdds = ongoingMarketsByOpticOddsGames
        .map((market) => {
          const opticOddsGameOdds = oddsPerGame.find(
            (game) => game.fixture_id === market.opticOddsGameEvent.fixture_id,
          );
          return { ...market, opticOddsGameOdds };
        })
        .filter((market) => market.opticOddsGameOdds !== undefined);

      // ======================================== RESULTS PROCESSING ========================================
      let resultsPerGame = [];
      const isResultsInitialized = !!resultsInitializedByLeagueMap.get(leagueId);

      if (!isResultsInitialized) {
        // Initially fetch game results from Optic Odds API for given markets
        const fixtureIds = ongoingMarketsByOpticOddsOdds.map((market) => market.opticOddsGameOdds.fixture_id);

        const resultsFromApi = await fetchOpticOddsResults(fixtureIds);

        resultsPerGame = mapOpticOddsApiResults(resultsFromApi);
        if (!isOpticOddsStreamResultsDisabled && resultsPerGame.length > 0) {
          await redisClient.set(getRedisKeyForOpticOddsApiResults(leagueId), JSON.stringify(resultsPerGame));
          resultsInitializedByLeagueMap.set(leagueId, true);
        }
      } else {
        // Update results using stream

        // get previous results
        const previousResultsPerGame =
          JSON.parse(await redisClient.get(getRedisKeyForOpticOddsApiResults(leagueId))) || [];
        // filter results only for matched game odds
        const previousLiveResultsPerGame = previousResultsPerGame.filter((game) =>
          ongoingMarketsByOpticOddsOdds.some((market) => market.opticOddsGameOdds.fixture_id === game.fixture_id),
        );

        // Read results received from stream by fixture ID
        const redisStreamResultsKeys = ongoingMarketsByOpticOddsOdds.map((market) =>
          getRedisKeyForOpticOddsStreamEventResults(market.opticOddsGameEvent.fixture_id),
        );
        const resultsStreamEvents =
          redisStreamResultsKeys.length > 0
            ? (await redisClient.mGet(redisStreamResultsKeys))
                .filter((obj) => obj !== null)
                .map((obj) => JSON.parse(obj))
            : [];

        resultsPerGame = mapResultsStreamEvents(resultsStreamEvents, previousLiveResultsPerGame);

        await redisClient.set(getRedisKeyForOpticOddsApiResults(leagueId), JSON.stringify(resultsPerGame));
      }

      // Add Optic Odds game results data and filter it
      const ongoingMarketsByResults = ongoingMarketsByOpticOddsOdds
        .map((market) => {
          const opticOddsResultData = resultsPerGame.find(
            (game) => game.fixture_id == market.opticOddsGameOdds.fixture_id,
          );
          return { ...market, opticOddsResultData };
        })
        .filter((market) => {
          const opticOddsResultData = market.opticOddsResultData;
          const opticOddsHomeTeam = market.opticOddsGameOdds.home_team;
          const opticOddsAwayTeam = market.opticOddsGameOdds.away_team;

          if (opticOddsResultData == undefined) {
            errorsMap.set(market.gameId, {
              processingTime: PROCESSING_START_TIME,
              errorTime: new Date().toUTCString(),
              errorMessage: `Blocking game ${opticOddsHomeTeam} - ${opticOddsAwayTeam} due to game clock being unavailable`,
            });
            return false;
          }

          if (opticOddsResultData.status.toLowerCase() == "completed") {
            errorsMap.set(market.gameId, {
              processingTime: PROCESSING_START_TIME,
              errorTime: new Date().toUTCString(),
              errorMessage: `Blocking game ${opticOddsHomeTeam} - ${opticOddsAwayTeam} because it is finished.`,
            });
            return false;
          }

          const leagueSport = getLeagueSport(leagueId);
          if (leagueSport == Sport.SOCCER) {
            const constraintsMap = new Map();
            constraintsMap.set(Sport.SOCCER, Number(process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL));

            const passingConstraintsObject = checkGameContraints(opticOddsResultData, leagueId, constraintsMap);

            if (!passingConstraintsObject.allow) {
              errorsMap.set(market.gameId, {
                processingTime: PROCESSING_START_TIME,
                errorTime: new Date().toUTCString(),
                errorMessage: passingConstraintsObject.message,
              });
              return false;
            }
          }

          return true;
        });

      // ======================================== MAPPING MARKETS ========================================
      liveMarkets = ongoingMarketsByResults.map((market) => {
        let gamePaused = false;

        if (market.opticOddsGameOdds?.odds?.some((odds) => isOddsTimeStale(odds.timestamp))) {
          gamePaused = true;
        }

        // Reading clock, period and result data from results
        const currentScoreHome = market.opticOddsResultData.score_home_total;
        const currentScoreAway = market.opticOddsResultData.score_away_total;
        const currentClock = market.opticOddsResultData.clock;
        const currentPeriod = market.opticOddsResultData.period;
        const isLive = market.opticOddsResultData.is_live;
        const currentGameStatus = market.opticOddsResultData.status;
        const gamesHomeScoreByPeriod = [];
        const gamesAwayScoreByPeriod = [];

        if (currentGameStatus.toLowerCase().includes("half") || ("" + currentPeriod).toLowerCase().includes("half")) {
          gamePaused = false;
        }

        if (gamePaused) {
          const errorMessage = `Pausing game ${market.opticOddsGameOdds.home_team} - ${market.opticOddsGameOdds.away_team} due to odds being stale`;
          errorsMap.set(market.gameId, {
            processingTime: PROCESSING_START_TIME,
            errorTime: new Date().toUTCString(),
            errorMessage,
          });
          market.errorMessage = errorMessage;
          market.isPaused = true;
        }

        const leagueSport = getLeagueSport(Number(market.leagueId));

        if (leagueSport === Sport.TENNIS || leagueSport === Sport.VOLLEYBALL) {
          const resultInCurrentSet = fetchResultInCurrentSet(parseInt(currentPeriod), market.opticOddsResultData);
          gamesHomeScoreByPeriod.push(resultInCurrentSet.home);
          gamesAwayScoreByPeriod.push(resultInCurrentSet.away);
        }

        const opticOddsGameOddsData = { ...market.opticOddsGameOdds };

        // Remove temp Optic Odds data from market
        delete market.opticOddsGameEvent;
        delete market.opticOddsGameOdds;
        delete market.opticOddsResultData;

        market.homeScore = currentScoreHome;
        market.awayScore = currentScoreAway;
        market.gameClock = currentClock;
        market.gamePeriod = currentPeriod;
        market.childMarkets = [];
        market.proof = [];
        market.homeScoreByPeriod = gamesHomeScoreByPeriod;
        market.awayScoreByPeriod = gamesAwayScoreByPeriod;

        if (!market.errorMessage) {
          if (isLive) {
            const processedMarket = processMarket(
              market,
              opticOddsGameOddsData,
              bookmakers,
              spreadData,
              getLeagueIsDrawAvailable(market.leagueId),
              Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
              Number(process.env.MAX_PERCENTAGE_DIFF_BETWEEN_ODDS),
              config.leaguesData,
            );

            if (processedMarket.errorMessage) {
              errorsMap.set(market.gameId, {
                processingTime: PROCESSING_START_TIME,
                errorTime: new Date().toUTCString(),
                errorMessage: processedMarket.errorMessage,
              });
            }

            market = processedMarket;
            market.isPaused = isMarketPaused(market);
          } else {
            const errorMessage = `Provider marked game ${opticOddsGameOddsData.home_team} - ${opticOddsGameOddsData.away_team} as not live`;
            errorsMap.set(market.gameId, {
              processingTime: PROCESSING_START_TIME,
              errorTime: new Date().toUTCString(),
              errorMessage,
            });
            market.errorMessage = errorMessage;

            market.odds = market.odds.map(() => ({ american: 0, decimal: 0, normalizedImplied: 0 }));
          }
        }

        return market;
      });

      if (isTestnet && isDummyMarketsEnabled) {
        liveMarkets.push(...dummyMarketsLive);
      }

      console.log(`Live markets for league ID ${leagueId}:
        Number of ongoing markets ${ongoingMarkets.length}
        Number of Optic Odds games ${opticOddsGames.length} and matching games ${ongoingMarketsByOpticOddsGames.length}
        Number of Optic Odds odds ${oddsPerGame.length} and matching odds ${ongoingMarketsByOpticOddsOdds.length}
        Number of Optic Odds results ${resultsPerGame.length} and matching results ${ongoingMarketsByResults.length}`);
    } else {
      // IF NO MATCHES WERE FOUND WITH MATCHING CRITERIA
      console.log(
        `Live markets for league ID ${leagueId}: Could not find any live matches matching the criteria for team names and date`,
      );

      console.log(`Live markets for league ID ${leagueId}:
        Number of ongoing markets ${ongoingMarkets.length}
        Number of Optic Odds games ${opticOddsGames.length} and matching games ${ongoingMarketsByOpticOddsGames.length}`);
    }

    // PERSISTING ERROR MESSAGES
    if (errorsMap.size > 0) {
      SUPPORTED_NETWORKS.forEach((network) => persistErrorMessages(errorsMap, network));
    }
  } catch (e) {
    console.log(`Live markets: Processing error: ${e}`);
  }

  return liveMarkets;
}

module.exports = {
  processLiveMarkets,
};
