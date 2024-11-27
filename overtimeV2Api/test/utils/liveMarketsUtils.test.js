const { League, TotalTypes } = require("overtime-live-trading-utils");
const KEYS = require("../../../redis/redis-keys");
const { liveApiFixtures } = require("../mockData/opticOdds/opticOddsApiFixtures");
const { liveApiFixtureOdds } = require("../mockData/opticOdds/opticOddsApiFixtureOdds");
const { liveMarkets } = require("../mockData/liveMarkets");
const { MAX_ALLOWED_STALE_ODDS_DELAY } = require("../../constants/markets");
const { millisecondsToSeconds, subDays } = require("date-fns");
const { mapOpticOddsApiFixtureOdds } = require("../../utils/opticOdds/opticOddsFixtureOdds");
const { NETWORK } = require("../../constants/networks");

describe("Check live markets utils", () => {
  let axios;

  beforeAll(() => {
    jest.mock("axios");
    axios = require("axios");
  });

  it("checks get redis key", () => {
    // GIVEN functions for getting redis keys
    const { getRedisKeyForOpticOddsApiOdds, getRedisKeyForOpticOddsApiResults } = require("../../utils/liveMarkets");

    // WHEN getting redis key some league ID for testnet
    const leagueId = 1;
    const isTestnet = true;
    let redisKey = getRedisKeyForOpticOddsApiOdds(leagueId, isTestnet);

    // THEN redis key should match odds key
    expect(redisKey).toBe(`${KEYS.TESTNET_OPTIC_ODDS_API_ODDS_BY_LEAGUE}${leagueId}`);

    // WHEN getting redis key some league ID for testnet
    redisKey = getRedisKeyForOpticOddsApiResults(leagueId, isTestnet);

    // THEN redis key should match results key
    expect(redisKey).toBe(`${KEYS.TESTNET_OPTIC_ODDS_API_RESULTS_BY_LEAGUE}${leagueId}`);
  });

  it("checks fetching risk management config", async () => {
    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");
    const { fetchRiskManagementConfig } = require("../../utils/liveMarkets");

    // GIVEN teams map array stored in Redis
    const teams = [["luton town", "luton"]];
    await redisClient.set(KEYS.RISK_MANAGEMENT_TEAMS_MAP, JSON.stringify(teams));
    await redisClient.set(KEYS.RISK_MANAGEMENT_TEAMS_MAP_TESTNET, JSON.stringify(teams));

    // WHEN fetch config on mainnet
    let isTestnet = false;
    let config = await fetchRiskManagementConfig(isTestnet);

    // THEN teams map should retrieved
    expect(config.teamsMap.size).toBe(teams.length);

    // WHEN fetch config on testnet
    isTestnet = true;
    config = await fetchRiskManagementConfig(isTestnet);

    // THEN teams map should retrieved
    expect(config.teamsMap.size).toBe(teams.length);
  });

  it("checks fetching Optic Odds games for league", async () => {
    // GIVEN mocked active fixtures AFC data from Optic Odds API
    axios.get.mockResolvedValue({ data: { data: liveApiFixtures } });

    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");
    const { fetchOpticOddsGamesForLeague } = require("../../utils/liveMarkets");

    // Scenario #1
    // WHEN fetch Optic Odds games for league AFC on mainnet
    const leagueId = League.AFC_CHAMPIONS_LEAGUE;
    let isTestnet = false;
    let opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, isTestnet);

    // THEN mapped Optic Odds games are retrieved and cached to Redis
    expect(opticOddsGames.length).toBe(liveApiFixtures.length);
    expect(opticOddsGames[0].gameId).toBe(liveApiFixtures[0].id);

    // Scenario #2
    // WHEN fetch Optic Odds games for league AFC on testnet
    isTestnet = true;
    opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, isTestnet);

    // THEN mapped Optic Odds games are retrieved and cached to Redis
    expect(opticOddsGames.length).toBe(liveApiFixtures.length);
    expect(opticOddsGames[0].gameId).toBe(liveApiFixtures[0].id);

    // Scenario #3
    // WHEN no games are returned from API
    axios.get.mockResolvedValue({ data: { data: [] } });
    opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, isTestnet);

    // THEN empty array is retrieved
    expect(opticOddsGames.length).toBe(0);

    // Scenario #4
    // WHEN error is returned from API
    axios.get.mockRejectedValue(new Error("Some axios error"));
    opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, isTestnet);

    // THEN cached value is retrieved
    expect(opticOddsGames.length).toBe(liveApiFixtures.length);
    expect(opticOddsGames[0].gameId).toBe(liveApiFixtures[0].id);

    // Scenario #5
    // WHEN error is returned from API and no cached data
    await redisClient.flushAll();
    axios.get.mockRejectedValue(new Error("Some axios error"));
    opticOddsGames = await fetchOpticOddsGamesForLeague(leagueId, isTestnet);

    // THEN empty array is retrieved
    expect(opticOddsGames.length).toBe(0);

    // Scenario #6
    // WHEN fetch is called for bad league ID
    opticOddsGames = await fetchOpticOddsGamesForLeague(-1, isTestnet);

    // THEN empty array is retrieved
    expect(opticOddsGames.length).toBe(0);
  });

  it("checks stale odds", () => {
    // GIVEN function for checking stale odds
    const { isOddsTimeStale } = require("../../utils/liveMarkets");

    // WHEN odds timestamp is not a number
    let timestamp = "2024-11-27T10:00:00Z";
    let isOddsStale = isOddsTimeStale(timestamp);

    // THEN odds time is stale
    expect(isOddsStale).toBe(true);

    // WHEN odds timestamp is older than MAX_ALLOWED_STALE_ODDS_DELAY
    const now = new Date();
    timestamp = millisecondsToSeconds(now.getTime() - MAX_ALLOWED_STALE_ODDS_DELAY);
    isOddsStale = isOddsTimeStale(timestamp);

    // THEN odds time is stale
    expect(isOddsStale).toBe(true);

    // WHEN odds timestamp is not older than MAX_ALLOWED_STALE_ODDS_DELAY
    timestamp = millisecondsToSeconds(now.getTime());
    isOddsStale = isOddsTimeStale(timestamp);

    // THEN odds time is stale
    expect(isOddsStale).toBe(false);
  });

  it("checks filtered stale odds", () => {
    // GIVEN function for filtering stale odds
    const { filterStaleOdds } = require("../../utils/liveMarkets");

    // WHEN there are only moneyline odds
    let gameOddsArray = mapOpticOddsApiFixtureOdds(liveApiFixtureOdds);
    let nonStaledOdds = filterStaleOdds(gameOddsArray);

    // THEN return all odds
    expect(nonStaledOdds.length).toBe(liveApiFixtureOdds.length);

    // WHEN there is one non moneyline stale odds
    const oddsWithStaledNonMoneyline = gameOddsArray.map((gameOdds, index) => {
      let odds = gameOdds.odds;
      if (index === 0) {
        odds = gameOdds.odds.map((data, i) => ({
          ...data,
          marketName: i === 0 ? TotalTypes.TOTAL_GOALS.toLowerCase() : data.marketName,
        }));
      }
      return { ...gameOdds, odds };
    });
    nonStaledOdds = filterStaleOdds(oddsWithStaledNonMoneyline);

    // THEN return odds without the staled one
    expect(nonStaledOdds[0].odds.length).toBe(liveApiFixtureOdds[0].odds.length - 1);

    // WHEN odds are not present
    gameOddsArray = gameOddsArray.map((data) => ({ ...data, odds: null }));
    nonStaledOdds = filterStaleOdds(gameOddsArray);

    // THEN return initial odds
    expect(nonStaledOdds[0].odds).toBe(gameOddsArray[0].odds);
  });

  it("checks market paused", () => {
    // GIVEN function for foltering stale odds
    const { isMarketPaused } = require("../../utils/liveMarkets");

    // WHEN there are some odds
    let isPaused = isMarketPaused(liveMarkets[0]);

    // THEN return as not paused
    expect(isPaused).toBe(false);

    // WHEN there are no odds
    const liveMarketsWithoutOdds = { ...liveMarkets[0], odds: [], childMarkets: [] };
    isPaused = isMarketPaused(liveMarketsWithoutOdds);

    // THEN return as paused
    expect(isPaused).toBe(true);
  });

  it("checks error messages persist", async () => {
    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");

    // GIVEN old error (2 days old) for persist function
    const network = NETWORK.Optimism;
    const errorsMap = new Map();
    const GAME_ID = "0x3030394130434633343445450000000000000000000000000000000000000000";
    const ERROR_MESSAGE = "Blocking game Liechtenstein - San Marino due to missing game result.";
    errorsMap.set(GAME_ID, {
      processingTime: subDays(new Date(), 2).toUTCString(),
      errorTime: subDays(new Date(), 2).toUTCString(),
      errorMessage: ERROR_MESSAGE,
    });
    const { persistErrorMessages } = require("../../utils/liveMarkets");

    // WHEN persists errors
    await persistErrorMessages(errorsMap, network);

    // THEN error should be present in Redis
    let errors = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network]);
    let storedErrorsMap = new Map(JSON.parse(errors));
    expect(storedErrorsMap.get(GAME_ID)[0].errorMessage).toBe(ERROR_MESSAGE);

    // WHEN there are 2 errors, old one again and new one
    const GAME_ID_2 = "0x3742323834333746313245440000000000000000000000000000000000000000";
    const ERROR_MESSAGE_2 = "Blocking game Malta - Andorra due to missing game result.";
    errorsMap.set(GAME_ID_2, {
      processingTime: new Date().toUTCString(),
      errorTime: new Date().toUTCString(),
      errorMessage: ERROR_MESSAGE_2,
    });
    await persistErrorMessages(errorsMap, network);

    // THEN there should be total 2 errors stored in Redis, not 3
    errors = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network]);
    storedErrorsMap = new Map(JSON.parse(errors));
    expect(storedErrorsMap.size).toBe(2);

    // WHEN previous error is older than 24h and there is new error
    const errorsMapSecond = new Map();
    errorsMapSecond.set(GAME_ID_2, {
      processingTime: new Date().toUTCString(),
      errorTime: new Date().toUTCString(),
      errorMessage: ERROR_MESSAGE_2,
    });
    await persistErrorMessages(errorsMapSecond, network);

    // THEN old error should not be present and new error should be present in Redis
    errors = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[network]);
    storedErrorsMap = new Map(JSON.parse(errors));
    expect(storedErrorsMap.size).toBe(1);
    expect(storedErrorsMap.get(GAME_ID)).toBe(undefined);
    expect(storedErrorsMap.get(GAME_ID_2)[0].errorMessage).toBe(ERROR_MESSAGE_2);
  });
});
