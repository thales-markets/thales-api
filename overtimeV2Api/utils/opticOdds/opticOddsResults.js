const axios = require("axios");
const { getLeagueOpticOddsName, getLeagueSport } = require("overtime-live-trading-utils");
const { connectToOpticOddsStreamResults } = require("./opticOddsStreamsConnector");
const {
  OPTIC_ODDS_API_FIXTURES_RESULTS_URL,
  OPTIC_ODDS_API_KEY_HEADER,
  OPTIC_ODDS_API_RESULTS_MAX_GAMES,
} = require("../../constants/opticOdds");
const { logAllError, logAllInfo } = require("../../../utils/logger");

const isOpticOddsStreamResultsDisabled = process.env.DISABLE_OPTIC_ODDS_STREAM_RESULTS === "true";

const mapScorePeriods = (periods, homeAwayType) =>
  Object.values(periods).reduce(
    (acc, periodValue, index) => ({
      ...acc,
      [`${homeAwayType}Period${index + 1}`]: periodValue,
    }),
    {},
  );

const mapOpticOddsApiResults = (resultsData) =>
  resultsData.map((resultData) => ({
    gameId: resultData.fixture.id, // fixture_id
    sport: resultData.sport.name,
    league: resultData.league.name.toLowerCase(),
    status: resultData.fixture.status.toLowerCase(),
    isLive: resultData.fixture.is_live,
    clock: resultData.in_play.clock,
    period: resultData.in_play.period ? resultData.in_play.period.toLowerCase() : resultData.in_play.period,
    homeTeam: resultData.fixture.home_team_display,
    awayTeam: resultData.fixture.away_team_display,
    homeTotal: resultData.scores.home.total,
    awayTotal: resultData.scores.away.total,
    ...mapScorePeriods(resultData.scores.home.periods, "home"),
    ...mapScorePeriods(resultData.scores.away.periods, "away"),
  }));

const mapOpticOddsStreamResults = (streamEvents) =>
  streamEvents.map((streamEvent) => ({
    gameId: streamEvent.fixture_id,
    sport: streamEvent.score.sport.name,
    league: streamEvent.league.toLowerCase(),
    status: streamEvent.score.fixture.status.toLowerCase(),
    isLive: streamEvent.is_live,
    clock: streamEvent.score.in_play.clock,
    period: streamEvent.score.in_play.period
      ? streamEvent.score.in_play.period.toLowerCase()
      : streamEvent.score.in_play.period,
    homeTeam: streamEvent.score.fixture.home_team_display,
    awayTeam: streamEvent.score.fixture.away_team_display,
    homeTotal: streamEvent.score.scores.home.total,
    awayTotal: streamEvent.score.scores.away.total,
    ...mapScorePeriods(streamEvent.score.scores.home.periods, "home"),
    ...mapScorePeriods(streamEvent.score.scores.away.periods, "away"),
  }));

// Update or add results to initial results from API
const mapResultsStreamEvents = (streamEvents, initialResults) => {
  // map existing game IDs
  const mappedResults = initialResults.map((initialResult) => {
    const updatedResultEvent = streamEvents.filter((event) => event.fixture_id === initialResult.gameId);
    return updatedResultEvent.length > 0 ? mapOpticOddsStreamResults(updatedResultEvent)[0] : initialResult;
  });

  // map new game IDs
  const newMappedResults = mapOpticOddsStreamResults(
    streamEvents.filter((event) => !initialResults.some((initialResult) => initialResult.gameId === event.fixture_id)),
  );

  return mappedResults.concat(newMappedResults);
};

const fetchOpticOddsResults = async (fixtureIds, isLiveMarketsCaller = false) => {
  const resultsPromises = [];
  let requestUrl = `${OPTIC_ODDS_API_FIXTURES_RESULTS_URL}?`;

  // Prepare request for results
  // For each fixture ID prepare separate request with max num of games
  fixtureIds.forEach((fixtureId, index, allFixtureIds) => {
    const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_RESULTS_MAX_GAMES;
    requestUrl += `${gameNumInRequest > 1 ? "&" : ""}fixture_id=${fixtureId}`;

    // creating new request after max num of games or when last game in request
    if (gameNumInRequest == 0 || index == allFixtureIds.length - 1) {
      resultsPromises.push(axios.get(requestUrl, { headers: OPTIC_ODDS_API_KEY_HEADER }));
      requestUrl = `${OPTIC_ODDS_API_FIXTURES_RESULTS_URL}?`;
    }
  });

  let resultsResponses = [];
  try {
    const startTime = new Date().getTime();
    resultsResponses = await Promise.all(resultsPromises);
    const endTime = new Date().getTime();
    const diff = endTime - startTime;
    if (diff > process.env.LOG_OPTIC_ODDS_API_CALL_TIME_THRESHOLD) {
      isLiveMarketsCaller
        ? logAllInfo(`API CALL TAKES TOO LONG: fetchOpticOddsResults time: ${diff}ms`)
        : console.log(`API CALL TAKES TOO LONG: fetchOpticOddsResults time: ${diff}ms`);
    }
  } catch (e) {
    isLiveMarketsCaller
      ? logAllError(`Fetchng Optic Odds results error: ${e.message} ${e.error})`)
      : console.error(`Fetchng Optic Odds results error: ${e.message} ${e.error})`);
    resultsResponses = [];
  }

  const results = resultsResponses
    .map((resultResponse) => (resultResponse.data ? resultResponse.data.data : []))
    .flat();
  return results;
};

// Start stream for league ID or re-start when param (sportsbooks) is updated
const startResultsStreams = (leagueId, resultsStreamSourcesByLeagueMap, isTestnet) => {
  const opticOddsLeagueName = getLeagueOpticOddsName(leagueId);

  if (isOpticOddsStreamResultsDisabled || !opticOddsLeagueName) {
    return;
  }
  // Start one stream for each league except for tennis GS where starting multiple leagues
  const resultsStreamSource = resultsStreamSourcesByLeagueMap.get(leagueId);

  // Start new stream for new league
  if (!resultsStreamSource) {
    const sport = getLeagueSport(leagueId);
    const streamLeagues = opticOddsLeagueName.split(",");
    // start new stream
    const streamSource = connectToOpticOddsStreamResults(sport, streamLeagues, isTestnet);
    resultsStreamSourcesByLeagueMap.set(leagueId, streamSource);
  }
};

// Close streams that are not active
const closeInactiveResultsStreams = (resultsStreamSourcesByLeagueMap, activeLeagues) => {
  resultsStreamSourcesByLeagueMap.forEach((resultsStreamSource, resultsStreamLeagueId) => {
    const isStreamInactive = !activeLeagues.includes(resultsStreamLeagueId);
    if (isStreamInactive) {
      resultsStreamSource.close();
      resultsStreamSourcesByLeagueMap.delete(resultsStreamLeagueId);
    }
  });
};

module.exports = {
  isOpticOddsStreamResultsDisabled,
  mapOpticOddsStreamResults,
  mapOpticOddsApiResults,
  mapResultsStreamEvents,
  fetchOpticOddsResults,
  startResultsStreams,
  closeInactiveResultsStreams,
};
