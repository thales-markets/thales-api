const OPTIC_ODDS_API_BASE_URL = "https://api.opticodds.com/api/v2/";

const OPTIC_ODDS_API_GAMES_URL = OPTIC_ODDS_API_BASE_URL + "games?";
const OPTIC_ODDS_API_ODDS_URL = OPTIC_ODDS_API_BASE_URL + "game-odds?";
const OPTIC_ODDS_API_SCORES_URL = OPTIC_ODDS_API_BASE_URL + "scores?";

const OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS = OPTIC_ODDS_API_ODDS_URL + "odds_format=Decimal";

const OPTIC_ODDS_API_ODDS_MAX_GAMES = 5;
const OPTIC_ODDS_API_SCORES_MAX_GAMES = 25;

module.exports = {
  OPTIC_ODDS_API_GAMES_URL,
  OPTIC_ODDS_API_ODDS_URL,
  OPTIC_ODDS_API_SCORES_URL,
  OPTIC_ODDS_API_ODDS_URL_WITH_PARAMS,
  OPTIC_ODDS_API_ODDS_MAX_GAMES,
  OPTIC_ODDS_API_SCORES_MAX_GAMES,
};
