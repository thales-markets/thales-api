const axios = require("axios");
const { OPTIC_ODDS_API_FIXTURES_URL, OPTIC_ODDS_API_KEY_HEADER } = require("../constants/opticOdds");

const fetchOpticOddsFixtures = async (league, startDate, page) => {
  let fixturesResponseData = null;

  const urlQueryParams = `league=${league}&start_date=${startDate}&page=${page}`;
  const url = `${OPTIC_ODDS_API_FIXTURES_URL}?${urlQueryParams}`; // TODO: fixtures or fixtures/active?
  try {
    const fixturesResponse = await axios.get(url, { headers: OPTIC_ODDS_API_KEY_HEADER });
    fixturesResponseData = fixturesResponse.data;
  } catch (e) {
    console.log(`Games info: Fetchng Optic Odds fixtures error: ${e.message}`);
  }

  return fixturesResponseData;
};

module.exports = {
  fetchOpticOddsFixtures,
};
