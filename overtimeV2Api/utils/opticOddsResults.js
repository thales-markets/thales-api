const axios = require("axios");
const { getLeagueOpticOddsName, getLeagueSport } = require("overtime-live-trading-utils");
const { connectToOpticOddsStreamResults } = require("./opticOddsStreamsConnector");
const {
  OPTIC_ODDS_API_FIXTURES_RESULTS_URL,
  OPTIC_ODDS_API_KEY_HEADER,
  OPTIC_ODDS_API_RESULTS_MAX_GAMES,
} = require("../constants/opticOdds");

const isOpticOddsStreamResultsDisabled = process.env.DISABLE_OPTIC_ODDS_STREAM_RESULTS === "true";

const mapScorePeriods = (periods, homeAwayType) =>
  Object.values(periods).reduce(
    (acc, periodValue, index) => ({
      ...acc,
      [`score_${homeAwayType}_period_${index + 1}`]: periodValue,
    }),
    {},
  );

const mapOpticOddsStreamResults = (streamEvents) =>
  streamEvents.map((streamEvent) => ({
    fixture_id: streamEvent.fixture_id,
    game_id: streamEvent.score.fixture.game_id,
    sport: streamEvent.score.sport.name,
    league: streamEvent.league,
    status: streamEvent.score.fixture.status,
    is_live: streamEvent.is_live,
    clock: streamEvent.score.in_play.clock,
    period: streamEvent.score.in_play.period,
    home_team: streamEvent.score.fixture.home_team_display,
    away_team: streamEvent.score.fixture.away_team_display,
    score_home_total: streamEvent.score.scores.home.total,
    score_away_total: streamEvent.score.scores.away.total,
    ...mapScorePeriods(streamEvent.score.scores.home.periods, "home"),
    ...mapScorePeriods(streamEvent.score.scores.away.periods, "away"),
  }));

const mapOpticOddsApiResults = (resultsData) =>
  resultsData.map((resultData) => ({
    fixture_id: resultData.fixture.id,
    game_id: resultData.fixture.game_id,
    sport: resultData.sport.name,
    league: resultData.league.name,
    status: resultData.fixture.status,
    is_live: resultData.fixture.is_live,
    clock: resultData.in_play.clock,
    period: resultData.in_play.period,
    home_team: resultData.fixture.home_team_display,
    away_team: resultData.fixture.away_team_display,
    score_home_total: resultData.scores.home.total,
    score_away_total: resultData.scores.away.total,
    ...mapScorePeriods(resultData.scores.home.periods, "home"),
    ...mapScorePeriods(resultData.scores.away.periods, "away"),
  }));

// Update or add results to initial results from API
const mapResultsStreamEvents = (streamEvents, initialResults) => {
  // map existing fixture IDs
  const mappedResults = initialResults.map((initialResult) => {
    const updatedResultEvent = streamEvents.filter((event) => event.fixture_id === initialResult.fixture_id);
    return updatedResultEvent.length > 0 ? mapOpticOddsStreamResults(updatedResultEvent)[0] : initialResult;
  });

  // map new fixture IDs
  const newMappedResults = mapOpticOddsStreamResults(
    streamEvents.filter(
      (event) => !initialResults.some((initialResult) => initialResult.fixture_id === event.fixture_id),
    ),
  );

  return mappedResults.concat(newMappedResults);
};

const fetchOpticOddsResults = async (fixtureIds) => {
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
    resultsResponses = await Promise.all(resultsPromises);
  } catch (e) {
    console.log(`Fetchng Optic Odds results error: ${e.message} ${e.error})`);
    resultsResponses = [];
  }

  const results = resultsResponses.map((resultResponse) => resultResponse.data.data).flat();
  return results;
};

// Start stream for league ID or re-start when param (sportsbooks) is updated
const startResultsStreams = (leagueId, resultsStreamSourcesByLeagueMap) => {
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
    const streamSource = connectToOpticOddsStreamResults(sport, streamLeagues);
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