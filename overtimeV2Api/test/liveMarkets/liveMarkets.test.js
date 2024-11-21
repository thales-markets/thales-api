const { openMarkets } = require("../mockedData/openMarkets");
const { liveGames } = require("../mockedData/liveGames");
const { liveApiFixtureOdds } = require("../mockedData/opticOdds/opticOddsApiFixtureOdds");
const { liveApiResults } = require("../mockedData/opticOdds/opticOddsApiResults");
const { teamsMap } = require("../mockedData/riskManagement/teamsMap");
const { bookmakersData } = require("../mockedData/riskManagement/bookmakersData");
const { spreadData } = require("../mockedData/riskManagement/spreadData");
const { leaguesData } = require("../mockedData/riskManagement/leaguesData");
const { NETWORK } = require("../../constants/networks");
const KEYS = require("../../../redis/redis-keys");
const { getRedisKeyForOpticOddsStreamEventOddsId } = require("../../utils/opticOdds/opticOddsStreamsConnector");
const { convertFromBytes32 } = require("../../utils/markets");
const { streamEventOddsById } = require("../mockedData/opticOdds/opticOddsStreamEventOdds");

describe("Check live markets without streams", () => {
  const OLD_ENV = process.env;
  let riskManagementSpy;
  let opticOddsGamesSpy;
  let opticOddsFixtureOddsSpy;
  let opticOddsResultsSpy;

  beforeAll(() => {
    jest.resetModules(); // Clear the module cache
    process.env = { ...OLD_ENV }; // Copy current environment variables

    process.env.REDIS_URL = "redis://redis:6379";
    process.env.LIVE_ODDS_PROVIDERS = "draftkings";
    process.env.DISABLE_OPTIC_ODDS_STREAM_ODDS = "true";
    process.env.DISABLE_OPTIC_ODDS_STREAM_RESULTS = "true";
    process.env.IS_TESTNET = "false";

    // Example to mock node_modules
    // require("overtime-live-trading-utils").__mockBookmakersArray(["draftkings"]);
    jest.unmock("overtime-live-trading-utils");

    // Mock risk management API
    const liveMarketsUtils = require("../../utils/liveMarkets");
    riskManagementSpy = jest.spyOn(liveMarketsUtils, "fetchRiskManagementConfig");
    const config = { teamsMap, bookmakersData, spreadData, leaguesData };
    riskManagementSpy.mockResolvedValue(config);
    // Mock Optic Odds fixtures active API
    opticOddsGamesSpy = jest.spyOn(liveMarketsUtils, "fetchOpticOddsGamesForLeague");
    opticOddsGamesSpy.mockResolvedValue(liveGames);
    // Mock Optic Odds fixtures odds API
    const opticOddsFixtureOddsUtils = require("../../utils/opticOdds/opticOddsFixtureOdds");
    opticOddsFixtureOddsSpy = jest.spyOn(opticOddsFixtureOddsUtils, "fetchOpticOddsFixtureOdds");
    opticOddsFixtureOddsSpy.mockResolvedValue(liveApiFixtureOdds);
    // Mock Optic Odds fixtures results API
    const opticOddsResultsUtils = require("../../utils/opticOdds/opticOddsResults");
    opticOddsResultsSpy = jest.spyOn(opticOddsResultsUtils, "fetchOpticOddsResults");
    opticOddsResultsSpy.mockResolvedValue(liveApiResults);
  });

  beforeEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore original environment variables

    riskManagementSpy.mockRestore();
    opticOddsGamesSpy.mockRestore();
    opticOddsFixtureOddsSpy.mockRestore();
    opticOddsResultsSpy.mockRestore();
  });

  it("checks live markets processing (processLiveMarkets)", () => {
    jest.useFakeTimers();

    // Mock Optic Odds fixtures odds API
    const liveMarkets = require("../../source/liveMarkets");
    const liveMarketsSpy = jest.spyOn(liveMarkets, "processAllMarkets");
    liveMarketsSpy.mockResolvedValue([]);

    // This needs to be imported after mocks in order to work
    const { processLiveMarkets } = require("../../source/liveMarkets");
    processLiveMarkets();

    jest.runAllTimers();

    expect(liveMarketsSpy).toHaveBeenCalledTimes(1);

    liveMarketsSpy.mockRestore();
  });

  it("checks live markets processing with error (processLiveMarkets)", () => {
    jest.useFakeTimers();

    // Mock Optic Odds fixtures odds API
    const liveMarkets = require("../../source/liveMarkets");
    const liveMarketsSpy = jest.spyOn(liveMarkets, "processAllMarkets");
    liveMarketsSpy.mockRejectedValue("Some error");

    // This needs to be imported after mocks in order to work
    const { processLiveMarkets } = require("../../source/liveMarkets");
    processLiveMarkets();

    jest.runAllTimers();

    expect(liveMarketsSpy).toHaveBeenCalledTimes(1);

    liveMarketsSpy.mockRestore();
  });

  it("checks number of live markets (processAllMarkets)", async () => {
    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");
    const { processAllMarkets } = require("../../source/liveMarkets");

    // GIVEN X number of ongoing markets on Optimism
    await redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism], JSON.stringify(openMarkets));

    const oddsStreamsInfoByLeagueMap = new Map();
    const oddsInitializedByLeagueMap = new Map();
    const resultsInitializedByLeagueMap = new Map();
    const isTestnet = process.env.IS_TESTNET === "true";

    // WHEN process X ongoing markets
    await processAllMarkets(
      oddsStreamsInfoByLeagueMap,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );

    // THEN X live markets should be stored in Redis for all networks
    const liveMarketsOp = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Optimism]));
    expect(liveMarketsOp.length).toBe(openMarkets.length);
    const liveMarketsArb = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Arbitrum]));
    expect(liveMarketsArb.length).toBe(openMarkets.length);
  });
});

