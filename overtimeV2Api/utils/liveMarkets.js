const axios = require("axios");
const { getBookmakersArray, MONEYLINE, getBetTypesForLeague } = require("overtime-live-trading-utils");
const {
  OPTIC_ODDS_API_GAMES_URL,
  OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_SCORES_URL,
  OPTIC_ODDS_API_SCORES_MAX_GAMES,
  OPTIC_ODDS_API_TIMEOUT,
} = require("../constants/opticodds");
const teamsMapping = require("../assets/teamsMapping.json");
const { redisClient, getValuesFromRedisAsync } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const { getLeagueOpticOddsName } = require("overtime-live-trading-utils");
const { readCsvFromUrl } = require("./csvReader");
const { connectToOpticOddsStreamOdds } = require("./streams");
const { groupBy } = require("lodash");
const { MAX_ALLOWED_STALE_ODDS_DELAY } = require("../constants/markets");

const fetchTeamsMap = async (timeout) => {
  const teamsMap = new Map();

  const teamsMappingJsonResponse = await axios.get(process.env.GITHUB_URL_LIVE_TEAMS_MAPPING, { timeout });

  let teamsMappingJson = teamsMappingJsonResponse.data;

  if (teamsMappingJson == undefined || Object.keys(teamsMappingJson).length == 0) {
    teamsMappingJson = teamsMapping;
  }

  Object.keys(teamsMappingJson).forEach(function (key) {
    teamsMap.set(key.toString(), teamsMappingJson[key].toString());
  });

  return teamsMap;
};

const fetchRiskManagementConfig = async () => {
  const TIMEOUT = 2000;

  const teamsMapPromise = fetchTeamsMap(TIMEOUT);
  const bookmakersDataPromise = readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV, TIMEOUT);
  const spreadDataPromise = readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV, TIMEOUT);

  let teamsMap, bookmakersData, spreadData;
  try {
    [teamsMap, bookmakersData, spreadData] = await Promise.all([
      teamsMapPromise,
      bookmakersDataPromise,
      spreadDataPromise,
    ]);

    redisClient.mset(
      [
        KEYS.RISK_MANAGEMENT_TEAMS_MAP,
        JSON.stringify(Array.from(teamsMap.entries())),
        KEYS.RISK_MANAGEMENT_BOOKMAKERS_DATA,
        JSON.stringify(bookmakersData),
        KEYS.RISK_MANAGEMENT_SPREAD_DATA,
        JSON.stringify(spreadData),
      ],
      () => {},
    );
  } catch (e) {
    console.log(`Live markets: Fetching from Github config data error: ${e.message}`);
    [teamsMap, bookmakersData, spreadData] = await getValuesFromRedisAsync(
      [KEYS.RISK_MANAGEMENT_TEAMS_MAP, KEYS.RISK_MANAGEMENT_BOOKMAKERS_DATA, KEYS.RISK_MANAGEMENT_SPREAD_DATA],
      false,
    );
    teamsMap = new Map(teamsMap);
  }

  return { teamsMap, bookmakersData, spreadData };
};

const fetchOpticOddsGamesForLeague = async (leagueId, isTestnet) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };

  const leagueIds = getLeagueOpticOddsName(leagueId).split(",");
  const queryParams = `is_live=true&league=${leagueIds.join("&league=")}`;

  const url = `${OPTIC_ODDS_API_GAMES_URL}${queryParams}`;

  let opticOddsResponseData = [];
  try {
    const opticOddsGamesResponse = await axios.get(url, { headers, timeout: OPTIC_ODDS_API_TIMEOUT });
    opticOddsResponseData = opticOddsGamesResponse.data.data;
  } catch (e) {
    console.log(`Live markets: Fetching Optic Odds games error: ${e}`);
  }

  if (opticOddsResponseData.length == 0) {
    if (!isTestnet) {
      console.log(
        `Live markets: Could not find any live games on the provider side for the given league ID ${leagueId}`,
      );
    }
    return [];
  } else {
    return opticOddsResponseData;
  }
};

