const { redisClient } = require("../../../../redis/client");
const {
  getRedisKeyForOpticOddsStreamEventOddsId,
  getRedisKeyForOpticOddsStreamEventResults,
} = require("../../../utils/opticOdds/opticOddsStreamsConnector");
const { streamOddsEvents } = require("../opticOdds/opticOddsStreamEventOdds");
const { streamResultsEvents } = require("../opticOdds/opticOddsStreamEventResults");

const setRedisStreamOddsDataForGameId = (gameId, isTestnet) => {
  const redisKeysForOdds = [];

  streamOddsEvents.forEach((streamOddsEvent) => {
    const streamOddsDataArray = streamOddsEvent.data;
    streamOddsDataArray.forEach((streamOddsData) => {
      if (streamOddsData.fixture_id === gameId) {
        if (streamOddsEvent.type === "locked-odds") {
          streamOddsData.isLocked = true;
        }
        redisClient.set(streamOddsData.id, JSON.stringify(streamOddsData));
        redisKeysForOdds.push(streamOddsData.id);
      }
    });
  });

  if (redisKeysForOdds.length) {
    const redisGameKey = getRedisKeyForOpticOddsStreamEventOddsId(gameId, isTestnet);
    redisClient.set(redisGameKey, JSON.stringify(redisKeysForOdds));
  }
};

const setRedisStreamResultsDataForGameId = (gameId, isTestnet) => {
  const resultsData = streamResultsEvents.find(
    (streamResultsEvent) => streamResultsEvent.data.fixture_id === gameId,
  )?.data;

  if (resultsData) {
    const redisGameKey = getRedisKeyForOpticOddsStreamEventResults(gameId, isTestnet);
    redisClient.set(redisGameKey, JSON.stringify(resultsData));
  }
};

module.exports = { setRedisStreamOddsDataForGameId, setRedisStreamResultsDataForGameId };
