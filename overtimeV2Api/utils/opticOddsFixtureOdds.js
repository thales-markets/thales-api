const axios = require("axios");
const { groupBy } = require("lodash");
const {
  OPTIC_ODDS_API_FIXTURE_ODDS_URL,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_KEY_HEADER,
} = require("../constants/opticOdds");
const {
  getBookmakersArray,
  getBetTypesForLeague,
  getLeagueOpticOddsName,
  getLeagueSport,
} = require("overtime-live-trading-utils");
const { connectToOpticOddsStreamOdds } = require("./opticOddsStreamsConnector");

const isOpticOddsStreamOddsDisabled = process.env.DISABLE_OPTIC_ODDS_STREAM_ODDS === "true";

const mapOpticOddsApiFixtureOdds = (oddsDataArray) =>
  oddsDataArray.map((oddsData) => ({
    fixture_id: oddsData.id,
    game_id: oddsData.game_id,
    start_date: oddsData.start_date,
    home_team: oddsData.home_team_display,
    away_team: oddsData.away_team_display,
    is_live: oddsData.is_live,
    status: oddsData.status,
    sport: oddsData.sport.id,
    league: oddsData.league.name,
    odds: oddsData.odds.map((oddsObj) => ({
      id: oddsObj.id, // 39920-20584-2024-35:draftkings:2nd_set_moneyline:francisco_comesana
      sports_book_name: oddsObj.sportsbook,
      name: oddsObj.name,
      price: oddsObj.price,
      timestamp: oddsObj.timestamp,
      bet_points: oddsObj.points,
      is_main: oddsObj.is_main,
      is_live: oddsData.is_live,
      market_name: oddsObj.market,
      player_id: oddsObj.player_id,
      selection: oddsObj.selection,
      selection_line: oddsObj.selection_line,
      selection_points: oddsObj.points,
    })),
  }));

const mapOddsStreamEventToApiOddsObject = (streamEvent) => ({
  id: streamEvent.id, // 39920-20584-2024-35:draftkings:2nd_set_moneyline:francisco_comesana
  sports_book_name: streamEvent.sportsbook,
  name: streamEvent.name,
  price: streamEvent.price,
  timestamp: streamEvent.timestamp,
  bet_points: streamEvent.points,
  is_main: streamEvent.is_main,
  is_live: streamEvent.is_live,
  market_name: streamEvent.market,
  player_id: streamEvent.player_id,
  selection: streamEvent.selection,
  selection_line: streamEvent.selection_line,
  selection_points: streamEvent.selection_points,
});

// Update or add odds to initial odds from API
const mapOddsStreamEvents = (streamEvents, initialOdds, gamesInfo) => {
  // map existing fixture IDs
  const mappedOdds = initialOdds.map((initialOdd) => {
    const updatedOddsEvents = streamEvents
      .filter((event) => event.fixture_id === initialOdd.fixture_id)
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

  // map new fixture IDs
  const newOdds = streamEvents.filter((event) =>
    initialOdds.every((initialOdd) => initialOdd.fixture_id !== event.fixture_id),
  );
  const groupedOddsByGame = groupBy(newOdds, (newOdd) => newOdd.fixture_id);

  const newMappedOdds = Object.keys(groupedOddsByGame)
    .filter((fixtureId) => gamesInfo.some((gameInfo) => gameInfo.fixture_id === fixtureId))
    .map((fixtureId) => {
      const gameInfoData = gamesInfo.find((gameInfo) => gameInfo.fixture_id === fixtureId);

      const oddsHeader = {
        game_id: gameInfoData.game_id,
        fixture_id: gameInfoData.fixture_id,
        start_date: gameInfoData.start_date,
        home_team: gameInfoData.home_team,
        away_team: gameInfoData.away_team,
        is_live: gameInfoData.is_live, // should be always true
        is_popular: gameInfoData.is_popular,
        tournament: gameInfoData.tournament,
        status: gameInfoData.status,
        sport: gameInfoData.sport,
        league: gameInfoData.league,
      };

      const odds = groupedOddsByGame[fixtureId].map((event) => mapOddsStreamEventToApiOddsObject(event));

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
    oddsResponses = await Promise.all(oddsPromises);
  } catch (e) {
    console.log(`Fetchng Optic Odds fixture odds error: ${e.message} ${e.error})`);
    oddsResponses = [];
  }

  const results = oddsResponses.map((oddsResponse) => oddsResponse.data.data).flat();
  return results;
};

// Start stream for league ID or re-start when param (sportsbooks) is updated
const startOddsStreams = (leagueId, bookmakersData, oddsStreamsInfoByLeagueMap, isTestnet) => {
  const opticOddsLeagueName = getLeagueOpticOddsName(leagueId);

  if (isOpticOddsStreamOddsDisabled || !opticOddsLeagueName) {
    return;
  }

  // Extracting bookmakers (sportsbooks), bet types (markets) for league and Optic Odds league names
  const bookmakers = getBookmakersArray(bookmakersData, leagueId, process.env.LIVE_ODDS_PROVIDERS.split(","));
  const betTypes = getBetTypesForLeague(leagueId, isTestnet);
  const streamLeagues = opticOddsLeagueName.split(",");

  const oddsStreamInfo = oddsStreamsInfoByLeagueMap.get(leagueId);
  const isBookmakersUpdated =
    oddsStreamInfo && oddsStreamInfo.bookmakers.sort().join().toLowerCase() !== bookmakers.sort().join().toLowerCase();
  const sport = getLeagueSport(leagueId);

  // Start new stream for new league or start again when param is updated
  if (!oddsStreamInfo) {
    // start new stream
    const streamSource = connectToOpticOddsStreamOdds(bookmakers, betTypes, sport, streamLeagues);
    oddsStreamsInfoByLeagueMap.set(leagueId, { bookmakers, betTypes, streamSource });
  } else if (isBookmakersUpdated) {
    // close and start with new bookmakers
    oddsStreamInfo.streamSource.close();
    const streamSource = connectToOpticOddsStreamOdds(bookmakers, betTypes, sport, streamLeagues);
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
