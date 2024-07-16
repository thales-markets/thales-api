const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const oddslib = require("oddslib");
const axios = require("axios");
const { getAverageOdds } = require("../utils/markets");
const { LIVE_TYPE_ID_BASE, MIN_ODDS_FOR_DIFF_CHECKING } = require("../constants/markets");
const teamsMapping = require("../assets/teamsMapping.json");
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
const { Sport, League } = require("../constants/sports");
const {
  readCsvFromUrl,
  getBookmakersArray,
  teamNamesMatching,
  gamesDatesMatching,
  checkGameContraints,
  extractOddsForGamePerProvider,
  checkOddsFromBookmakers,
  adjustSpreadOnOdds,
  getSpreadData,
} = require("overtime-live-trading-utils");

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

  const enabledTennisMasters = Number(process.env.ENABLED_TENNIS_MASTERS);
  const enabledTennisGrandSlam = Number(process.env.ENABLED_TENNIS_GRAND_SLAM);

  const tennisMastersIndex = availableLeagueIds.indexOf(League.TENNIS_MASTERS);
  const tennisGrandSlamIndex = availableLeagueIds.indexOf(League.TENNIS_GS);

  if (tennisMastersIndex == -1 && enabledTennisMasters == 1) {
    availableLeagueIds.push(League.TENNIS_MASTERS);
  }

  if (tennisGrandSlamIndex == -1 && enabledTennisGrandSlam == 1) {
    availableLeagueIds.push(League.TENNIS_GS);
  }

  redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], async function (err, obj) {
    const markets = new Map(JSON.parse(obj));

    const enabledDummyMarkets =
      Number(network) !== NETWORK.OptimismSepolia ? 0 : Number(process.env.LIVE_DUMMY_MARKETS_ENABLED);
    try {
      const allMarkets = Array.from(markets.values());
      const groupMarketsByStatus = groupBy(allMarkets, (market) => market.statusCode);

      const marketsByStatus = groupMarketsByStatus["ongoing"] || [];
      const marketsByType = marketsByStatus;

      const filteredMarkets = marketsByType.filter((market) => availableLeagueIds.includes(Number(market.leagueId)));
      if (filteredMarkets.length > 0) {
        const leagueIdsMap = {};

        filteredMarkets.forEach((market) => (leagueIdsMap[market.leagueId] = true));
        availableLeagueIds = Object.keys(leagueIdsMap);

        const teamsMap = new Map();

        const teamsMappingJsonResponse = await axios.get(process.env.GITHUB_URL_LIVE_TEAMS_MAPPING);

        let teamsMappingJson = teamsMappingJsonResponse.data;

        if (teamsMappingJson == undefined || Object.keys(teamsMappingJson).length == 0) {
          teamsMappingJson = teamsMapping;
        }

        Object.keys(teamsMappingJson).forEach(function (key) {
          teamsMap.set(key.toString(), teamsMappingJson[key].toString());
        });

        let opticOddsResponseData = [];

        for (const leagueId of availableLeagueIds) {
          const leagueName = getLeagueOpticOddsName(leagueId);

          const oddsProvidersForSport = getBookmakersArray(
            bookmakersData,
            Number(leagueId),
            process.env.LIVE_ODDS_PROVIDERS.split(","),
          );

          liveOddsProvidersPerSport.set(Number(leagueId), oddsProvidersForSport);

          let responseOpticOddsGames;
          if (getLeagueSport(Number(leagueId)) === Sport.TENNIS) {
            responseOpticOddsGames = await axios.get(`https://api.opticodds.com/api/v2/games?sport=tennis`, {
              headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
            });
          } else {
            responseOpticOddsGames = await axios.get(`https://api.opticodds.com/api/v2/games?league=${leagueName}`, {
              headers: { "x-api-key": process.env.OPTIC_ODDS_API_KEY },
            });
          }

          const opticOddsResponseDataForLeague = responseOpticOddsGames.data.data;

          if (opticOddsResponseDataForLeague.length == 0) {
            console.log(`Could not find any games on the provider side for the given league ${leagueName}`);
          } else {
            opticOddsResponseData = [...opticOddsResponseData, ...opticOddsResponseDataForLeague];
          }
        }

        const providerMarketsMatchingOffer = [];
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

        if (providerMarketsMatchingOffer.length == 0 && enabledDummyMarkets == 0) {
          console.log(`Could not find any matches on the provider side for the given leagues`);
          return;
        }

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
              console.log(
                `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} due to game clock being unavailable`,
              );
              return null;
            }

            const currentScoreHome = gameTimeOpticOddsResponseData.score_home_total;
            const currentScoreAway = gameTimeOpticOddsResponseData.score_away_total;
            const currentClock = gameTimeOpticOddsResponseData.clock;
            const currentPeriod = gameTimeOpticOddsResponseData.period;
            const isLive = gameTimeOpticOddsResponseData.is_live;
            const currentGameStatus = gameTimeOpticOddsResponseData.status;
            const gamesHomeScoreByPeriod = [];
            const gamesAwayScoreByPeriod = [];

            if (currentGameStatus.toLowerCase() == "completed") {
              console.log(
                `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} because it is finished.`,
              );
              return null;
            }

            const constraintsMap = new Map();

            constraintsMap.set(Sport.BASKETBALL, Number(process.env.QUARTER_LIMIT_FOR_LIVE_TRADING_BASKETBALL));
            constraintsMap.set(Sport.HOCKEY, Number(process.env.PERIOD_LIMIT_FOR_LIVE_TRADING_HOCKEY));
            constraintsMap.set(Sport.BASEBALL, Number(process.env.INNING_LIMIT_FOR_LIVE_TRADING_BASEBALL));
            constraintsMap.set(Sport.SOCCER, Number(process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL));

            const passingConstraintsObject = checkGameContraints(
              gameTimeOpticOddsResponseData,
              Number(market.leagueId),
              constraintsMap,
            );

            if (passingConstraintsObject.allow == false) {
              console.log(passingConstraintsObject.message);
              return null;
            }

            const liveOddsProviders = liveOddsProvidersPerSport.get(Number(market.leagueId));

            const linesMap = extractOddsForGamePerProvider(
              liveOddsProviders,
              gameWithOdds,
              market,
              teamsMap,
              getLeagueIsDrawAvailable(Number(market.leagueId)),
            );

            console.log(linesMap);

            const oddsList = checkOddsFromBookmakers(
              linesMap,
              liveOddsProviders,
              getLeagueIsDrawAvailable(Number(market.leagueId)),
              Number(process.env.MAX_PERCENTAGE_DIFF_BETWEEN_ODDS),
              MIN_ODDS_FOR_DIFF_CHECKING,
            );

            console.log("ODDS AFTER CHECKING BOOKMAKERS:");
            console.log(oddsList);

            const isThere100PercentOdd = oddsList.some(
              (oddsObject) => oddsObject.homeOdds == 1 || oddsObject.awayOdds == 1 || oddsObject.drawOdds == 1,
            );

            if (
              isThere100PercentOdd ||
              (oddsList[0].homeOdds == 0 && oddsList[0].awayOdds == 0 && oddsList[0].drawOdds == 0) ||
              isLive == false
            ) {
              market.odds = market.odds.map(() => {
                return {
                  american: 0,
                  decimal: 0,
                  normalizedImplied: 0,
                };
              });
              market.homeScore = currentScoreHome;
              market.awayScore = currentScoreAway;
              market.gameClock = currentClock;
              market.gamePeriod = currentPeriod;
              market.childMarkets = [];
              market.proof = [];
              market.homeScoreByPeriod = gamesHomeScoreByPeriod;
              market.awayScoreByPeriod = gamesAwayScoreByPeriod;
              return market;
            } else {
              const aggregationEnabled = Number(process.env.ODDS_AGGREGATION_ENABLED);
              if (aggregationEnabled > 0) {
                const aggregatedOdds = getAverageOdds(oddsList);

                // CURRENTLY ONLY SUPPORTING MONEYLINE
                const spreadDataForSport = getSpreadData(
                  spreadData,
                  market.leagueId,
                  LIVE_TYPE_ID_BASE,
                  Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
                );

                console.log(market.leagueId);
                console.log(spreadDataForSport);

                const oddsArrayWithSpread = getLeagueIsDrawAvailable(Number(market.leagueId))
                  ? adjustSpreadOnOdds(
                      [
                        oddslib.from("decimal", aggregatedOdds.homeOdds).to("impliedProbability"),
                        oddslib.from("decimal", aggregatedOdds.awayOdds).to("impliedProbability"),
                        oddslib.from("decimal", aggregatedOdds.drawOdds).to("impliedProbability"),
                      ],
                      spreadDataForSport.minSpread,
                      spreadDataForSport.targetSpread,
                    )
                  : adjustSpreadOnOdds(
                      [
                        oddslib.from("decimal", aggregatedOdds.homeOdds).to("impliedProbability"),
                        oddslib.from("decimal", aggregatedOdds.awayOdds).to("impliedProbability"),
                      ],
                      spreadDataForSport.minSpread,
                      spreadDataForSport.targetSpread,
                    );

                market.odds = market.odds.map((_odd, index) => {
                  let positionOdds;
                  switch (index) {
                    case 0:
                      positionOdds = oddsArrayWithSpread[0];
                      break;
                    case 1:
                      positionOdds = oddsArrayWithSpread[1];
                      break;
                    case 2:
                      positionOdds = oddsArrayWithSpread[2];
                      break;
                  }
                  return {
                    american: oddslib.from("impliedProbability", positionOdds).to("moneyline"),
                    decimal: oddslib.from("impliedProbability", positionOdds).to("decimal"),
                    normalizedImplied: positionOdds,
                  };
                });
                market.homeScore = currentScoreHome;
                market.awayScore = currentScoreAway;
                market.gameClock = currentClock;
                market.gamePeriod = currentPeriod;
                market.childMarkets = [];
                market.proof = [];
                market.homeScoreByPeriod = gamesHomeScoreByPeriod;
                market.awayScoreByPeriod = gamesAwayScoreByPeriod;
                return market;
              } else {
                const primaryBookmakerOdds = oddsList[0];
                console.log("Finding spread:");
                // CURRENTLY ONLY SUPPORTING MONEYLINE
                const spreadDataForSport = getSpreadData(
                  spreadData,
                  market.leagueId,
                  LIVE_TYPE_ID_BASE,
                  Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
                );

                console.log(market.leagueId);
                console.log(spreadDataForSport);

                const oddsArrayWithSpread = getLeagueIsDrawAvailable(Number(market.leagueId))
                  ? adjustSpreadOnOdds(
                      [
                        oddslib.from("decimal", primaryBookmakerOdds.homeOdds).to("impliedProbability"),
                        oddslib.from("decimal", primaryBookmakerOdds.awayOdds).to("impliedProbability"),
                        oddslib.from("decimal", primaryBookmakerOdds.drawOdds).to("impliedProbability"),
                      ],
                      spreadDataForSport.minSpread,
                      spreadDataForSport.targetSpread,
                    )
                  : adjustSpreadOnOdds(
                      [
                        oddslib.from("decimal", primaryBookmakerOdds.homeOdds).to("impliedProbability"),
                        oddslib.from("decimal", primaryBookmakerOdds.awayOdds).to("impliedProbability"),
                      ],
                      spreadDataForSport.minSpread,
                      spreadDataForSport.targetSpread,
                    );

                market.odds = market.odds.map((_odd, index) => {
                  let positionOdds;
                  switch (index) {
                    case 0:
                      positionOdds = oddsArrayWithSpread[0];
                      break;
                    case 1:
                      positionOdds = oddsArrayWithSpread[1];
                      break;
                    case 2:
                      positionOdds = oddsArrayWithSpread[2];
                      break;
                  }
                  console.log(positionOdds);
                  return {
                    american: oddslib.from("impliedProbability", positionOdds).to("moneyline"),
                    decimal: oddslib.from("impliedProbability", positionOdds).to("decimal"),
                    normalizedImplied: positionOdds,
                  };
                });
                market.homeScore = currentScoreHome;
                market.awayScore = currentScoreAway;
                market.gameClock = currentClock;
                market.gamePeriod = currentPeriod;
                market.childMarkets = [];
                market.proof = [];
                market.homeScoreByPeriod = gamesHomeScoreByPeriod;
                market.awayScoreByPeriod = gamesAwayScoreByPeriod;
                return market;
              }
            }
          } else {
            return null;
          }
        });

        const resolvedMarketPromises = await Promise.all(filteredMarketsWithLiveOdds);

        let dummyMarkets = [];
        if (Number(network) == 11155420) {
          dummyMarkets = [...dummyMarketsLive];
        }
        const filteredMarketsWithLiveOddsAndDummyMarkets = resolvedMarketPromises.concat(dummyMarkets);

        redisClient.set(
          KEYS.OVERTIME_V2_LIVE_MARKETS[network],
          JSON.stringify(filteredMarketsWithLiveOddsAndDummyMarkets.filter((market) => market != null)),
          function () {},
        );
        return;
      }
      redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS[network], JSON.stringify([]), function () {});
    } catch (e) {
      console.log(e);
    }
  });
}

module.exports = {
  processLiveMarkets,
};