const fetchOpticOddsGameOddsForMarkets = async (markets, oddsProviders, isTestnet) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };
  let oddsRequestUrl = OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS;
  const opticOddsGameOddsPromises = [];

  const marketsLength = markets.length;

  markets.forEach((market, index) => {
    oddsRequestUrl += `&game_id=${market.opticOddsGameEvent.id}`;

    const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_ODDS_MAX_GAMES;
    // creating new request after max num of games or when last game in request
    if (gameNumInRequest == 0 || index == marketsLength - 1) {
      oddsRequestUrl += `&sportsbook=${oddsProviders.join("&sportsbook=")}`;

      const betTypes = getBetTypesForLeague(market.leagueId, isTestnet);

      betTypes.forEach((betType) => {
        oddsRequestUrl += `&market_name=${betType}`;
      });

      opticOddsGameOddsPromises.push(axios.get(oddsRequestUrl, { headers, timeout: OPTIC_ODDS_API_TIMEOUT }));
      oddsRequestUrl = OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS;
    }
  });

  let oddsPerGamesResponses = [];
  try {
    oddsPerGamesResponses = await Promise.all(opticOddsGameOddsPromises);
  } catch (e) {
    console.log(`Live markets: Fetching Optic Odds game odds data error: ${e}`);
    oddsPerGamesResponses = [];
  }

  const oddsPerGame = oddsPerGamesResponses.map((oddsPerGameResponse) => oddsPerGameResponse.data.data).flat();
  return oddsPerGame;
};

const fetchOpticOddsScoresForMarkets = async (markets) => {
  const headers = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };
  let opticOddsScoresRequestUrl = OPTIC_ODDS_API_SCORES_URL;
  const opticOddsScoresPromises = [];

  // Prepare request for scores
  // For each game ID prepare separate request with max num of games
  const opticOddsGameIds = markets.map((market) => market.opticOddsGameOdds.id);
  opticOddsGameIds.forEach((gameId, index, allGameIds) => {
    const gameNumInRequest = (index + 1) % OPTIC_ODDS_API_SCORES_MAX_GAMES;
    opticOddsScoresRequestUrl += `${gameNumInRequest > 1 ? "&" : ""}game_id=${gameId}`;

    // creating new request after max num of games or when last game in request
    if (gameNumInRequest == 0 || index == allGameIds.length - 1) {
      opticOddsScoresPromises.push(axios.get(opticOddsScoresRequestUrl, { headers, timeout: OPTIC_ODDS_API_TIMEOUT }));
      opticOddsScoresRequestUrl = OPTIC_ODDS_API_SCORES_URL;
    }
  });

  let opticOddsScoresResponses = [];
  try {
    opticOddsScoresResponses = await Promise.all(opticOddsScoresPromises);
  } catch (e) {
    console.log(`Live markets: Fetching Optic Odds game scores data error: ${e}`);
    opticOddsScoresResponses = [];
  }

  const scoresPerGame = opticOddsScoresResponses
    .map((opticOddsScoresResponse) => opticOddsScoresResponse.data.data)
    .flat();
  return scoresPerGame;
};

