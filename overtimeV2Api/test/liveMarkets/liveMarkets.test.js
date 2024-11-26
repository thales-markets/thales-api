const { openMarkets } = require("../mockData/openMarkets");
const { liveGames } = require("../mockData/liveGames");
const { liveApiFixtureOdds } = require("../mockData/opticOdds/opticOddsApiFixtureOdds");
const { liveApiResults } = require("../mockData/opticOdds/opticOddsApiResults");
const { teamsMap } = require("../mockData/riskManagement/teamsMap");
const { bookmakersData } = require("../mockData/riskManagement/bookmakersData");
const { spreadData } = require("../mockData/riskManagement/spreadData");
const { leaguesData } = require("../mockData/riskManagement/leaguesData");
const { NETWORK } = require("../../constants/networks");
const KEYS = require("../../../redis/redis-keys");
const { convertFromBytes32 } = require("../../utils/markets");
const { streamOddsEventsData } = require("../mockData/opticOdds/opticOddsStreamEventOdds");
const { delay } = require("../../utils/general");

describe("Check live markets without streams", () => {
  const OLD_ENV = process.env;
  let riskManagementSpy;
  let utilsStaleOddsSpy;
  let utilsFilterStaleOddsSpy;
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

    jest.mock("overtime-live-trading-utils");

    // Mock risk management API
    const liveMarketsUtils = require("../../utils/liveMarkets");
    riskManagementSpy = jest.spyOn(liveMarketsUtils, "fetchRiskManagementConfig");
    const config = { teamsMap, bookmakersData, spreadData, leaguesData };
    riskManagementSpy.mockResolvedValue(config);
    // Mock stale odds check
    utilsStaleOddsSpy = jest.spyOn(liveMarketsUtils, "isOddsTimeStale");
    utilsStaleOddsSpy.mockReturnValue(false);
    utilsFilterStaleOddsSpy = jest.spyOn(liveMarketsUtils, "filterStaleOdds");
    utilsFilterStaleOddsSpy.mockImplementation((a) => a);
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
    utilsStaleOddsSpy.mockRestore();
    utilsFilterStaleOddsSpy.mockRestore();
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

    try {
      expect(liveMarketsSpy).toHaveBeenCalledTimes(1);
    } finally {
      liveMarketsSpy.mockRestore();
    }
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

    try {
      expect(liveMarketsSpy).toHaveBeenCalledTimes(1);
    } finally {
      liveMarketsSpy.mockRestore();
    }
  });

  it("checks zero number of live markets (processAllMarkets)", async () => {
    // Mocks zero games
    opticOddsGamesSpy.mockResolvedValue([]);

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

    // THEN zero live markets should be stored in Redis for all networks
    try {
      const liveMarketsOp = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Optimism]));
      expect(liveMarketsOp.length).toBe(0);
      const liveMarketsArb = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Arbitrum]));
      expect(liveMarketsArb.length).toBe(0);
    } finally {
      opticOddsGamesSpy.mockResolvedValue(liveGames);
    }
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

  it("checks error from game constraints", async () => {
    const ERROR_MESSAGE = "Mocked checkGameContraints error message";
    // Mock checkGameContraints from node_modules/overtime-live-trading-utils
    const { __mockCheckGameContraints } = require("../../../__mocks__/overtime-live-trading-utils");
    __mockCheckGameContraints({ allow: false, message: ERROR_MESSAGE });
    require("overtime-live-trading-utils").checkGameContraints();

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

    // THEN error message should be stored to redis
    await delay(100); // wait for redis set to be completed
    const errorObj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    const firstMarket = Array.from(new Map(openMarkets).values())[0];
    const errorMessages = new Map(JSON.parse(errorObj)).get(firstMarket.gameId);
    const errorMessage = errorMessages && errorMessages.length ? errorMessages[0].errorMessage : "";

    try {
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toBe(ERROR_MESSAGE);
    } finally {
      await redisClient.del(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
      __mockCheckGameContraints({ allow: true, message: "" });
    }
  });

  it("checks error for stale odds", async () => {
    // Mock stale odds
    utilsStaleOddsSpy.mockReturnValue(true);

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

    // THEN error message should be stored to redis
    await delay(100); // wait for redis set to be completed
    const errorObj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    const firstMarket = Array.from(new Map(openMarkets).values())[0];
    const errorMessages = new Map(JSON.parse(errorObj)).get(firstMarket.gameId);
    const errorMessage = errorMessages && errorMessages.length ? errorMessages[0].errorMessage : "";

    try {
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toBe(
        `Pausing game ${firstMarket.homeTeam} - ${firstMarket.awayTeam} due to odds being stale`,
      );
    } finally {
      utilsStaleOddsSpy.mockReturnValue(false);
      await redisClient.del(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    }
  });

  it("checks error for result not found", async () => {
    // Mock empty results
    opticOddsResultsSpy.mockResolvedValue([]);

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

    // THEN error message should be stored to redis
    await delay(100); // wait for redis set to be completed
    const errorObj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    const firstMarket = Array.from(new Map(openMarkets).values())[0];
    const errorMessages = new Map(JSON.parse(errorObj)).get(firstMarket.gameId);
    const errorMessage = errorMessages && errorMessages.length ? errorMessages[0].errorMessage : "";

    try {
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toBe(
        `Blocking game ${firstMarket.homeTeam} - ${firstMarket.awayTeam} due to missing game result.`,
      );
    } finally {
      opticOddsResultsSpy.mockResolvedValue(liveApiResults);
      await redisClient.del(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    }
  });

  it("checks error for result unknown status", async () => {
    // Mock results status null
    const liveApiResultsWithUnknownStatus = liveApiResults.map((liveApiResult) => ({
      ...liveApiResult,
      fixture: { ...liveApiResult.fixture, status: null },
    }));
    opticOddsResultsSpy.mockResolvedValue(liveApiResultsWithUnknownStatus);

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

    // THEN error message should be stored to redis
    await delay(100); // wait for redis set to be completed
    const errorObj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    const firstMarket = Array.from(new Map(openMarkets).values())[0];
    const errorMessages = new Map(JSON.parse(errorObj)).get(firstMarket.gameId);
    const errorMessage = errorMessages && errorMessages.length ? errorMessages[0].errorMessage : "";

    try {
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toBe(
        `Pausing game ${firstMarket.homeTeam} - ${firstMarket.awayTeam} due to unknown status or period`,
      );
    } finally {
      opticOddsResultsSpy.mockResolvedValue(liveApiResults);
      await redisClient.del(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    }
  });

  it("checks error for result not live", async () => {
    // Mock results isLive false
    const liveApiResultsWithUnknownStatus = liveApiResults.map((liveApiResult) => ({
      ...liveApiResult,
      fixture: { ...liveApiResult.fixture, is_live: false },
    }));
    opticOddsResultsSpy.mockResolvedValue(liveApiResultsWithUnknownStatus);

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

    // THEN error message should be stored to redis
    await delay(100); // wait for redis set to be completed
    const errorObj = await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
    const firstMarket = Array.from(new Map(openMarkets).values())[0];
    const errorMessages = new Map(JSON.parse(errorObj)).get(firstMarket.gameId);
    const errorMessage = errorMessages && errorMessages.length ? errorMessages[0].errorMessage : "";

    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toBe(`Provider marked game ${firstMarket.homeTeam} - ${firstMarket.awayTeam} as not live`);

    await redisClient.del(KEYS.OVERTIME_V2_LIVE_MARKETS_API_ERROR_MESSAGES[NETWORK.Optimism]);
  });
});

describe("Check live markets with streams", () => {
  const OLD_ENV = process.env;
  let riskManagementSpy;
  let utilsStaleOddsSpy;
  let utilsFilterStaleOddsSpy;
  let opticOddsGamesSpy;
  let opticOddsFixtureOddsSpy;
  let opticOddsResultsSpy;
  let startOddsStreamsSpy;
  let closeInactiveOddsStreamsSpy;

  const getExpectedStreamOddsPrice = (gameId, selection, checkStream = true) => {
    const expectedApiOdds = liveApiFixtureOdds.find((data) => data.id === convertFromBytes32(gameId))?.odds;

    const isUpdatedLiveMarketSelection =
      checkStream &&
      streamOddsEventsData
        .flat()
        .find((data) => data.fixture_id === convertFromBytes32(gameId) && data.selection === selection) !== undefined;

    const expectedOdds = isUpdatedLiveMarketSelection
      ? streamOddsEventsData
          .flat()
          .reverse()
          .filter((data) => data.fixture_id === convertFromBytes32(gameId)) || []
      : expectedApiOdds;

    const expected = expectedOdds.find((data) => data.selection === selection);

    return expected?.price;
  };

  beforeAll(() => {
    jest.resetModules(); // Clear the module cache
    process.env = { ...OLD_ENV }; // Copy current environment variables

    process.env.LIVE_ODDS_PROVIDERS = "draftkings";
    process.env.DISABLE_OPTIC_ODDS_STREAM_ODDS = "false";
    process.env.DISABLE_OPTIC_ODDS_STREAM_RESULTS = "false";

    jest.mock("overtime-live-trading-utils");

    // Mock risk management API
    const liveMarketsUtils = require("../../utils/liveMarkets");
    riskManagementSpy = jest.spyOn(liveMarketsUtils, "fetchRiskManagementConfig");
    const config = { teamsMap, bookmakersData, spreadData, leaguesData };
    riskManagementSpy.mockResolvedValue(config);
    // Mock stale odds check
    utilsStaleOddsSpy = jest.spyOn(liveMarketsUtils, "isOddsTimeStale");
    utilsStaleOddsSpy.mockReturnValue(false);
    utilsFilterStaleOddsSpy = jest.spyOn(liveMarketsUtils, "filterStaleOdds");
    utilsFilterStaleOddsSpy.mockImplementation((a) => a);
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
    utilsStaleOddsSpy.mockRestore();
    utilsFilterStaleOddsSpy.mockRestore();
    opticOddsGamesSpy.mockRestore();
    opticOddsFixtureOddsSpy.mockRestore();
    opticOddsResultsSpy.mockRestore();
    startOddsStreamsSpy.mockRestore();
    closeInactiveOddsStreamsSpy.mockRestore();
  });

  it("checks odds of live markets with streams (processAllMarkets)", async () => {
    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");
    const { processAllMarkets } = require("../../source/liveMarkets");
    const {
      setRedisStreamOddsDataForGameId,
      setRedisStreamResultsDataForGameId,
    } = require("../mockData/redis/streams");

    const isTestnet = process.env.IS_TESTNET === "true";

    // GIVEN X number of ongoing markets on Optimism
    await redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism], JSON.stringify(openMarkets));
    // And some old stream data (will be deleted on first execution)
    setRedisStreamOddsDataForGameId(streamOddsEventsData[0][0].fixture_id, isTestnet);

    const oddsStreamsInfoByLeagueMap = new Map();
    const oddsInitializedByLeagueMap = new Map();
    const resultsInitializedByLeagueMap = new Map();

    // WHEN process X ongoing markets for the first time using API
    await processAllMarkets(
      oddsStreamsInfoByLeagueMap,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );

    // THEN odds should be the same as from API
    let liveMarketsOp = JSON.parse(await redisClient.get(KEYS.OVERTIME_V2_LIVE_MARKETS[NETWORK.Optimism]));
    liveMarketsOp.forEach((liveMarket) => {
      const liveOdds = liveMarket.odds.map((odds) => odds.decimal);

      liveOdds.forEach((decimalOdds, i) => {
        const selection = i === 0 ? liveMarket.homeTeam : i === 1 ? liveMarket.awayTeam : "Draw";
        const expectedPrice = getExpectedStreamOddsPrice(liveMarket.gameId, selection, false);

        expect(decimalOdds).toBe(expectedPrice);
      });
    });

    // WHEN one game odds have been updated from stream
    const gameIds = Array.from(new Map(openMarkets).values()).map((openMarket) =>
      convertFromBytes32(openMarket.gameId),
    );
    gameIds.forEach((gameId) => {
      setRedisStreamOddsDataForGameId(gameId, isTestnet);
      setRedisStreamResultsDataForGameId(gameId, isTestnet);
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
      const liveOdds = liveMarket.odds.map((odds) => odds.decimal);

      liveOdds.forEach((decimalOdds, i) => {
        const selection = i === 0 ? liveMarket.homeTeam : i === 1 ? liveMarket.awayTeam : "Draw";
        const expectedPrice = getExpectedStreamOddsPrice(liveMarket.gameId, selection);

        expect(decimalOdds).toBe(expectedPrice);
      });
    });
  });
});
