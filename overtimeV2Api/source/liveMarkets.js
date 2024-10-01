const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const { MAX_ALLOWED_STALE_ODDS_DELAY } = require("../constants/markets");
const dummyMarketsLive = require("../utils/dummy/dummyMarketsLive.json");
const { NETWORK } = require("../constants/networks");
const { uniq } = require("lodash");
const {
  getLeagueIsDrawAvailable,
  getLeagueSport,
  getLiveSupportedLeagues,
  getTestnetLiveSupportedLeagues,
  getBetTypesForLeague,
} = require("../utils/sports");
const { Sport } = require("../constants/sports");
const {
  getBookmakersArray,
  teamNamesMatching,
  gamesDatesMatching,
  checkGameContraints,
  processMarket,
  fetchResultInCurrentSet,
} = require("overtime-live-trading-utils");
const {
  fetchGitHubConfig,
  fetchOpticOddsGamesForLeague,
  fetchOpticOddsGameOddsForMarkets,
  fetchOpticOddsScoresForMarkets,
  persistErrorMessages,
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
  Processing steps:
    - Get supported live league IDs from config(LeagueMap) and from env for tennis
    - Get open markets from Redis and filter by ongoing and live supported
    - Get teams map, bookmakers and spread data from Github
    - Process markets from each league
*/
async function processAllMarkets(isTestnet) {
  const SUPPORTED_NETWORKS = isTestnet ? [NETWORK.OptimismSepolia] : [NETWORK.Optimism, NETWORK.Arbitrum];

  // Get supported live leagues
  const supportedLiveLeagueIds = isTestnet ? getTestnetLiveSupportedLeagues() : getLiveSupportedLeagues();
  // Read open markets only from one network as markets are the same on all networks
  const openMarketsMap = await getOpenMarkets(SUPPORTED_NETWORKS[0]);

  const supportedLiveMarkets = Array.from(openMarketsMap.values())
    .filter((market) => market.statusCode === "ongoing" && !market.isWholeGameResolved && !market.noTickets)
    .filter((market) => supportedLiveLeagueIds.includes(market.leagueId));
  const uniqueLiveLeagueIds = uniq(supportedLiveMarkets.map((market) => market.leagueId));

  console.log(`Live markets: Number of ongoing leagues ${uniqueLiveLeagueIds.length}`);

  // Get teams map, bookmakers and spread data from Github
  const config = await fetchGitHubConfig();

  const processedMarketsPromises = uniqueLiveLeagueIds.map((leagueId) => {
    const ongoingLeagueMarkets = supportedLiveMarkets.filter((market) => market.leagueId === leagueId);
    return processMarketsByLeague(leagueId, ongoingLeagueMarkets, config, isTestnet);
  });

  const processedMarketsResponses = await Promise.all(processedMarketsPromises);
  const liveMarkets = processedMarketsResponses.flat();

  SUPPORTED_NETWORKS.forEach((network) =>
    redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS[network], JSON.stringify(liveMarkets), function () {}),
  );
}

