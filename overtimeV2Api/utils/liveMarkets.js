const axios = require("axios");
const { getSpreadData, adjustSpreadOnOdds } = require("overtime-live-trading-utils");
const { getLeagueIsDrawAvailable, getLeagueSport } = require("./sports");
const oddslib = require("oddslib");
const { Sport, League } = require("../constants/sports");

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

const adjustSpreadAndReturnMarketWithOdds = (market, spreadData, odds, marketType) => {
  // CURRENTLY ONLY SUPPORTING MONEYLINE
  const spreadDataForSport = getSpreadData(
    spreadData,
    market.leagueId,
    marketType,
    Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS),
  );

  console.log(market.leagueId);
  console.log(spreadDataForSport);

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

const persistErrorMessages = (messagesMap, errorsMap) => {
  const persistedGameIds = Object.keys(messagesMap);
  const currentGameIds = Object.keys(errorsMap);

  for (const gameId of persistedGameIds) {
    const errorsForGameId = messagesMap.get(gameId);
    const firstError = errorsForGameId[0];
    const dayAgo = Date.now() - 1000 * 60 * 60 * 24;
    if (dayAgo >= new Date(firstError.errorTime).getTime()) {
      messagesMap.delete(gameId);
    }
  }

  for (const currentKey of currentGameIds) {
    if (persistedGameIds.includes(currentKey)) {
      const persistedValuesArray = messagesMap.get(currentKey);
      const newMessageObject = errorsMap.get(currentKey);
      if (persistedValuesArray != undefined) {
        const latestMessageObject = persistedValuesArray[persistedValuesArray.length - 1];
        if (latestMessageObject.errorMessage != newMessageObject.errorMessage) {
          persistedValuesArray.push(newMessageObject);
          messagesMap.set(currentKey, persistedValuesArray);
        }
      } else {
        const errorsArray = [];
        errorsArray.push(newMessageObject);
        messagesMap.set(currentKey, [errorsArray]);
      }
    }
  }
  return messagesMap;
};

const checkTennisIsEnabled = (availableLeagueIds) => {
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

  return availableLeagueIds;
};

const fetchOpticOddsGamesForLeague = async (leagueId, leagueName) => {
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
    return [];
  } else {
    return opticOddsResponseDataForLeague;
  }
};

module.exports = {
  fetchTeamsMap,
  adjustSpreadAndReturnMarketWithOdds,
  persistErrorMessages,
  checkTennisIsEnabled,
  fetchOpticOddsGamesForLeague,
};