// Start stream for league ID or re-start when param (sportsbooks) is updated
const startOddsStreams = (leagueId, bookmakersData, oddsStreamsInfoByLeagueMap, isTestnet) => {
  // Extracting bookmakers (sportsbooks), bet types (markets) for league and Optic Odds league names
  const bookmakers = getBookmakersArray(bookmakersData, leagueId, process.env.LIVE_ODDS_PROVIDERS.split(","));
  const betTypes = getBetTypesForLeague(leagueId, isTestnet);
  const streamLeagues = getLeagueOpticOddsName(leagueId).split(",");

  // Start one stream for each league except for tennis GS where starting multiple leagues
  const oddsStreamInfo = oddsStreamsInfoByLeagueMap.get(leagueId);
  const isBookmakersUpdated =
    oddsStreamInfo && oddsStreamInfo.bookmakers.sort().join().toLowerCase() !== bookmakers.sort().join().toLowerCase();

  // Start new stream for new league or start again when param is updated
  if (!oddsStreamInfo) {
    // start new stream
    const streamSource = connectToOpticOddsStreamOdds(bookmakers, betTypes, streamLeagues);
    oddsStreamsInfoByLeagueMap.set(leagueId, { bookmakers, betTypes, streamSource });
  } else if (isBookmakersUpdated) {
    // close and start with new bookmakers
    oddsStreamInfo.streamSource.close();
    const streamSource = connectToOpticOddsStreamOdds(bookmakers, betTypes, streamLeagues);
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

const mapOddsStreamEventToApiOddsObject = (streamEvent) => ({
  id: streamEvent.id,
  sports_book_name: streamEvent.sportsbook,
  name: streamEvent.bet_name,
  price: streamEvent.bet_price,
  timestamp: streamEvent.timestamp,
  bet_points: streamEvent.bet_points,
  is_main: streamEvent.is_main,
  is_live: streamEvent.is_live,
  market_name: streamEvent.bet_type,
  player_id: !streamEvent.player_id ? null : streamEvent.player_id,
  selection: streamEvent.selection,
  selection_line: streamEvent.selection_line,
  selection_points: streamEvent.selection_points,
});

const mapOddsStreamEvents = (streamEvents, initialOdds, gamesInfo) => {
  // map existing game IDs
  const mappedOdds = initialOdds.map((initialOdd) => {
    const updatedOddsEvents = streamEvents
      .filter((event) => event.game_id === initialOdd.id)
      .map((event) => mapOddsStreamEventToApiOddsObject(event));

    if (updatedOddsEvents.length > 0) {
      const odds = initialOdd.odds
        ? initialOdd.odds
            .filter((odd) => updatedOddsEvents.every((updatedOddsEvent) => updatedOddsEvent.id !== odd.id))
            .concat(updatedOddsEvents)
        : updatedOddsEvents;

      return { ...initialOdd, odds };
    } else {
      return initialOdd;
    }
  });

  // map new game IDs
  const newOdds = streamEvents.filter((event) => initialOdds.every((initialOdd) => initialOdd.id !== event.game_id));
  const groupedOddsByGame = groupBy(newOdds, (newOdd) => newOdd.game_id);

  const newMappedOdds = Object.keys(groupedOddsByGame)
    .filter((gameId) => gamesInfo.some((gameInfo) => gameInfo.id === gameId))
    .map((gameId) => {
      const gameInfoData = gamesInfo.find((gameInfo) => gameInfo.id === gameId);

      const oddsHeader = {
        id: gameInfoData.id,
        start_date: gameInfoData.start_date,
        home_team: gameInfoData.home_team,
        away_team: gameInfoData.away_team,
        is_live: true, // gameInfo.is_live should be always true
        is_popular: gameInfoData.is_popular,
        tournament: gameInfoData.tournament,
        status: gameInfoData.status,
        sport: gameInfoData.sport,
        league: gameInfoData.league,
      };

      const odds = groupedOddsByGame[gameId].map((event) => mapOddsStreamEventToApiOddsObject(event));

      return { ...oddsHeader, odds };
    });

  return mappedOdds.concat(newMappedOdds);
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
          (odd) => odd.market_name === MONEYLINE || (odd.market_name !== MONEYLINE && !isOddsTimeStale(odd.timestamp)),
        )
      : gameOdds.odds;

    return { ...gameOdds, odds };
  });

const getRedisKeyForOpticOddsApiOdds = (leagueId) => `${KEYS.OPTIC_ODDS_API_ODDS_BY_LEAGUE}${leagueId}`;
const getRedisKeyForOpticOddsApiScores = (leagueId) => `${KEYS.OPTIC_ODDS_API_SCORES_BY_LEAGUE}${leagueId}`;

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
  fetchOpticOddsGameOddsForMarkets,
  fetchOpticOddsScoresForMarkets,
  startOddsStreams,
  closeInactiveOddsStreams,
  mapOddsStreamEvents,
  isOddsTimeStale,
  filterStaleOdds,
  getRedisKeyForOpticOddsApiOdds,
  getRedisKeyForOpticOddsApiScores,
  persistErrorMessages,
};
