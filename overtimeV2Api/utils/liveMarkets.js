const axios = require("axios");
const {
  getLeagueTotalType,
  getLeagueSpreadType,
  getSpreadData,
  adjustSpreadOnOdds,
  MONEYLINE,
} = require("overtime-live-trading-utils");
const { getLeagueIsDrawAvailable, getLeagueSport } = require("./sports");
const oddslib = require("oddslib");
const { Sport } = require("../constants/sports");
const {
  OPTIC_ODDS_API_GAMES_URL,
  OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_SCORES_URL,
  OPTIC_ODDS_API_SCORES_MAX_GAMES,
  OPTIC_ODDS_API_TIMEOUT,
} = require("../constants/opticodds");
const teamsMapping = require("../assets/teamsMapping.json");
const { redisClient } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const { getLeagueOpticOddsName } = require("./sports");
const { readCsvFromUrl } = require("./csvReader");

const fetchTeamsMap = async (timeout) => {
  const teamsMap = new Map();

  const teamsMappingJsonResponse = await axios.get(process.env.GITHUB_URL_LIVE_TEAMS_MAPPING, { timeout });

  let teamsMappingJson = teamsMappingJsonResponse.data;

  if (teamsMappingJson == undefined || Object.keys(teamsMappingJson).length == 0) {
    teamsMappingJson = teamsMapping;
  }

  Object.keys(teamsMappingJson).forEach(function (key) {
    teamsMap.set(key.toString(), teamsMappingJson[key].toString());
  });

  return teamsMap;
};

const fetchGitHubConfig = async () => {
  const TIMEOUT = 2000;

  const teamsMapPromise = fetchTeamsMap(TIMEOUT);
  const bookmakersDataPromise = readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV, TIMEOUT);
  const spreadDataPromise = readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV, TIMEOUT);

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

  return {
    teamsMap,
    bookmakersData,
    spreadData,
  };
};

const fetchOpticOddsGamesForLeague = async (leagueId, isTestnet) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };

  // TODO: check tennis leagues
  const queryParams =
    getLeagueSport(leagueId) === Sport.TENNIS ? "sport=tennis" : `league=${getLeagueOpticOddsName(leagueId)}`;

  let opticOddsResponseData = [];
  try {
    const opticOddsGamesResponse = await axios.get(`${OPTIC_ODDS_API_GAMES_URL}${queryParams}`, {
      headers,
      timeout: OPTIC_ODDS_API_TIMEOUT,
    });
    opticOddsResponseData = opticOddsGamesResponse.data.data;
  } catch (e) {
    console.log(`Live markets: Fetching Optic Odds games error: ${e}`);
  }

  if (opticOddsResponseData.length == 0) {
    if (!isTestnet) {
      console.log(
        `Live markets: Could not find any live games on the provider side for the given league ID ${leagueId}`,
      );
    }
    return [];
  } else {
    return opticOddsResponseData;
  }
};

const fetchOpticOddsGameOddsForMarkets = async (markets, oddsProviders) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };
  let oddsRequestUrl = OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS;
  const opticOddsGameOddsPromises = [];

  const marketsLength = markets.length;

  markets.forEach((market, index) => {
    oddsRequestUrl += `&game_id=${market.opticOddsGameEvent.id}`;

    const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_ODDS_MAX_GAMES;
    // creating new request after max num of games or when last game in request
    if (gameNumInRequest == 0 || index == marketsLength - 1) {
      oddsRequestUrl += `&sportsbook=${oddsProviders.join("&sportsbook=")}`;

      const betTypes = [MONEYLINE];
      // SPREAD & TOTALS - GET SPREAD TYPE
      const spreadType = getLeagueSpreadType(market.leagueId);

      if (spreadType != undefined) {
        betTypes.push(spreadType);
      }
      // SPREAD & TOTALS - GET TOTAL TYPE
      const totalType = getLeagueTotalType(market.leagueId);

      if (totalType != undefined) {
        betTypes.push(totalType);
      }

      betTypes.forEach((betType) => {
        oddsRequestUrl += `&market_name=${betType}`;
      });

      opticOddsGameOddsPromises.push(axios.get(oddsRequestUrl, { headers, timeout: OPTIC_ODDS_API_TIMEOUT }));
      oddsRequestUrl = OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS;
    }
  });

  let oddsPerGamesResponses = [];
  try {
    oddsPerGamesResponses = await Promise.all(opticOddsGameOddsPromises);
  } catch (e) {
    console.log(`Live markets: Fetching Optic Odds game odds data error: ${e}`);
    oddsPerGamesResponses = [];
  }

  const oddsPerGame = oddsPerGamesResponses.map((oddsPerGameResponse) => oddsPerGameResponse.data.data).flat();
  return oddsPerGame;
};

