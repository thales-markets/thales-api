const { openMarkets } = require("../mockedData/openMarkets");
const { liveGames } = require("../mockedData/liveGames");
const { liveFixtureOdds } = require("../mockedData/opticOdds/opticOddsFixtureOdds");
const { liveResults } = require("../mockedData/opticOdds/opticOddsResults");
const { teamsMap } = require("../mockedData/riskManagement/teamsMap");
const { bookmakersData } = require("../mockedData/riskManagement/bookmakersData");
const { spreadData } = require("../mockedData/riskManagement/spreadData");
const { leaguesData } = require("../mockedData/riskManagement/leaguesData");
const { NETWORK } = require("../../constants/networks");
const KEYS = require("../../../redis/redis-keys");

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
    opticOddsFixtureOddsSpy.mockResolvedValue(liveFixtureOdds);
    // Mock Optic Odds fixtures results API
    const opticOddsResultsUtils = require("../../utils/opticOdds/opticOddsResults");
    opticOddsResultsSpy = jest.spyOn(opticOddsResultsUtils, "fetchOpticOddsResults");
    opticOddsResultsSpy.mockResolvedValue(liveResults);
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
    const isTestnet = false;

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
    opticOddsFixtureOddsSpy.mockResolvedValue(liveFixtureOdds);
    // Mock Optic Odds fixtures results API
    const opticOddsResultsUtils = require("../../utils/opticOdds/opticOddsResults");
    opticOddsResultsSpy = jest.spyOn(opticOddsResultsUtils, "fetchOpticOddsResults");
    opticOddsResultsSpy.mockResolvedValue(liveResults);
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

  it("checks number of live markets with streams (processAllMarkets)", async () => {
    // This needs to be imported after mocks in order to work
    const { redisClient } = require("../../../redis/client");
    const { processAllMarkets } = require("../../source/liveMarkets");

    // GIVEN X number of ongoing markets on Optimism
    await redisClient.set(KEYS.OVERTIME_V2_OPEN_MARKETS[NETWORK.Optimism], JSON.stringify(openMarkets));

    const oddsStreamsInfoByLeagueMap = new Map();
    const oddsInitializedByLeagueMap = new Map();
    const resultsInitializedByLeagueMap = new Map();
    const isTestnet = false;

    // WHEN process X ongoing markets using API and then process using streams
    await processAllMarkets(
      oddsStreamsInfoByLeagueMap,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );
    // Streams are used after first execution
    await processAllMarkets(
      oddsStreamsInfoByLeagueMap,
      oddsInitializedByLeagueMap,
      resultsInitializedByLeagueMap,
      isTestnet,
    );
  });

  // TODO: check for some stream values are present
  // THEN 
});
