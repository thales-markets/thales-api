const { format } = require("date-fns");
const { League } = require("overtime-live-trading-utils");
const { liveApiFixtures } = require("../../mockData/opticOdds/opticOddsApiFixtures");
const { OPTIC_ODDS_API_TIMEOUT } = require("../../../constants/opticOdds");

describe("Check utils Optic Odds fixtures", () => {
  let axios;

  beforeAll(() => {
    jest.mock("axios");
    axios = require("axios");
  });

  it("checks start date before and after params", () => {
    // This needs to be imported after mocks in order to work
    const { getStartDateBeforeAndAfter } = require("../../../utils/opticOdds/opticOddsFixtures");

    // GIVEN start date as function param
    const startDate = format(new Date("2024-11-06"), "yyyy-MM-dd");

    // WHEN getting start date before and after
    const dateRange = getStartDateBeforeAndAfter(startDate);

    // THEN range should be:
    // startDateBefore: 2024-11-07T00:00:00Z
    // startDateAfter:  2024-11-05T23:59:59Z
    expect(dateRange.startDateBefore).toBe("2024-11-07T00:00:00Z");
    expect(dateRange.startDateAfter).toBe("2024-11-05T23:59:59Z");
  });

  it("checks fetching Optic Odds fixtures", async () => {
    // GIVEN mocked fixtures AFC data from Optic Odds API
    axios.get.mockResolvedValue({ data: { data: liveApiFixtures } });
    const league = League.AFC_CHAMPIONS_LEAGUE;
    const startDate = format(new Date("2024-11-06"), "yyyy-MM-dd");
    const page = 1;

    // This needs to be imported after mocks in order to work
    const { fetchOpticOddsFixtures } = require("../../../utils/opticOdds/opticOddsFixtures");

    // WHEN fetching fixtures
    let fixturesResponseData = await fetchOpticOddsFixtures(league, startDate, page);

    // THEN it should retrieve the same ID
    expect(fixturesResponseData.data.length).toBe(liveApiFixtures.length);
    expect(fixturesResponseData.data[0].id).toBe(liveApiFixtures[0].id);

    // WHEN API returns error
    axios.get.mockRejectedValue(new Error("Some axios error"));
    fixturesResponseData = await fetchOpticOddsFixtures(league, startDate, page);

    // THEN it should return null
    expect(fixturesResponseData).toBe(null);
  });

  it("checks fetching Optic Odds fixtures active", async () => {
    // GIVEN mocked fixtures active AFC data from Optic Odds API
    axios.get.mockResolvedValue({ data: { data: liveApiFixtures } });
    const leagueIds = [League.AFC_CHAMPIONS_LEAGUE];
    const isLive = true;
    const startDate = format(new Date("2024-11-06"), "yyyy-MM-dd");
    const page = 1;

    // This needs to be imported after mocks in order to work
    const { fetchOpticOddsFixturesActive } = require("../../../utils/opticOdds/opticOddsFixtures");

    // WHEN fetching fixtures with all optional params
    let fixturesResponseData = await fetchOpticOddsFixturesActive(
      leagueIds,
      isLive,
      startDate,
      page,
      OPTIC_ODDS_API_TIMEOUT,
    );

    // THEN it should retrieve the same ID
    expect(fixturesResponseData.data.length).toBe(liveApiFixtures.length);
    expect(fixturesResponseData.data[0].id).toBe(liveApiFixtures[0].id);

    // WHEN fetching fixtures without optional params
    fixturesResponseData = await fetchOpticOddsFixturesActive(leagueIds, isLive);

    // THEN it should retrieve the same ID
    expect(fixturesResponseData.data.length).toBe(liveApiFixtures.length);
    expect(fixturesResponseData.data[0].id).toBe(liveApiFixtures[0].id);
  });
});