/*
  Processing steps:
    - Get OpticOdds games for supported live leagues from OpticOdds API by league
    - Filter by OpticOdds games (teams name and date)
    - Get OpticOdds odds for games from OpticOdds API by game IDs and league providers
    - Get OpticOdds scores from OpticOdds API
    - Returns processed matched live markets
*/
async function processMarketsByLeague(leagueId, ongoingMarkets, config, isTestnet) {
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
      .filter((market) => market.opticOddsGameEvent != undefined);

    const isDummyMarketsEnabled = isTestnet && process.env.LIVE_DUMMY_MARKETS_ENABLED === "true";

    if (ongoingMarketsByOpticOddsGames.length > 0 || isDummyMarketsEnabled) {
      // Extracting bookmakers for league
      const liveOddsProviders = getBookmakersArray(
        bookmakersData,
        Number(leagueId),
        process.env.LIVE_ODDS_PROVIDERS.split(","),
      );

      // ==================== Fetching game odds from Optic Odds for given markets ====================
      const oddsPerGame = await fetchOpticOddsGameOddsForMarkets(ongoingMarketsByOpticOddsGames, liveOddsProviders);

      // Add Optic Odds game odds data and filter it
      const ongoingMarketsByOpticOddsOdds = ongoingMarketsByOpticOddsGames
        .map((market) => {
          const opticOddsGameOdds = oddsPerGame.find((game) => game.id == market.opticOddsGameEvent.id);
          return { ...market, opticOddsGameOdds };
        })
        .filter((market) => market.opticOddsGameOdds != undefined);

      // ==================== Fetching game scores from Optic Odds for given markets ====================
      const scoresPerGame = await fetchOpticOddsScoresForMarkets(ongoingMarketsByOpticOddsOdds);

      // Add Optic Odds game scores data and filter it
      const ongoingMarketsByScores = ongoingMarketsByOpticOddsOdds
        .map((market) => {
          const opticOddsScoreData = scoresPerGame.find((game) => game.game_id == market.opticOddsGameOdds.id);
          return { ...market, opticOddsScoreData };
        })
        .filter((market) => {
          const opticOddsScoreData = market.opticOddsScoreData;
          const opticOddsHomeTeam = market.opticOddsGameOdds.home_team;
          const opticOddsAwayTeam = market.opticOddsGameOdds.away_team;

          if (opticOddsScoreData == undefined) {
            errorsMap.set(market.gameId, {
              processingTime: PROCESSING_START_TIME,
              errorTime: new Date().toUTCString(),
              errorMessage: `Blocking game ${opticOddsHomeTeam} - ${opticOddsAwayTeam} due to game clock being unavailable`,
            });
            return false;
          }

          if (opticOddsScoreData.status.toLowerCase() == "completed") {
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

            const passingConstraintsObject = checkGameContraints(opticOddsScoreData, leagueId, constraintsMap);

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

      // ==================== Mapping markets ====================
      liveMarkets = ongoingMarketsByScores.map((market) => {
        let gamePaused = false;

        if (
          market.opticOddsGameOdds?.odds?.some((odds) => {
            if (typeof odds.timestamp !== "number") {
              return true;
            }
            const now = new Date();
            const oddsDate = new Date(odds.timestamp * 1000);
            const timeDiff = now.getTime() - oddsDate.getTime();
            return timeDiff > MAX_ALLOWED_STALE_ODDS_DELAY;
          })
        ) {
          gamePaused = true;
        }

        // Reading clock, period and result data from scores
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
          const errorMessage = `Pausing game ${market.opticOddsGameOdds.home_team} - ${market.opticOddsGameOdds.away_team} due to odds being stale`;
          errorsMap.set(market.gameId, {
            processingTime: PROCESSING_START_TIME,
            errorTime: new Date().toUTCString(),
            errorMessage,
          });
          market.errorMessage = errorMessage;
          market.opticOddsGameOdds.odds = [];
        }

        const leagueSport = getLeagueSport(Number(market.leagueId));

        if (leagueSport === Sport.TENNIS || leagueSport === Sport.VOLLEYBALL) {
          const resultInCurrentSet = fetchResultInCurrentSet(parseInt(currentPeriod), market.opticOddsScoreData);
          gamesHomeScoreByPeriod.push(resultInCurrentSet.home);
          gamesAwayScoreByPeriod.push(resultInCurrentSet.away);
        }

        const opticOddsGameOddsData = { ...market.opticOddsGameOdds };

        // Remove temp Optic Odds data from market
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

        if (!market.errorMessage) {
          if (isLive) {
            const processedMarket = processMarket(
              market,
              opticOddsGameOddsData,
              liveOddsProviders,
              spreadData,
              getLeagueIsDrawAvailable(market.leagueId),
              Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
              Number(process.env.MAX_PERCENTAGE_DIFF_BETWEEN_ODDS),
            );

            if (processedMarket.errorMessage) {
              errorsMap.set(market.gameId, {
                processingTime: PROCESSING_START_TIME,
                errorTime: new Date().toUTCString(),
                errorMessage: processedMarket.errorMessage,
              });
            }

            market = processedMarket;
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
        Number of Optic Odds scores ${scoresPerGame.length} and matching scores ${ongoingMarketsByScores.length}`);
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
