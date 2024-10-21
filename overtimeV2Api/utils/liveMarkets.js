const { OPTIC_ODDS_API_TIMEOUT } = require("../constants/opticOdds");
const { redisClient, getValuesFromRedisAsync, getValueFromRedisAsync } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const { getLeagueOpticOddsName, MoneylineTypes } = require("overtime-live-trading-utils");
const { MAX_ALLOWED_STALE_ODDS_DELAY } = require("../constants/markets");
const { fetchOpticOddsFixturesActive, mapOpticOddsApiFixtures } = require("./opticOddsFixtures");

const getRedisKeyForOpticOddsApiGames = (leagueId) => `${KEYS.OPTIC_ODDS_API_GAMES_BY_LEAGUE}${leagueId}`;
const getRedisKeyForOpticOddsApiOdds = (leagueId) => `${KEYS.OPTIC_ODDS_API_ODDS_BY_LEAGUE}${leagueId}`;
const getRedisKeyForOpticOddsApiScores = (leagueId) => `${KEYS.OPTIC_ODDS_API_SCORES_BY_LEAGUE}${leagueId}`;

const fetchRiskManagementConfig = async () => {
  const [teamsMap, bookmakersData, spreadData] = await getValuesFromRedisAsync(
    [KEYS.RISK_MANAGEMENT_TEAMS_MAP, KEYS.RISK_MANAGEMENT_BOOKMAKERS_DATA, KEYS.RISK_MANAGEMENT_SPREAD_DATA],
    false,
  );

  return { teamsMap, bookmakersData, spreadData };
};

const fetchOpticOddsGamesForLeague = async (leagueId, isTestnet) => {
  const leagueIds = getLeagueOpticOddsName(leagueId).split(",");

  const opticOddsGamesResponse = await fetchOpticOddsFixturesActive(leagueIds, true, null, 1, OPTIC_ODDS_API_TIMEOUT);

  let opticOddsGames = [];

  if (opticOddsGamesResponse) {
    opticOddsGames = mapOpticOddsApiFixtures(opticOddsGamesResponse.data);
    if (opticOddsGames.length > 0) {
      redisClient.set(getRedisKeyForOpticOddsApiGames(leagueId), JSON.stringify(opticOddsGames));
    } else if (!isTestnet) {
      console.log(`Live markets: Could not find any Optic Odds fixtures/active for the given league ID ${leagueId}`);
    }
  } else {
    // read previous games from cache
    opticOddsGames = (await getValueFromRedisAsync(getRedisKeyForOpticOddsApiGames(leagueId))) || [];
  }

  return opticOddsGames;
};

const isOddsTimeStale = (timestamp) => {
  if (typeof timestamp !== "number") {
    return true;
  }
  const now = new Date();
  const oddsDate = new Date(timestamp * 1000);
  const timeDiff = now.getTime() - oddsDate.getTime();
  return timeDiff > MAX_ALLOWED_STALE_ODDS_DELAY;
};

// Filter out non MONEYLINE stale odds
const filterStaleOdds = (gameOddsArray) =>
  gameOddsArray.map((gameOdds) => {
    const odds = gameOdds.odds
      ? gameOdds.odds.filter(
          (oddsObj) =>
            oddsObj.market_name.toLowerCase() === MoneylineTypes.MONEYLINE.toLowerCase() ||
            (oddsObj.market_name.toLowerCase() !== MoneylineTypes.MONEYLINE.toLowerCase() &&
              !isOddsTimeStale(oddsObj.timestamp)),
        )
      : gameOdds.odds;

    return { ...gameOdds, odds };
  });

const isMarketPaused = (market) => {
  const parentOdds = market.odds;
  const isParentWithoutOdds = !parentOdds || parentOdds.length === 0 || parentOdds.every((odds) => odds.decimal === 0);

  const childMarkets = market.childMarkets;
  const isChildMarketsWithoutOdds =
    !childMarkets ||
    childMarkets.length === 0 ||
    childMarkets.every((childMarket) => {
      const childOdds = childMarket.odds;
      const isChildWithoutOdds = !childOdds || childOdds.length === 0 || childOdds.every((odds) => odds.decimal === 0);
      return isChildWithoutOdds;
    });

  return isParentWithoutOdds && isChildMarketsWithoutOdds;
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

module.exports = {
  fetchRiskManagementConfig,
  fetchOpticOddsGamesForLeague,
  isOddsTimeStale,
  filterStaleOdds,
  isMarketPaused,
  getRedisKeyForOpticOddsApiOdds,
  getRedisKeyForOpticOddsApiScores,
  persistErrorMessages,
};
