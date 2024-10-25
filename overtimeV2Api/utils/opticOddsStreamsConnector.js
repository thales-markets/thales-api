const EventSource = require("eventsource");
const { OPTIC_ODDS_API_BASE_URL_V3 } = require("../constants/opticOdds");
const KEYS = require("../../redis/redis-keys");
const { uniq } = require("lodash");
const { getRedisClientForStreamOdds, getRedisClientForStreamResults } = require("../services/init");

const getRedisKeyForOpticOddsStreamEventOddsId = (fixtureId) =>
  `${KEYS.OPTIC_ODDS_STREAM_EVENT_ODDS_ID_BY_FIXTURE}${fixtureId}`;
const getRedisKeyForOpticOddsStreamEventResults = (fixtureId) =>
  `${KEYS.OPTIC_ODDS_STREAM_EVENT_RESULTS_BY_FIXTURE}${fixtureId}`;

const connectToOpticOddsStreamOdds = (
  sportsbooks,
  markets,
  sport,
  leagues,
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
  lastEntryId && queryString.append("last_entry_id", lastEntryId);

  const url = `${OPTIC_ODDS_API_BASE_URL_V3}/stream/${sport}/odds?${queryString.toString()}`;
  console.log(`Stream for odds: Connecting to stream ${url}`);
  const eventSource = new EventSource(url);

  const redisClient = getRedisClientForStreamOdds();

  eventSource.onmessage = (event) => {
    try {
      // TODO: check when this happens
      const data = JSON.parse(event.data);
      console.log("Stream for odds: message data:", data);
    } catch (e) {
      console.log("Stream for odds: Error parsing message data:", e);
    }
  };

  let lastReceivedEntryId = lastEntryId;
  let allRedisKeysByFixtureIdMap = lastRedisKeysMap;

  eventSource.addEventListener("odds", (event) => {
    const data = JSON.parse(event.data);

    lastReceivedEntryId = data.entry_id;

    const oddsDataArray = data.data;
    const currentRedisKeysForGameEvent = [];

    // Save each object from event data array to redis with key: Game ID + Sportsbook + Market (Bet Type) + Bet Name
    // e.g. event id: 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5
    oddsDataArray.forEach((oddsData) => {
      const redisOddsKey = oddsData.id; // this is Optic Odds ID: 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5
      currentRedisKeysForGameEvent.push(redisOddsKey);

      redisClient.set(redisOddsKey, JSON.stringify(oddsData), { EX: 60 * 60 * 12 }); // delete after 12h
    });

    /*
     * Maintain redis key by fixture ID which containes list of redis line odds keys per game, e.g:
     * key = opticOddsStreamEventOddsIdByFixtureId32C781DB02F8
     * value = [31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5, 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+1_5]
     */
    const fixtureId = oddsDataArray[0].fixture_id; // event contains only data for one fixture ID
    const prevRedisKeysForOdds = allRedisKeysByFixtureIdMap.get(fixtureId) || [];
    const updatedRedisKeysForOdds = uniq([...prevRedisKeysForOdds, ...currentRedisKeysForGameEvent]);
    allRedisKeysByFixtureIdMap.set(fixtureId, updatedRedisKeysForOdds);

    const redisGameKey = getRedisKeyForOpticOddsStreamEventOddsId(fixtureId);

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

      const redisOddsKey = oddsData.id;
      currentRedisKeysForGameEvent.push(redisOddsKey);

      redisClient.set(redisOddsKey, JSON.stringify(oddsData), { EX: 60 * 60 * 12 }); // delete after 12h
    });

    const fixtureId = oddsDataArray[0].fixture_id; // event contains only data for one fixture ID
    const prevRedisKeysForOdds = allRedisKeysByFixtureIdMap.get(fixtureId) || [];
    const updatedRedisKeysForOdds = uniq([...prevRedisKeysForOdds, ...currentRedisKeysForGameEvent]);
    allRedisKeysByFixtureIdMap.set(fixtureId, updatedRedisKeysForOdds);
  });

  eventSource.onerror = (event) => {
    console.error("Stream for odds: EventSource error:", event);
    eventSource.close();
    // Attempt to reconnect after 1 second
    setTimeout(
      () =>
        connectToOpticOddsStreamOdds(
          sportsbooks,
          markets,
          sport,
          leagues,
          lastReceivedEntryId,
          allRedisKeysByFixtureIdMap,
        ),
      1000,
    );
  };

  return eventSource;
};

const connectToOpticOddsStreamResults = (sport, leagues, isLive = true) => {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", process.env.OPTIC_ODDS_API_KEY);
  queryString.append("is_live", isLive);
  leagues.forEach((league) => queryString.append("league", league));

  const url = `${OPTIC_ODDS_API_BASE_URL_V3}/stream/${sport}/results?${queryString.toString()}`;
  console.log(`Stream for results: Connecting to stream ${url}`);
  const eventSource = new EventSource(url);

  const redisClient = getRedisClientForStreamResults();

  eventSource.onmessage = (event) => {
    try {
      // TODO: check when this happens
      const data = JSON.parse(event.data);
      console.log("Stream for results: message data:", data);
    } catch (e) {
      console.log("Stream for results: Error parsing message data:", e);
    }
  };

  eventSource.addEventListener("fixture-results", (event) => {
    const data = JSON.parse(event.data);

    const resultsData = data.data;

    // Save each object from event data to redis with key: Fixture ID (e.g. opticOddsStreamEventResultsByFixtureId2E4AB315ABD9)
    const redisGameKey = getRedisKeyForOpticOddsStreamEventResults(resultsData.fixture_id);

    redisClient.set(redisGameKey, JSON.stringify(resultsData), { EX: 60 * 60 * 12 }); // delete after 12h TODO: check if longer needed
  });

  eventSource.onerror = (event) => {
    console.error("Stream for results: EventSource error:", event);
    eventSource.close();
    setTimeout(() => connectToOpticOddsStreamResults(sport, leagues, isLive), 1000); // Attempt to reconnect after 1 second
  };

  return eventSource;
};

module.exports = {
  connectToOpticOddsStreamOdds,
  connectToOpticOddsStreamResults,
  getRedisKeyForOpticOddsStreamEventOddsId,
  getRedisKeyForOpticOddsStreamEventResults,
};