const fetchOpticOddsScoresForMarkets = async (markets) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };
  let opticOddsScoresRequestUrl = OPTIC_ODDS_API_SCORES_URL;
  const opticOddsScoresPromises = [];

  // Prepare request for scores
  // For each game ID prepare separate request with max num of games
  const opticOddsGameIds = markets.map((market) => market.opticOddsGameOdds.id);
  opticOddsGameIds.forEach((gameId, index, allGameIds) => {
    const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_SCORES_MAX_GAMES;
    opticOddsScoresRequestUrl += `${gameNumInRequest > 1 ? "&" : ""}game_id=${gameId}`;

    // creating new request after max num of games or when last game in request
    if (gameNumInRequest == 0 || index == allGameIds.length - 1) {
      opticOddsScoresPromises.push(axios.get(opticOddsScoresRequestUrl, { headers, timeout: OPTIC_ODDS_API_TIMEOUT }));
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
  return scoresPerGame;
};

const persistErrorMessages = (errorsMap, network) => {
  redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network], function (err, obj) {
    const messagesMap = new Map(JSON.parse(obj));

    const persistedGameIds = Array.from(messagesMap.keys());
    const currentGameIds = Array.from(errorsMap.keys());

    // DELETE ERROR MESSAGES OLDER THAN 24H
    for (const gameId of persistedGameIds) {
      const errorsForGameId = messagesMap.get(gameId);
      const firstError = errorsForGameId[0];
      const dayAgo = Date.now() - 1000 * 60 * 60 * 24;
      if (dayAgo >= new Date(firstError.errorTime).getTime()) {
        messagesMap.delete(gameId);
      }
    }

    // ADD NEW MESSAGE ONLY IF IT IS DIFFERENT THAN THE LAST ONE
    for (const currentKey of currentGameIds) {
      const errorsArray = [];
      const newMessageObject = errorsMap.get(currentKey);
      if (persistedGameIds.includes(currentKey)) {
        const persistedValuesArray = messagesMap.get(currentKey);
        if (persistedValuesArray != undefined) {
          const latestMessageObject = persistedValuesArray[persistedValuesArray.length - 1];
          if (latestMessageObject.errorMessage != newMessageObject.errorMessage) {
            persistedValuesArray.push(newMessageObject);
            messagesMap.set(currentKey, persistedValuesArray);
          }
        } else {
          errorsArray.push(newMessageObject);
          messagesMap.set(currentKey, errorsArray);
        }
      } else {
        errorsArray.push(newMessageObject);
        messagesMap.set(currentKey, errorsArray);
      }
    }

    redisClient.set(
      KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network],
      JSON.stringify([...messagesMap]),
      function () {},
    );
  });
};

// DEPRECATE
const adjustSpreadAndReturnMarketWithOdds = (market, spreadData, odds, marketType) => {
  // CURRENTLY ONLY SUPPORTING MONEYLINE
  const spreadDataForSport = getSpreadData(
    spreadData,
    market.leagueId,
    marketType,
    Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
  );

  const oddsArrayWithSpread = getLeagueIsDrawAvailable(Number(market.leagueId))
    ? adjustSpreadOnOdds(
        [
          oddslib.from("decimal", odds.homeOdds).to("impliedProbability"),
          oddslib.from("decimal", odds.awayOdds).to("impliedProbability"),
          oddslib.from("decimal", odds.drawOdds).to("impliedProbability"),
        ],
        spreadDataForSport.minSpread,
        spreadDataForSport.targetSpread,
      )
    : adjustSpreadOnOdds(
        [
          oddslib.from("decimal", odds.homeOdds).to("impliedProbability"),
          oddslib.from("decimal", odds.awayOdds).to("impliedProbability"),
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

  return market;
};

module.exports = {
  adjustSpreadAndReturnMarketWithOdds,
  persistErrorMessages,
  fetchGitHubConfig,
  fetchOpticOddsGamesForLeague,
  fetchOpticOddsGameOddsForMarkets,
  fetchOpticOddsScoresForMarkets,
};
