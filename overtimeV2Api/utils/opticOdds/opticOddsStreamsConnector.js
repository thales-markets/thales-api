const EventSource = require("eventsource");
const { OPTIC_ODDS_API_BASE_URL_V3 } = require("../../constants/opticOdds");
const KEYS = require("../../../redis/redis-keys");
const { uniq } = require("lodash");
const { getRedisClientForStreamOdds, getRedisClientForStreamResults } = require("../../services/init");
const { logger, logAllError } = require("../../../utils/logger");

const getRedisKeyForOpticOddsStreamEventOddsId = (gameId, isTestnet) =>
  `${
    isTestnet ? KEYS.TESTNET_OPTIC_ODDS_STREAM_EVENT_ODDS_ID_BY_GAME : KEYS.OPTIC_ODDS_STREAM_EVENT_ODDS_ID_BY_GAME
  }${gameId}`;

const getRedisKeyForOpticOddsStreamEventResults = (gameId, isTestnet) =>
  `${
    isTestnet ? KEYS.TESTNET_OPTIC_ODDS_STREAM_EVENT_RESULTS_BY_GAME : KEYS.OPTIC_ODDS_STREAM_EVENT_RESULTS_BY_GAME
  }${gameId}`;

const connectToOpticOddsStreamOdds = (
  sportsbooks,
  markets,
  sport,
  leagues,
  isTestnet,
  lastEntryId = "",
  lastRedisKeysMap = new Map(),
) => {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", process.env.OPTIC_ODDS_API_KEY);
  queryString.append("odds_format", "Decimal");
  sportsbooks.forEach((sportsbook) => queryString.append("sportsbook", sportsbook));
  markets.forEach((market) => queryString.append("market", market));
  leagues.forEach((league) => queryString.append("league", league));
  if (lastEntryId) {
    queryString.append("last_entry_id", lastEntryId);
  }

  const url = `${OPTIC_ODDS_API_BASE_URL_V3}/stream/${sport}/odds?${queryString.toString()}`;
  logger.info(`Stream for odds: Connecting to stream ${url}`);
  const eventSource = new EventSource(url);

  const redisClient = getRedisClientForStreamOdds();

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      logger.info("Stream for odds: message data:", data);
    } catch (e) {
      logAllError(`Stream for odds: Error parsing message data: ${e}`);
    }
  };

  let lastReceivedEntryId = lastEntryId;
  const allRedisKeysByGameIdMap = lastRedisKeysMap;

  eventSource.addEventListener("odds", (event) => {
    const data = JSON.parse(event.data);

    lastReceivedEntryId = data.entry_id;

    const oddsDataArray = data.data;
    const currentRedisKeysForGameEvent = [];

    // Save each object from event data array to redis with key: Game ID + Sportsbook + Market (Bet Type) + Bet Name
    // e.g. event id: 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5
    oddsDataArray.forEach((oddsData) => {
      if (oddsData.is_live) {
        const redisOddsKey = isTestnet ? `testnet:${oddsData.id}` : oddsData.id; // this is Optic Odds ID: 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5
        currentRedisKeysForGameEvent.push(redisOddsKey);

        redisClient.set(redisOddsKey, JSON.stringify(oddsData), { EX: 60 * 60 * 12 }); // delete after 12h
      }
    });

    /*
     * Maintain redis key by game ID which containes list of redis line odds keys per game, e.g:
     * key = opticOddsStreamEventOddsIdByGameId32C781DB02F8
     * value = [31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5, 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+1_5]
     */
    const gameId = oddsDataArray[0].fixture_id; // event contains only data for one fixture ID
    const prevRedisKeysForOdds = allRedisKeysByGameIdMap.get(gameId) || [];
    const updatedRedisKeysForOdds = uniq([...prevRedisKeysForOdds, ...currentRedisKeysForGameEvent]);
    allRedisKeysByGameIdMap.set(gameId, updatedRedisKeysForOdds);

    const redisGameKey = getRedisKeyForOpticOddsStreamEventOddsId(gameId, isTestnet);

    redisClient.set(redisGameKey, JSON.stringify(updatedRedisKeysForOdds), { EX: 60 * 60 * 12 }); // delete after 12h
  });

  // If an odds gets locked. You can use this to tell if an odds are no longer available on a sportsbook.
  eventSource.addEventListener("locked-odds", (event) => {
    const data = JSON.parse(event.data);

    lastReceivedEntryId = data.entry_id;

    const oddsDataArray = data.data;
    const currentRedisKeysForGameEvent = [];

    oddsDataArray.forEach((oddsData) => {
      oddsData.isLocked = true;

      const redisOddsKey = isTestnet ? `testnet:${oddsData.id}` : oddsData.id;
      currentRedisKeysForGameEvent.push(redisOddsKey);

      redisClient.set(redisOddsKey, JSON.stringify(oddsData), { EX: 60 * 60 * 12 }); // delete after 12h
    });

    const gameId = oddsDataArray[0].fixture_id; // event contains only data for one fixture ID
    const prevRedisKeysForOdds = allRedisKeysByGameIdMap.get(gameId) || [];
    const updatedRedisKeysForOdds = uniq([...prevRedisKeysForOdds, ...currentRedisKeysForGameEvent]);
    allRedisKeysByGameIdMap.set(gameId, updatedRedisKeysForOdds);
  });

  eventSource.onerror = (event) => {
    logAllError(`Stream for odds: EventSource error: ${JSON.stringify(event)}`);
    eventSource.close();
    // Attempt to reconnect after 1 second
    setTimeout(
      () =>
        connectToOpticOddsStreamOdds(
          sportsbooks,
          markets,
          sport,
          leagues,
          isTestnet,
          lastReceivedEntryId,
          allRedisKeysByGameIdMap,
        ),
      1000,
    );
  };

  return eventSource;
};

const connectToOpticOddsStreamResults = (sport, leagues, isTestnet, isLive = true) => {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", process.env.OPTIC_ODDS_API_KEY);
  queryString.append("is_live", isLive);
  leagues.forEach((league) => queryString.append("league", league));

  const url = `${OPTIC_ODDS_API_BASE_URL_V3}/stream/${sport}/results?${queryString.toString()}`;
  logger.info(`Stream for results: Connecting to stream ${url}`);
  const eventSource = new EventSource(url);

  const redisClient = getRedisClientForStreamResults();

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      logger.info("Stream for results: message data:", data);
    } catch (e) {
      logAllError(`Stream for results: Error parsing message data: ${e}`);
    }
  };

  eventSource.addEventListener("fixture-results", (event) => {
    const data = JSON.parse(event.data);

    const resultsData = data.data;

    // Save each object from event data to redis with key by Game ID (e.g. opticOddsStreamEventResultsByGameId2E4AB315ABD9)
    const redisGameKey = getRedisKeyForOpticOddsStreamEventResults(resultsData.fixture_id, isTestnet);

    redisClient.set(redisGameKey, JSON.stringify(resultsData), { EX: 60 * 60 * 12 }); // delete after 12h
  });

  eventSource.onerror = (event) => {
    logAllError(`Stream for results: EventSource error: ${JSON.stringify(event)}`);
    eventSource.close();
    setTimeout(() => connectToOpticOddsStreamResults(sport, leagues, isTestnet, isLive), 1000); // Attempt to reconnect after 1 second
  };

  return eventSource;
};

module.exports = {
  connectToOpticOddsStreamOdds,
  connectToOpticOddsStreamResults,
  getRedisKeyForOpticOddsStreamEventOddsId,
  getRedisKeyForOpticOddsStreamEventResults,
};
