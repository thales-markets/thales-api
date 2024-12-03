const { streamOddsEvents } = require("../../mockData/opticOdds/opticOddsStreamEventOdds");
const { liveApiFixtureOdds } = require("../../mockData/opticOdds/opticOddsApiFixtureOdds");
const { liveSoccerGames } = require("../../mockData/liveGames");

describe("Check utils Optic Odds fixture odds", () => {
  let axios;

  beforeAll(() => {
    jest.mock("axios");
    axios = require("axios");
  });

  it("checks mapping of stream odds events to existing games", () => {
    // This needs to be imported after mocks in order to work
    const {
      mapOddsStreamEvents,
      mapOpticOddsApiFixtureOdds,
    } = require("../../../utils/opticOdds/opticOddsFixtureOdds");

    // GIVEN initial games from API without odds
    const initialOdds = mapOpticOddsApiFixtureOdds(liveApiFixtureOdds).map((data) => ({ ...data, odds: undefined }));
    const streamEvents = streamOddsEvents.filter((data) => data.type === "odds")[0].data;

    // WHEN map stream events to initial odds
    const oddsPerGame = mapOddsStreamEvents(streamEvents, initialOdds, []);

    // THEN odds should be the same as from stream
    const gameId = initialOdds[0].gameId;
    const homeTeam = initialOdds[0].homeTeam.toLowerCase();

    const expectedHomeOdds = streamEvents.find(
      (data) => data.fixture_id === gameId && data.name.toLowerCase() === homeTeam,
    ).price;
    const mappedHomeOdds = oddsPerGame
      .find((data) => data.gameId === gameId)
      .odds.find((data) => data.name.toLowerCase() === homeTeam).price;

    expect(mappedHomeOdds).toBe(expectedHomeOdds);
  });

  it("checks mapping of stream odds events for new games", () => {
    // This needs to be imported after mocks in order to work
    const { mapOddsStreamEvents } = require("../../../utils/opticOdds/opticOddsFixtureOdds");

    // GIVEN no initial games
    const streamEvents = streamOddsEvents.filter((data) => data.type === "odds")[0].data;

    // WHEN map stream events for new games
    const oddsPerGame = mapOddsStreamEvents(streamEvents, [], liveSoccerGames);

    // THEN odds should be the same as from stream
    console.log(oddsPerGame);
  });
});
