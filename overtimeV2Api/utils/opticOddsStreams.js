const EventSource = require("eventsource");
const { OPTIC_ODDS_STREAM_ODDS_BASE_URL, OPTIC_ODDS_API_BASE_URL_V3 } = require("../constants/opticOdds");
const { redisClient, getValueFromRedisAsync } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");

const getRedisKeyForOpticOddsStreamEventOddsId = (gameId) => `${KEYS.OPTIC_ODDS_STREAM_EVENT_ODDS_ID_BY_GAME}${gameId}`;
const getRedisKeyForOpticOddsApiResults = (fixtureId) => `${KEYS.OPTIC_ODDS_STREAM_EVENT_RESULTS_BY_GAME}${fixtureId}`;

// Optic Odds V2
const connectToOpticOddsStreamOdds = (sportsbooks, markets, leagues, lastEntryId = "") => {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", process.env.OPTIC_ODDS_API_KEY);
  queryString.append("odds_format", "Decimal");
  sportsbooks.forEach((sportsbook) => queryString.append("sportsbooks", sportsbook));
  markets.forEach((market) => queryString.append("market", market));
  leagues.forEach((league) => queryString.append("league", league));
  lastEntryId && queryString.append("last_entry_id", lastEntryId);

  const url = `${OPTIC_ODDS_STREAM_ODDS_BASE_URL}?${queryString.toString()}`;
  console.log(`Stream for odds: Connecting to stream ${url}`);
  const eventSource = new EventSource(url);

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

  eventSource.addEventListener("odds", async (event) => {
    const data = JSON.parse(event.data);

    lastReceivedEntryId = data.entry_id;

    const oddsDataArray = data.data;
    const allRedisKeysForGameEvent = [];

    // Save each object from event data array to redis with key: Game ID + Sportsbook + Market (Bet Type) + Bet Name
    // e.g. 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5
    oddsDataArray.forEach((oddsData) => {
      const redisOddsKey = oddsData.id;
      allRedisKeysForGameEvent.push(redisOddsKey);

      redisClient.set(redisOddsKey, JSON.stringify(oddsData), () => {});
      redisClient.expire(redisOddsKey, 60 * 60 * 12, () => {}); // delete after 12h
    });

    /*
     * Maintain redis key by game ID which containes list of redis odds keys per game, e.g:
     * key = opticOddsStreamEventOddsIdByGameId31209-39104-2024-40
     * value = [31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5, 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+1_5]
     */
    const gameId = oddsDataArray[0].game_id; // event contains only data for one game ID
    const redisGameKey = getRedisKeyForOpticOddsStreamEventOddsId(gameId);

    const currentRedisKeysForOdds = await getValueFromRedisAsync(redisGameKey);
    const updatedRedisKeysForOdds = (currentRedisKeysForOdds !== null ? currentRedisKeysForOdds : [])
      .filter((redisKeyForGame) => !allRedisKeysForGameEvent.includes(redisKeyForGame))
      .concat(allRedisKeysForGameEvent);

    redisClient.set(redisGameKey, JSON.stringify(updatedRedisKeysForOdds), () => {});
    redisClient.expire(redisGameKey, 60 * 60 * 12, () => {}); // delete after 12h
  });

  // If an odd gets locked. You can use this to tell if an odd is no longer available on a sportsbook.
  eventSource.addEventListener("locked-odds", (event) => {
    return; // TODO: For now ignore locked-odds, delete return if we need to set 0 price
    const data = JSON.parse(event.data);

    lastReceivedEntryId = data.entry_id;

    const oddsDataArray = data.data;

    oddsDataArray.forEach((oddsData) => {
      oddsData.bet_price = 0;

      const redisOddsKey = oddsData.id;

      redisClient.set(redisOddsKey, JSON.stringify(oddsData), () => {});
      redisClient.expire(redisOddsKey, 60 * 60 * 12, () => {}); // delete after 12h
    });
  });

  eventSource.onerror = (event) => {
    console.error("Stream for odds: EventSource error:", event);
    eventSource.close();
    setTimeout(() => connectToOpticOddsStreamOdds(sportsbooks, markets, leagues, lastReceivedEntryId), 1000); // Attempt to reconnect after 1 second
  };

  return eventSource;
};

// Optic Odds V3
const connectToOpticOddsStreamResults = (sport, leagues, isLive = true) => {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", process.env.OPTIC_ODDS_API_KEY);
  queryString.append("is_live", isLive);
  leagues.forEach((league) => queryString.append("league", league));

  const url = `${OPTIC_ODDS_API_BASE_URL_V3}/stream/${sport}/results?${queryString.toString()}`;
  console.log(`Stream for results: Connecting to stream ${url}`);
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      // TODO: check when this happens
      const data = JSON.parse(event.data);
      console.log("Stream for results: message data:", data);
    } catch (e) {
      console.log("Stream for results: Error parsing message data:", e);
    }
  };

  eventSource.addEventListener("fixture-results", async (event) => {
    const data = JSON.parse(event.data);

    const resultsData = data.data;

    // Save each object from event data to redis with key: Fixture ID (e.g. opticOddsStreamEventResultsByGameId2E4AB315ABD9)
    const redisGameKey = getRedisKeyForOpticOddsApiResults(resultsData.fixture_id);

    redisClient.set(redisGameKey, JSON.stringify(resultsData), () => {});
    redisClient.expire(redisGameKey, 60 * 60 * 12, () => {}); // delete after 12h TODO: check if longer needed
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
  getRedisKeyForOpticOddsApiResults,
};
