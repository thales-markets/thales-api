const OPTIC_ODDS_API_BASE_URL_V3 = "https://api.opticodds.com/api/v3";

const OPTIC_ODDS_API_FIXTURES_URL = `${OPTIC_ODDS_API_BASE_URL_V3}/fixtures`;
const OPTIC_ODDS_API_FIXTURES_ACTIVE_URL = `${OPTIC_ODDS_API_BASE_URL_V3}/fixtures/active`;
const OPTIC_ODDS_API_FIXTURE_ODDS_URL = `${OPTIC_ODDS_API_BASE_URL_V3}/fixtures/odds`;
const OPTIC_ODDS_API_FIXTURES_RESULTS_URL = `${OPTIC_ODDS_API_BASE_URL_V3}/fixtures/results`;

const OPTIC_ODDS_API_ODDS_MAX_GAMES = 5;
const OPTIC_ODDS_API_RESULTS_MAX_GAMES = 25;

const OPTIC_ODDS_API_TIMEOUT = 3000; // 3s

const OPTIC_ODDS_API_KEY_HEADER = { "x-api-key": process.env.OPTIC_ODDS_API_KEY };

const MAX_NUMBER_OF_SCORE_PERIODS = 50;

const DATE_FORMAT_WITH_TIME_ZONE = "yyyy-MM-dd'T'HH:mm:ss'Z'";

module.exports = {
  OPTIC_ODDS_API_BASE_URL_V3,
  OPTIC_ODDS_API_FIXTURES_URL,
  OPTIC_ODDS_API_FIXTURES_ACTIVE_URL,
  OPTIC_ODDS_API_FIXTURE_ODDS_URL,
  OPTIC_ODDS_API_FIXTURES_RESULTS_URL,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_RESULTS_MAX_GAMES,
  OPTIC_ODDS_API_TIMEOUT,
  OPTIC_ODDS_API_KEY_HEADER,
  MAX_NUMBER_OF_SCORE_PERIODS,
  DATE_FORMAT_WITH_TIME_ZONE,
};
