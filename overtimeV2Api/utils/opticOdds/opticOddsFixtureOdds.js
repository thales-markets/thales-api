const axios = require("axios");
const { groupBy } = require("lodash");
const {
  OPTIC_ODDS_API_FIXTURE_ODDS_URL,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_KEY_HEADER,
} = require("../../constants/opticOdds");
const {
  getBookmakersArray,
  getBetTypesForLeague,
  getLeagueOpticOddsName,
  getLeagueSport,
} = require("overtime-live-trading-utils");
const { connectToOpticOddsStreamOdds } = require("./opticOddsStreamsConnector");
const { logAllInfo, logAllError } = require("../../../utils/logger");

const isOpticOddsStreamOddsDisabled = process.env.DISABLE_OPTIC_ODDS_STREAM_ODDS === "true";

const mapOpticOddsApiFixtureOdds = (oddsDataArray) =>
  oddsDataArray.map((oddsData) => ({
    gameId: oddsData.id, // fixture_id
    startDate: oddsData.start_date,
    homeTeam: oddsData.home_team_display,
    awayTeam: oddsData.away_team_display,
    isLive: oddsData.is_live,
    status: oddsData.status,
    sport: oddsData.sport.id,
    league: oddsData.league.name,
    odds: oddsData.odds.map((oddsObj) => ({
      id: oddsObj.id, // 39920-20584-2024-35:draftkings:2nd_set_moneyline:francisco_comesana
      sportsBookName: oddsObj.sportsbook,
      name: oddsObj.name,
      price: oddsObj.price,
      timestamp: oddsObj.timestamp,
      points: oddsObj.points,
      isMain: oddsObj.is_main,
      isLive: oddsData.is_live,
      marketName: oddsObj.market.toLowerCase(),
      playerId: oddsObj.player_id,
      selection: oddsObj.selection,
      selectionLine: oddsObj.selection_line,
    })),
  }));

const mapOddsStreamEventToApiOddsObject = (streamEvent) => ({
  id: streamEvent.id, // 39920-20584-2024-35:draftkings:2nd_set_moneyline:francisco_comesana
  sportsBookName: streamEvent.sportsbook,
  name: streamEvent.name,
  price: streamEvent.price,
  timestamp: streamEvent.timestamp,
  points: streamEvent.points,
  isMain: streamEvent.is_main,
  isLive: streamEvent.is_live,
  marketName: streamEvent.market.toLowerCase(),
  playerId: streamEvent.player_id,
  selection: streamEvent.selection,
  selectionLine: streamEvent.selection_line,
});

// Update or add odds to initial odds from API
const mapOddsStreamEvents = (streamEvents, initialOdds, gamesInfo) => {
  // map existing game IDs
  const mappedOdds = initialOdds.map((initialOdd) => {
    const updatedOddsEvents = streamEvents
      .filter((event) => event.fixture_id === initialOdd.gameId)
      .map((event) => mapOddsStreamEventToApiOddsObject(event));

    if (updatedOddsEvents.length > 0) {
      const odds = initialOdd.odds
        ? initialOdd.odds
            .filter((oddsObj) => updatedOddsEvents.every((updatedOddsEvent) => updatedOddsEvent.id !== oddsObj.id))
            .concat(updatedOddsEvents)
        : updatedOddsEvents;

      return { ...initialOdd, odds };
    } else {
      return initialOdd;
    }
  });

  // map new game IDs
  const newOdds = streamEvents.filter((event) =>
    initialOdds.every((initialOdd) => initialOdd.gameId !== event.fixture_id),
  );
  const groupedOddsByGame = groupBy(newOdds, (newOdd) => newOdd.fixture_id);

  const newMappedOdds = Object.keys(groupedOddsByGame)
    .filter((gameId) => gamesInfo.some((gameInfo) => gameInfo.gameId === gameId))
    .map((gameId) => {
      const gameInfoData = gamesInfo.find((gameInfo) => gameInfo.gameId === gameId);

      const oddsHeader = {
        gameId: gameInfoData.gameId,
        startDate: gameInfoData.startDate,
        homeTeam: gameInfoData.homeTeam,
        awayTeam: gameInfoData.awayTeam,
        isLive: gameInfoData.isLive, // should be always true
        status: gameInfoData.status,
        sport: gameInfoData.sport,
        league: gameInfoData.league,
      };

      const odds = groupedOddsByGame[gameId].map((event) => mapOddsStreamEventToApiOddsObject(event));

      return { ...oddsHeader, odds };
    });

  return mappedOdds.concat(newMappedOdds);
};

