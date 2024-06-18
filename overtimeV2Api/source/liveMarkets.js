require("dotenv").config();

const redis = require("redis");
const { delay } = require("../utils/general");
const KEYS = require("../../redis/redis-keys");
const oddslib = require("oddslib");
const axios = require("axios");
const {
  checkOddsFromMultipleBookmakersV2,
  getAverageOdds,
  adjustSpreadOnOdds,
  getSpreadData,
} = require("../utils/markets");
const { LIVE_TYPE_ID_BASE } = require("../constants/markets");
const teamsMapping = require("../assets/teamsMapping.json");
const dummyMarketsLive = require("../utils/dummy/dummyMarketsLive.json");
const { NETWORK } = require("../constants/networks");
const { readCsvFromUrl } = require("../utils/csvReader");
const { groupBy } = require("lodash");
const {
  getLeagueIsDrawAvailable,
  getLeagueSport,
  getLiveSupportedLeagues,
  getLeagueOpticOddsName,
} = require("../utils/sports");
const { Sport, LEAGUES_NO_FORMAL_HOME_AWAY } = require("../constants/sports");

async function processLiveMarkets() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
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
  const errors = [];
  let availableLeagueIds = getLiveSupportedLeagues();

  const liveOddsProviders = process.env.LIVE_ODDS_PROVIDERS.split(",");

  const spreadData = await readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV);

  if (liveOddsProviders.length == 0) {
    console.log(`No supported live odds providers found in the config`);
    return;
  }

  redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], async function (err, obj) {
    const markets = new Map(JSON.parse(obj));

    const enabledDummyMarkets = Number(network) !== 11155420 ? 0 : Number(process.env.LIVE_DUMMY_MARKETS_ENABLED);
    try {
      let allMarkets = Array.from(markets.values());
      const groupMarketsByStatus = groupBy(allMarkets, (market) => market.statusCode);

      const marketsByStatus = groupMarketsByStatus["ongoing"] || [];
      let marketsByType = marketsByStatus;

      const filteredMarkets = marketsByType.filter((market) => availableLeagueIds.includes(Number(market.leagueId)));
      if (filteredMarkets && filteredMarkets.length > 0) {
        const leagueIdsMap = {};

        filteredMarkets.forEach((market) => (leagueIdsMap[market.leagueId] = true));
        availableLeagueIds = Object.keys(leagueIdsMap);

        const teamsMap = new Map();

        Object.keys(teamsMapping).forEach(function (key) {
          teamsMap.set(key, teamsMapping[key]);
        });

        let opticOddsResponseData = [];

        for (const leagueId of availableLeagueIds) {
          const leagueName = getLeagueOpticOddsName(leagueId);

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
            errors.push(`Could not find any games on the provider side for the given league ${leagueName}`);
          } else {
            opticOddsResponseData = [...opticOddsResponseData, ...opticOddsResponseDataForLeague];
          }
        }

        const providerMarketsMatchingOffer = [];
        filteredMarkets.forEach((market) => {
          const opticOddsGameEvent = opticOddsResponseData.find((opticOddsGame) => {
            let homeTeamsMatch;
            let awayTeamsMatch;

            if (LEAGUES_NO_FORMAL_HOME_AWAY.includes(Number(market.leagueId))) {
              homeTeamsMatch =
                opticOddsGame.home_team.toLowerCase() == market.homeTeam.toLowerCase() ||
                opticOddsGame.home_team.toLowerCase() == market.awayTeam.toLowerCase();
              awayTeamsMatch =
                opticOddsGame.away_team.toLowerCase() == market.homeTeam.toLowerCase() ||
                opticOddsGame.away_team.toLowerCase() == market.awayTeam.toLowerCase();
            } else {
              homeTeamsMatch = opticOddsGame.home_team.toLowerCase() == market.homeTeam.toLowerCase();
              awayTeamsMatch = opticOddsGame.away_team.toLowerCase() == market.awayTeam.toLowerCase();
            }

            if (homeTeamsMatch !== true && awayTeamsMatch !== true) {
              const homeTeamOpticOdds = teamsMap.get(opticOddsGame.home_team.toLowerCase());
              const awayTeamOpticOdds = teamsMap.get(opticOddsGame.away_team.toLowerCase());

              const gameHomeTeam = teamsMap.get(market.homeTeam.toLowerCase());
              const gameAwayTeam = teamsMap.get(market.awayTeam.toLowerCase());

              const hasUndefinedName = [homeTeamOpticOdds, awayTeamOpticOdds, gameHomeTeam, gameAwayTeam].some(
                (name) => name == undefined,
              );

              if (hasUndefinedName) {
                return false;
              }

              if (LEAGUES_NO_FORMAL_HOME_AWAY.includes(Number(market.leagueId))) {
                homeTeamsMatch = homeTeamOpticOdds == gameHomeTeam || homeTeamOpticOdds == gameAwayTeam;
                awayTeamsMatch = awayTeamOpticOdds == gameHomeTeam || awayTeamOpticOdds == gameAwayTeam;
              } else {
                homeTeamsMatch = homeTeamOpticOdds == gameHomeTeam;
                awayTeamsMatch = awayTeamOpticOdds == gameAwayTeam;
              }
            }

            let datesMatch;
            if (getLeagueSport(Number(market.leagueId)) === Sport.TENNIS) {
              const opticOddsTimestamp = new Date(opticOddsGame.start_date).getTime();
              const marketTimestamp = new Date(market.maturityDate).getTime();
              const differenceBetweenDates = Math.abs(marketTimestamp - opticOddsTimestamp);
              if (differenceBetweenDates <= Number(process.env.TENNIS_MATCH_TIME_DIFFERENCE_MINUTES * 60 * 1000)) {
                datesMatch = true;
              } else {
                datesMatch = false;
              }
            } else {
              datesMatch =
                new Date(opticOddsGame.start_date).toUTCString() == new Date(market.maturityDate).toUTCString();
            }

            return homeTeamsMatch && awayTeamsMatch && datesMatch;
          });
          if (opticOddsGameEvent != undefined) {
            providerMarketsMatchingOffer.push(opticOddsGameEvent);
          }
        });

        if (providerMarketsMatchingOffer.length == 0 && enabledDummyMarkets == 0) {
          errors.push(`Could not find any matches on the provider side for the given leagues`);
          return;
        }

        const urlsGamesOdds = providerMarketsMatchingOffer.map((game) => {
          let url = `https://api.opticodds.com/api/v2/game-odds?game_id=${game.id}&market_name=Moneyline&odds_format=Decimal`;
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
            let homeTeamsMatch;
            let awayTeamsMatch;

            if (LEAGUES_NO_FORMAL_HOME_AWAY.includes(Number(market.leagueId))) {
              homeTeamsMatch =
                response.home_team.toLowerCase() == market.homeTeam.toLowerCase() ||
                response.home_team.toLowerCase() == market.awayTeam.toLowerCase();
              awayTeamsMatch =
                response.away_team.toLowerCase() == market.homeTeam.toLowerCase() ||
                response.away_team.toLowerCase() == market.awayTeam.toLowerCase();
            } else {
              homeTeamsMatch = response.home_team.toLowerCase() == market.homeTeam.toLowerCase();
              awayTeamsMatch = response.away_team.toLowerCase() == market.awayTeam.toLowerCase();
            }

            if (homeTeamsMatch !== true && awayTeamsMatch !== true) {
              const homeTeamOpticOdds = teamsMap.get(response.home_team.toLowerCase());
              const awayTeamOpticOdds = teamsMap.get(response.away_team.toLowerCase());

              const gameHomeTeam = teamsMap.get(market.homeTeam.toLowerCase());
              const gameAwayTeam = teamsMap.get(market.awayTeam.toLowerCase());

              const hasUndefinedName = [homeTeamOpticOdds, awayTeamOpticOdds, gameHomeTeam, gameAwayTeam].some(
                (name) => name == undefined,
              );

              if (hasUndefinedName) {
                return false;
              }

              if (LEAGUES_NO_FORMAL_HOME_AWAY.includes(Number(market.leagueId))) {
                homeTeamsMatch = homeTeamOpticOdds == gameHomeTeam || homeTeamOpticOdds == gameAwayTeam;
                awayTeamsMatch = awayTeamOpticOdds == gameHomeTeam || awayTeamOpticOdds == gameAwayTeam;
              } else {
                homeTeamsMatch = homeTeamOpticOdds == gameHomeTeam;
                awayTeamsMatch = awayTeamOpticOdds == gameAwayTeam;
              }
            }

            let datesMatch;
            if (getLeagueSport(Number(market.leagueId)) === Sport.TENNIS) {
              const opticOddsTimestamp = new Date(response.start_date).getTime();
              const marketTimestamp = new Date(market.maturityDate).getTime();

              const differenceBetweenDates = Math.abs(marketTimestamp - opticOddsTimestamp);
              if (differenceBetweenDates <= Number(process.env.TENNIS_MATCH_TIME_DIFFERENCE_MINUTES * 60 * 1000)) {
                datesMatch = true;
              } else {
                datesMatch = false;
              }
            } else {
              datesMatch = new Date(response.start_date).toUTCString() == new Date(market.maturityDate).toUTCString();
            }

            return homeTeamsMatch && awayTeamsMatch && datesMatch;
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

            if (getLeagueSport(Number(market.leagueId)) === Sport.BASKETBALL) {
              const quarterLimitForLiveTradingBasketball = Number(
                process.env.QUARTER_LIMIT_FOR_LIVE_TRADING_BASKETBALL,
              );
              if (Number(currentPeriod) >= quarterLimitForLiveTradingBasketball) {
                console.log(
                  `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} due to period: ${currentPeriod}. quarter`,
                );
                return null;
              }
            }

            if (getLeagueSport(Number(market.leagueId)) === Sport.HOCKEY) {
              const periodLimitForLiveTradingHockey = Number(process.env.PERIOD_LIMIT_FOR_LIVE_TRADING_HOCKEY);
              if (Number(currentPeriod) >= periodLimitForLiveTradingHockey) {
                console.log(
                  `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} due to period: ${currentPeriod}. period`,
                );
                return null;
              }
            }

            if (getLeagueSport(Number(market.leagueId)) === Sport.BASEBALL) {
              const inningLimitForLiveTradingBaseball = Number(process.env.INNING_LIMIT_FOR_LIVE_TRADING_BASEBALL);
              if (Number(currentPeriod) >= inningLimitForLiveTradingBaseball) {
                console.log(
                  `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} due to period: ${currentPeriod}. inning`,
                );
                return null;
              }
            }

            if (getLeagueSport(Number(market.leagueId)) === Sport.SOCCER) {
              const minuteLimitForLiveTradingFootball = Number(process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL);
              if (currentClock != null && Number(currentClock) >= minuteLimitForLiveTradingFootball) {
                console.log(
                  `Blocking game ${gameWithOdds.home_team} - ${gameWithOdds.away_team} due to clock: ${currentClock}min`,
                );
                return null;
              }
            }

            let linesMap = new Map();

            liveOddsProviders.forEach((oddsProvider) => {
              const providerOddsObjects = gameWithOdds.odds.filter(
                (oddsObject) => oddsObject.sports_book_name.toLowerCase() == oddsProvider.toLowerCase(),
              );

              const opticOddsTeamName = teamsMap.get(oddsObject.name.toLowerCase());
              const gameHomeTeam = teamsMap.get(market.homeTeam.toLowerCase());
              const gameAwayTeam = teamsMap.get(market.awayTeam.toLowerCase());

              let homeOddsObject;
              if (opticOddsTeamName == undefined || gameHomeTeam == undefined) {
                homeOddsObject = providerOddsObjects.find(
                  (oddsObject) => oddsObject.name.toLowerCase() == market.homeTeam.toLowerCase(),
                );
              } else {
                homeOddsObject = providerOddsObjects.find(
                  (oddsObject) =>
                    teamsMap.get(oddsObject.name.toLowerCase()) == teamsMap.get(market.homeTeam.toLowerCase()),
                );
              }

              let homeOdds = 0;
              if (homeOddsObject != undefined) {
                homeOdds = homeOddsObject.price;
              }

              let awayOddsObject;
              if (opticOddsTeamName == undefined || gameAwayTeam == undefined) {
                awayOddsObject = providerOddsObjects.find(
                  (oddsObject) => oddsObject.name.toLowerCase() == market.awayTeam.toLowerCase(),
                );
              } else {
                awayOddsObject = providerOddsObjects.find(
                  (oddsObject) =>
                    teamsMap.get(oddsObject.name.toLowerCase()) == teamsMap.get(market.awayTeam.toLowerCase()),
                );
              }

              let awayOdds = 0;
              if (awayOddsObject != undefined) {
                awayOdds = awayOddsObject.price;
              }

              let drawOdds = 0;
              if (getLeagueIsDrawAvailable(Number(market.leagueId))) {
                const drawOddsObject = providerOddsObjects.find(
                  (oddsObject) => oddsObject.name.toLowerCase() == "draw",
                );

                if (drawOddsObject != undefined) {
                  drawOdds = drawOddsObject.price;
                }
              }

              linesMap.set(oddsProvider.toLowerCase(), {
                homeOdds: homeOdds,
                awayOdds: awayOdds,
                drawOdds: drawOdds,
              });
            });

            console.log(linesMap);

            const oddsList = checkOddsFromMultipleBookmakersV2(
              linesMap,
              liveOddsProviders,
              getLeagueIsDrawAvailable(Number(market.leagueId)),
            );

            console.log("ODDS AFTER CHECKING BOOKMAKERS:");
            console.log(oddsList);

            const isThere100PercentOdd = oddsList.some(
              (oddsObject) => oddsObject.homeOdds == 1 || oddsObject.awayOdds == 1 || oddsObject.drawOdds == 1,
            );

            if (
              isThere100PercentOdd ||
              (oddsList[0].homeOdds == 0 && oddsList[0].awayOdds == 0 && oddsList[0].drawOdds == 0)
            ) {
              market.odds = market.odds.map((_odd) => {
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
              return market;
            } else {
              const aggregationEnabled = Number(process.env.ODDS_AGGREGATION_ENABLED);
              if (aggregationEnabled > 0) {
                const aggregatedOdds = getAverageOdds(oddsList);

                // CURRENTLY ONLY SUPPORTING MONEYLINE
                const spreadDataForSport = getSpreadData(spreadData, market.leagueId, LIVE_TYPE_ID_BASE);

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
                    case 1:
                      positionOdds = oddsArrayWithSpread[1];
                    case 2:
                      positionOdds = oddsArrayWithSpread[2];
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
                return market;
              } else {
                const primaryBookmakerOdds = oddsList[0];
                console.log("Finding spread:");
                // CURRENTLY ONLY SUPPORTING MONEYLINE
                const spreadDataForSport = getSpreadData(spreadData, market.leagueId, LIVE_TYPE_ID_BASE);

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
                return market;
              }
            }
          } else {
            return null;
          }
        });
        let filteredMarketsWithLiveOddsAndDummyMarkets;
        const resolvedMarketPromises = await Promise.all(filteredMarketsWithLiveOdds);

        let dummyMarkets = [];
        if (Number(network) == 11155420) {
          dummyMarkets = [...dummyMarketsLive];
        }
        filteredMarketsWithLiveOddsAndDummyMarkets = resolvedMarketPromises.concat(dummyMarkets);

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
