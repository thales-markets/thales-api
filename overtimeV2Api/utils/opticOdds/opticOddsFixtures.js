const axios = require("axios");
const {
  OPTIC_ODDS_API_FIXTURES_URL,
  OPTIC_ODDS_API_KEY_HEADER,
  OPTIC_ODDS_API_FIXTURES_ACTIVE_URL,
  DATE_FORMAT_WITH_TIME_ZONE,
} = require("../../constants/opticOdds");
const { logAllError } = require("../../../utils/logger");
const { format, subSeconds, startOfDay, addDays } = require("date-fns");

const mapOpticOddsApiFixtures = (fixturesData) =>
  fixturesData.map((fixtureData) => ({
    gameId: fixtureData.id, // fixture_id
    startDate: fixtureData.start_date,
    homeTeam: fixtureData.home_team_display,
    awayTeam: fixtureData.away_team_display,
    isLive: fixtureData.is_live,
    status: fixtureData.status,
    sport: fixtureData.sport.id,
    league: fixtureData.league.name,
  }));

/*
 * Example:
 * startDate:       2024-11-06
 * startDatetime:   2024-11-06T00:00:00Z
 * startDateAfter:  2024-11-05T23:59:59Z
 * startDateBefore: 2024-11-07T00:00:00Z
 */
const getStartDateBeforeAndAfter = (startDate) => {
  const startDatetime = startOfDay(new Date(startDate));
  const startDateAfter = format(subSeconds(startDatetime, 1), DATE_FORMAT_WITH_TIME_ZONE);
  const startDateBefore = format(addDays(startDatetime, 1), DATE_FORMAT_WITH_TIME_ZONE);
  return { startDateAfter, startDateBefore };
};

const fetchOpticOddsFixtures = async (league, startDate, page) => {
  let fixturesResponseData = null;

  const { startDateAfter, startDateBefore } = getStartDateBeforeAndAfter(startDate);

  const urlQueryParams = `league=${league}&start_date_after=${startDateAfter}&start_date_before=${startDateBefore}&page=${page}`;
  const url = `${OPTIC_ODDS_API_FIXTURES_URL}?${urlQueryParams}`;
  try {
    const fixturesResponse = await axios.get(url, { headers: OPTIC_ODDS_API_KEY_HEADER });
    fixturesResponseData = fixturesResponse.data;
  } catch (e) {
    logAllError(`Fetchng Optic Odds fixtures error: ${e.message}`);
  }

  return fixturesResponseData;
};

// one page returns max 100 objects in data array
const fetchOpticOddsFixturesActive = async (leagues, isLive, startDate = null, page = 1, timeout = 0) => {
  let urlQueryParams = `league=${leagues.join("&league=")}&is_live=${isLive}&page=${page}`;

  if (startDate) {
    const { startDateAfter, startDateBefore } = getStartDateBeforeAndAfter(startDate);
    urlQueryParams += `&start_date_after=${startDateAfter}&start_date_before=${startDateBefore}`;
  }

  const url = `${OPTIC_ODDS_API_FIXTURES_ACTIVE_URL}?${urlQueryParams}`;

  let fixturesResponseData = null;
  try {
    const fixturesResponse = await axios.get(url, { headers: OPTIC_ODDS_API_KEY_HEADER, timeout });
    fixturesResponseData = fixturesResponse.data;
  } catch (e) {
    logAllError(`Fetching Optic Odds fixtures/active error: ${e.message}`);
  }

  return fixturesResponseData;
};

module.exports = {
  mapOpticOddsApiFixtures,
  getStartDateBeforeAndAfter,
  fetchOpticOddsFixtures,
  fetchOpticOddsFixturesActive,
};