const fetchOpticOddsFixtureOdds = async (sportsbooks, markets, fixtureIds) => {
  const oddsPromises = [];
  let requestUrl = `${OPTIC_ODDS_API_FIXTURE_ODDS_URL}?odds_format=Decimal`;

  // Prepare request for results
  // For each fixture ID prepare separate request with max num of games
  fixtureIds.forEach((fixtureId, index, allFixtureIds) => {
    const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_ODDS_MAX_GAMES;
    requestUrl += `&fixture_id=${fixtureId}`;

    // creating new request after max num of games or when last game in request
    if (gameNumInRequest == 0 || index == allFixtureIds.length - 1) {
      requestUrl += `&sportsbook=${sportsbooks.join("&sportsbook=")}&market=${markets.join("&market=")}`;
      oddsPromises.push(axios.get(requestUrl, { headers: OPTIC_ODDS_API_KEY_HEADER }));
      requestUrl = `${OPTIC_ODDS_API_FIXTURE_ODDS_URL}?odds_format=Decimal`;
    }
  });

  let oddsResponses = [];
  try {
    const startTime = new Date().getTime();
    oddsResponses = await Promise.all(oddsPromises);
    const endTime = new Date().getTime();
    const diff = endTime - startTime;
    if (diff > process.env.LOG_OPTIC_ODDS_API_CALL_TIME_THRESHOLD) {
      logAllInfo(`API CALL TAKES TOO LONG: fetchOpticOddsFixtureOdds time: ${diff}ms`);
    }
  } catch (e) {
    logAllError(`Fetchng Optic Odds fixture odds error: ${e.message} ${e.error})`);
    oddsResponses = [];
  }

  const results = oddsResponses.map((oddsResponse) => oddsResponse.data.data).flat();
  return results;
};

// Start stream for league ID or re-start when param (sportsbooks) is updated
const startOddsStreams = (leagueId, bookmakersData, leaguesData, oddsStreamsInfoByLeagueMap, isTestnet) => {
  const opticOddsLeagueName = getLeagueOpticOddsName(leagueId);

  if (isOpticOddsStreamOddsDisabled || !opticOddsLeagueName) {
    return;
  }

  // Extracting bookmakers (sportsbooks), bet types (markets) for league and Optic Odds league names
  const bookmakers = getBookmakersArray(bookmakersData, leagueId, process.env.LIVE_ODDS_PROVIDERS.split(","));
  const betTypes = getBetTypesForLeague(leagueId, leaguesData);
  const streamLeagues = opticOddsLeagueName.split(",");

  const oddsStreamInfo = oddsStreamsInfoByLeagueMap.get(leagueId);
  const isBookmakersUpdated =
    oddsStreamInfo && oddsStreamInfo.bookmakers.sort().join().toLowerCase() !== bookmakers.sort().join().toLowerCase();
  const isBetTypesUpdated =
    oddsStreamInfo && oddsStreamInfo.betTypes.sort().join().toLowerCase() !== betTypes.sort().join().toLowerCase();

  const sport = getLeagueSport(leagueId);

  // Start new stream for new league or start again when param is updated
  if (!oddsStreamInfo) {
    // start new stream
    const streamSource = connectToOpticOddsStreamOdds(bookmakers, betTypes, sport, streamLeagues, isTestnet);
    oddsStreamsInfoByLeagueMap.set(leagueId, { bookmakers, betTypes, streamSource });
  } else if (isBookmakersUpdated || isBetTypesUpdated) {
    // close and start with new bookmakers
    oddsStreamInfo.streamSource.close();
    const streamSource = connectToOpticOddsStreamOdds(bookmakers, betTypes, sport, streamLeagues, isTestnet);
    oddsStreamsInfoByLeagueMap.set(leagueId, { bookmakers, betTypes, streamSource });
  }
};

// Close streams that are not active
const closeInactiveOddsStreams = (oddsStreamsInfoByLeagueMap, activeLeagues) => {
  oddsStreamsInfoByLeagueMap.forEach((oddsStreamInfo, oddsStreamLeagueId) => {
    const isStreamInactive = !activeLeagues.includes(oddsStreamLeagueId);
    if (isStreamInactive) {
      oddsStreamInfo.streamSource.close();
      oddsStreamsInfoByLeagueMap.delete(oddsStreamLeagueId);
    }
  });
};

module.exports = {
  isOpticOddsStreamOddsDisabled,
  mapOpticOddsApiFixtureOdds,
  mapOddsStreamEvents,
  fetchOpticOddsFixtureOdds,
  startOddsStreams,
  closeInactiveOddsStreams,
};