describe("Check live markets with streams", () => {
  const OLD_ENV = process.env;
  let riskManagementSpy;
  let opticOddsGamesSpy;
  let opticOddsFixtureOddsSpy;
  let opticOddsResultsSpy;
  let startOddsStreamsSpy;
  let closeInactiveOddsStreamsSpy;

  beforeAll(() => {
    jest.resetModules(); // Clear the module cache
    process.env = { ...OLD_ENV }; // Copy current environment variables

    process.env.LIVE_ODDS_PROVIDERS = "draftkings";
    process.env.DISABLE_OPTIC_ODDS_STREAM_ODDS = "false";
    process.env.DISABLE_OPTIC_ODDS_STREAM_RESULTS = "false";

    // Example to mock node_modules
    // require("overtime-live-trading-utils").__mockBookmakersArray(["draftkings"]);
    jest.unmock("overtime-live-trading-utils");

    // Mock risk management API
    const liveMarketsUtils = require("../../utils/liveMarkets");
    riskManagementSpy = jest.spyOn(liveMarketsUtils, "fetchRiskManagementConfig");
    const config = { teamsMap, bookmakersData, spreadData, leaguesData };
    riskManagementSpy.mockResolvedValue(config);
    // Mock Optic Odds fixtures active API
    opticOddsGamesSpy = jest.spyOn(liveMarketsUtils, "fetchOpticOddsGamesForLeague");
    opticOddsGamesSpy.mockResolvedValue(liveGames);
    // Mock Optic Odds fixtures odds API
    const opticOddsFixtureOddsUtils = require("../../utils/opticOdds/opticOddsFixtureOdds");
    opticOddsFixtureOddsSpy = jest.spyOn(opticOddsFixtureOddsUtils, "fetchOpticOddsFixtureOdds");
    opticOddsFixtureOddsSpy.mockResolvedValue(liveApiFixtureOdds);
    // Mock Optic Odds fixtures results API
    const opticOddsResultsUtils = require("../../utils/opticOdds/opticOddsResults");
    opticOddsResultsSpy = jest.spyOn(opticOddsResultsUtils, "fetchOpticOddsResults");
    opticOddsResultsSpy.mockResolvedValue(liveApiResults);
    // Mock start/close streams
    startOddsStreamsSpy = jest.spyOn(opticOddsFixtureOddsUtils, "startOddsStreams");
    startOddsStreamsSpy.mockReturnValue();
    closeInactiveOddsStreamsSpy = jest.spyOn(opticOddsFixtureOddsUtils, "closeInactiveOddsStreams");
    closeInactiveOddsStreamsSpy.mockReturnValue();
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore original environment variables

    riskManagementSpy.mockRestore();
    opticOddsGamesSpy.mockRestore();
    opticOddsFixtureOddsSpy.mockRestore();
    opticOddsResultsSpy.mockRestore();
  });

  it("checks odds of live markets with streams (processAllMarkets)", async () => {
    // Mock stale odds check
    const liveMarketsUtils = require("../../utils/liveMarkets");
    riskManagementSpy = jest.spyOn(liveMarketsUtils, "isOddsTimeStale");
    riskManagementSpy.mockReturnValue(false);
    riskManagementSpy = jest.spyOn(liveMarketsUtils, "filterStaleOdds");
    riskManagementSpy.mockImplementation((a) => a);

    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");
    const { processAllMarkets } = require("../../source/liveMarkets");

    const isTestnet = process.env.IS_TESTNET === "true";

    // GIVEN
    // X number of ongoing markets on Optimism
    await redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism], JSON.stringify(openMarkets));

    const oddsStreamsInfoByLeagueMap = new Map();
    const oddsInitializedByLeagueMap = new Map();
    const resultsInitializedByLeagueMap = new Map();

    // WHEN process X ongoing markets using API
    await processAllMarkets(
      oddsStreamsInfoByLeagueMap,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );

    // THEN odds should be the same as from API
    let liveMarketsOp = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Optimism]));
    liveMarketsOp.forEach((liveMarket) => {
      const expectedOdds = liveApiFixtureOdds.find((data) => data.id === convertFromBytes32(liveMarket.gameId))?.odds;
      const liveOdds = liveMarket.odds.map((odds) => odds.decimal);

      liveOdds.forEach((decimalOdds, i) => {
        const selection = i === 0 ? liveMarket.homeTeam : i === 1 ? liveMarket.awayTeam : "Draw";
        const expected = expectedOdds.find((data) => data.selection === selection);

        expect(decimalOdds).toBe(expected?.price);
      });
    });

    let updatedOddsGameIds = [];

    // WHEN one game odds have been updated from stream
    const gameIds = Array.from(new Map(openMarkets).values()).map((openMarket) =>
      convertFromBytes32(openMarket.gameId),
    );
    gameIds.forEach((gameId) => {
      // Mock Redis with stream data
      const streamOddsDataArray = streamEventOddsById.filter((streamOddsData) => streamOddsData.fixture_id === gameId);

      const redisKeysForOdds = [];
      streamOddsDataArray.forEach((streamOddsData) => {
        redisClient.set(streamOddsData.id, JSON.stringify(streamOddsData));
        redisKeysForOdds.push(streamOddsData.id);
      });

      if (redisKeysForOdds.length) {
        const redisGameKey = getRedisKeyForOpticOddsStreamEventOddsId(gameId, isTestnet);
        redisClient.set(redisGameKey, JSON.stringify(redisKeysForOdds));
        updatedOddsGameIds.push(gameId);
      }
    });

    // And second processing is executed
    await processAllMarkets(
      oddsStreamsInfoByLeagueMap,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );

    // THEN odds should be updated from from Stream
    liveMarketsOp = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Optimism]));
    liveMarketsOp.forEach((liveMarket) => {
      const isUpdatedLiveMarket = updatedOddsGameIds.includes(convertFromBytes32(liveMarket.gameId));

      const expectedApiOdds = liveApiFixtureOdds.find(
        (data) => data.id === convertFromBytes32(liveMarket.gameId),
      )?.odds;
      const expectedOdds = isUpdatedLiveMarket
        ? streamEventOddsById.filter((data) => data.fixture_id === convertFromBytes32(liveMarket.gameId)) || []
        : expectedApiOdds;

      const liveOdds = liveMarket.odds.map((odds) => odds.decimal);

      liveOdds.forEach((decimalOdds, i) => {
        const selection = i === 0 ? liveMarket.homeTeam : i === 1 ? liveMarket.awayTeam : "Draw";
        const expected = expectedOdds.find((data) => data.selection === selection) || expectedApiOdds;

        expect(decimalOdds).toBe(expected.price);
      });
    });
  });
});
