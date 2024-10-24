const axios = require("axios");
const { OPTIC_ODDS_API_GAMES_URL } = require("../constants/opticodds");
const teamsMapping = require("../assets/teamsMapping.json");
const { redisClient } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const { getLeagueSport, getLeagueOpticOddsName, Sport } = require("overtime-live-trading-utils");

const fetchTeamsMap = async () => {
  const teamsMap = new Map();

  const teamsMappingJsonResponse = await axios.get(process.env.GITHUB_URL_LIVE_TEAMS_MAPPING);

  let teamsMappingJson = teamsMappingJsonResponse.data;

  if (teamsMappingJson == undefined || Object.keys(teamsMappingJson).length == 0) {
    teamsMappingJson = teamsMapping;
  }

  Object.keys(teamsMappingJson).forEach(function (key) {
    teamsMap.set(key.toString(), teamsMappingJson[key].toString());
  });

  return teamsMap;
};

const persistErrorMessages = async (errorsMap, network) => {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network]);
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

  await redisClient.set(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network], JSON.stringify([...messagesMap]));
};

const fetchOpticOddsGamesForLeague = async (leagueIds, isTestnet) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };
  const promises = [];

  const hasTennis = leagueIds.some((leagueId) => getLeagueSport(leagueId) === Sport.TENNIS);
  if (hasTennis) {
    promises.push(axios.get(OPTIC_ODDS_API_GAMES_URL + "sport=tennis", { headers }));
  }

  const hasOnlyTennis = leagueIds.every((leagueId) => getLeagueSport(leagueId) === Sport.TENNIS);
  if (!hasOnlyTennis) {
    const urlParam = leagueIds
      .filter((leagueId) => getLeagueSport(leagueId) !== Sport.TENNIS)
      .map((leagueId, index) => (index > 0 ? "&" : "") + "league=" + getLeagueOpticOddsName(leagueId))
      .join("");
    promises.push(axios.get(OPTIC_ODDS_API_GAMES_URL + urlParam, { headers }));
  }

  let opticOddsGamesResponses = [];
  try {
    opticOddsGamesResponses = await Promise.all(promises);
  } catch (e) {
    console.log(`Live markets: Fetching Optic Odds games error: ${e}`);
  }

  const opticOddsResponseData = opticOddsGamesResponses
    .map((opticOddsGamesResponse) => opticOddsGamesResponse.data.data)
    .flat();

  if (opticOddsResponseData.length == 0) {
    if (!isTestnet) {
      console.log(
        `Live markets: Could not find any live games on the provider side for the given league IDs ${leagueIds}`,
      );
    }
    return [];
  } else {
    return opticOddsResponseData;
  }
};

module.exports = {
  fetchTeamsMap,
  persistErrorMessages,
  fetchOpticOddsGamesForLeague,
};
