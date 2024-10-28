const axios = require("axios");
const {
  OPTIC_ODDS_API_FIXTURES_URL,
  OPTIC_ODDS_API_KEY_HEADER,
  OPTIC_ODDS_API_FIXTURES_ACTIVE_URL,
} = require("../constants/opticOdds");

const mapOpticOddsApiFixtures = (fixturesData) =>
  fixturesData.map((fixtureData) => ({
    fixture_id: fixtureData.id,
    game_id: fixtureData.game_id,
    start_date: fixtureData.start_date,
    home_team: fixtureData.home_team_display,
    away_team: fixtureData.away_team_display,
    is_live: fixtureData.is_live,
    status: fixtureData.status,
    sport: fixtureData.sport.id,
    league: fixtureData.league.name,
  }));

const fetchOpticOddsFixtures = async (league, startDate, page) => {
  let fixturesResponseData = null;

  const urlQueryParams = `league=${league}&start_date=${startDate}&page=${page}`;
  const url = `${OPTIC_ODDS_API_FIXTURES_URL}?${urlQueryParams}`;
  try {
    const fixturesResponse = await axios.get(url, { headers: OPTIC_ODDS_API_KEY_HEADER });
    fixturesResponseData = fixturesResponse.data;
  } catch (e) {
    console.log(`Fetchng Optic Odds fixtures error: ${e.message}`);
  }

  return fixturesResponseData;
};

// one page returns max 100 objects in data array
const fetchOpticOddsFixturesActive = async (leagues, isLive, startDate = null, page = 1, timeout = 0) => {
  const urlQueryParams = `league=${leagues.join("&league=")}&is_live=${isLive}${
    startDate ? `&start_date=${startDate}` : ""
  }&page=${page}`;

  const url = `${OPTIC_ODDS_API_FIXTURES_ACTIVE_URL}?${urlQueryParams}`;

  let fixturesResponseData = null;
  try {
    const fixturesResponse = await axios.get(url, { headers: OPTIC_ODDS_API_KEY_HEADER, timeout });
    fixturesResponseData = fixturesResponse.data;
  } catch (e) {
    console.log(`Fetching Optic Odds fixtures/active error: ${e.message}`);
  }

  return fixturesResponseData;
};

module.exports = {
  mapOpticOddsApiFixtures,
  fetchOpticOddsFixtures,
  fetchOpticOddsFixturesActive,
};
