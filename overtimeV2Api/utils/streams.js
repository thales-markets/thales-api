const EventSource = require("eventsource");
const { OPTIC_ODDS_STREAM_ODDS_BASE_URL } = require("../constants/opticodds");
const { redisClient, getValueFromRedisAsync } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");

const getRedisKeyForOpticOddsStreamEventOdds = (gameId) => `${KEYS.OPTIC_ODDS_STREAM_EVENT_ODDS_BY_GAME}${gameId}`;

const connectToOpticOddsStreamOdds = (sportsbooks, markets, leagues, lastEntryId = "") => {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", process.env.OPTIC_ODDS_API_KEY);
  queryString.append("odds_format", "Decimal");
  sportsbooks.forEach((sportsbook) => queryString.append("sportsbooks", sportsbook));
  markets.forEach((market) => queryString.append("market", market));
  leagues.forEach((league) => queryString.append("league", league));
  lastEntryId && queryString.append("last_entry_id", lastEntryId);

  console.log(`Stream for odds: Connecting to stream ${OPTIC_ODDS_STREAM_ODDS_BASE_URL}?${queryString.toString()}`);
  const eventSource = new EventSource(`${OPTIC_ODDS_STREAM_ODDS_BASE_URL}?${queryString.toString()}`);

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
     * key = opticOddsStreamEventOddsByGameId31209-39104-2024-40
     * value = [31209-39104-2024-40:draftkings:game_spread:terence_atmane_+2_5, 31209-39104-2024-40:draftkings:game_spread:terence_atmane_+1_5]
     */
    const gameId = oddsDataArray[0].game_id; // event contains only data for one game ID
    const redisGameKey = getRedisKeyForOpticOddsStreamEventOdds(gameId);

    const currentRedisKeysForOdds = await getValueFromRedisAsync(redisGameKey);
    const updatedRedisKeysForOdds = (currentRedisKeysForOdds !== null ? currentRedisKeysForOdds : [])
      .filter((redisKeyForGame) => !allRedisKeysForGameEvent.includes(redisKeyForGame))
      .concat(allRedisKeysForGameEvent);

    redisClient.set(redisGameKey, JSON.stringify(updatedRedisKeysForOdds), () => {});
    redisClient.expire(redisGameKey, 60 * 60 * 12, () => {}); // delete after 12h
  });

  eventSource.addEventListener("locked-odds", (event) => {
    // If an odd gets locked. You can use this to tell if an odd is no longer available on a sportsbook.
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

module.exports = {
  connectToOpticOddsStreamOdds,
  getRedisKeyForOpticOddsStreamEventOdds,
};
