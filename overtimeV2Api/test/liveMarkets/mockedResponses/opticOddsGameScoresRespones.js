const nbaScoresResponse = {
  game_id: "77646-14251-2024-06-09",
  score_home_total: 105,
  score_away_total: 98,
  clock: null,
  sport: "basketball",
  league: "NBA",
  period: "3",
  status: "In progress",
  is_live: true,
  weather: null,
  capacity: "18624",
  away_team: "Chicago Bulls",
  home_team: "Miami Heat",
  last_play: "End of the Game",
  attendance: "19156",
  start_date: "2024-04-19T19:00:00-04:00",
  description: "Chicago Bulls vs Miami Heat",
  away_starter: null,
  home_starter: null,
  weather_temp: null,
  score_away_period_1: 28,
  score_away_period_2: 23,
  score_away_period_3: 23,
  score_away_period_4: 24,
  score_home_period_1: 25,
  score_home_period_2: 29,
  score_home_period_3: 29,
  score_home_period_4: 22,
  current_outs: null,
  runner_on_second: null,
  broadcast: "ABC",
  current_balls: null,
  venue_name: "TD Garden",
  current_down_and_distance: null,
  runner_on_first: null,
  runner_on_third: null,
  decision: null,
  decision_method: null,
  current_strikes: null,
  weather_temp_high: null,
  home_team_abb: "BOS",
  season_week: null,
  away_team_abb: "DAL",
  venue_location: "Boston, MA",
  current_possession: null,
  current_batter_name: null,
  away_team_name: "Mavericks",
  current_pitcher_name: null,
  home_team_name: "Celtics",
  duration: null,
  home_team_city: "Boston",
  season_year: "2023",
  away_team_city: "Dallas",
  season_type: "Postseason",
};

const mlbScoresResponse = {
  game_id: "39506-34048-2024-07-21-16",
  score_home_total: 9,
  score_away_total: 6,
  clock: null,
  sport: "baseball",
  league: "MLB",
  period: "9",
  status: "In progress",
  is_live: false,
  weather: null,
  capacity: "56000",
  away_team: "Boston Red Sox",
  home_team: "Los Angeles Dodgers",
  last_play: null,
  attendance: "50824",
  start_date: "2024-07-21T23:10:00+00:00",
  team_stats: {
    away_stats: {
      stat_rbi: 6,
      stat_hits: 9,
      stat_runs: 6,
      stat_at_bats: 36,
      stat_total_bases: 15,
      stat_double_plays: 0,
      stat_triple_plays: 0,
      stat_batting_walks: 6,
      stat_batting_strikeouts: 14,
      stat_runners_left_on_base: 10,
      stat_scoring_position_successes: 3,
      stat_scoring_position_opportunities: 14,
    },
    home_stats: {
      stat_rbi: 9,
      stat_hits: 10,
      stat_runs: 9,
      stat_at_bats: 34,
      stat_total_bases: 30,
      stat_double_plays: 1,
      stat_triple_plays: 0,
      stat_batting_walks: 1,
      stat_batting_strikeouts: 5,
      stat_runners_left_on_base: 2,
      stat_scoring_position_successes: 3,
      stat_scoring_position_opportunities: 4,
    },
  },
  description: "Boston Red Sox vs Los Angeles Dodgers",
  away_starter: "Kutter Crawford",
  current_outs: null,
  home_starter: "James Paxton",
  weather_temp: null,
  current_balls: null,
  current_strikes: null,
  runner_on_first: null,
  runner_on_third: null,
  runner_on_second: null,
  current_batter_name: null,
  score_away_period_1: 2,
  score_away_period_2: 0,
  score_away_period_3: 0,
  score_away_period_4: 0,
  score_away_period_5: 0,
  score_away_period_6: 1,
  score_away_period_7: 0,
  score_away_period_8: 0,
  score_away_period_9: 3,
  score_home_period_1: 2,
  score_home_period_2: 0,
  score_home_period_3: 1,
  score_home_period_4: 1,
  score_home_period_5: 2,
  score_home_period_6: 0,
  score_home_period_7: 0,
  score_home_period_8: 3,
  current_pitcher_name: null,
  decision: null,
  venue_name: "Dodger Stadium",
  current_possession: null,
  weather_temp_high: null,
  season_week: null,
  home_team_name: "Dodgers",
  home_team_city: "Los Angeles",
  decision_method: null,
  away_team_abb: "BOS",
  away_team_city: "Boston",
  current_down_and_distance: null,
  venue_location: "Los Angeles, CA",
  season_year: "2024",
  broadcast: "ESPN",
  away_team_name: "Red Sox",
  season_type: "Regular Season",
  duration: null,
  home_team_abb: "LAD",
};

const soccerScoresResponse = {
  game_id: "15535-22241-2024-07-06",
  score_home_total: 1,
  score_away_total: 1,
  clock: 83,
  sport: "soccer",
  league: "UEFA - European Championship",
  period: "None",
  status: "In progress",
  is_live: false,
  away_team: "Switzerland",
  home_team: "England",
  attendance: "46907",
  start_date: "2024-07-06T16:00:00+00:00",
  description: "England vs Switzerland",
  score_away_period_1: 0,
  score_away_period_2: 1,
  score_away_period_3: 0,
  score_away_period_4: 3,
  score_home_period_1: 0,
  score_home_period_2: 1,
  score_home_period_3: 0,
  score_home_period_4: 5,
  home_team_abb: "ENG",
  duration: null,
  capacity: null,
  current_batter_name: null,
  current_strikes: null,
  season_type: "Quarter-finals",
  runner_on_third: null,
  runner_on_first: null,
  current_possession: null,
  last_play: null,
  current_outs: null,
  decision: null,
  away_starter: null,
  weather_temp_high: null,
  away_team_city: null,
  current_pitcher_name: null,
  season_week: null,
  away_team_abb: "SUI",
  venue_location: null,
  venue_name: "Merkur Spiel-Arena",
  runner_on_second: null,
  current_balls: null,
  home_team_city: null,
  weather: null,
  decision_method: null,
  broadcast: null,
  season_year: "2024 Germany",
  home_starter: null,
  weather_temp: null,
  current_down_and_distance: null,
  away_team_name: null,
  home_team_name: null,
};

const soccerScoresHalftimeResponse = {
  game_id: "15535-22241-2024-07-06",
  score_home_total: 1,
  score_away_total: 1,
  clock: "-",
  sport: "soccer",
  league: "UEFA - European Championship",
  period: "HALF",
  status: "In progress",
  is_live: false,
  away_team: "Switzerland",
  home_team: "England",
  attendance: "46907",
  start_date: "2024-07-06T16:00:00+00:00",
  description: "England vs Switzerland",
  score_away_period_1: 0,
  score_away_period_2: 1,
  score_away_period_3: 0,
  score_away_period_4: 3,
  score_home_period_1: 0,
  score_home_period_2: 1,
  score_home_period_3: 0,
  score_home_period_4: 5,
  home_team_abb: "ENG",
  duration: null,
  capacity: null,
  current_batter_name: null,
  current_strikes: null,
  season_type: "Quarter-finals",
  runner_on_third: null,
  runner_on_first: null,
  current_possession: null,
  last_play: null,
  current_outs: null,
  decision: null,
  away_starter: null,
  weather_temp_high: null,
  away_team_city: null,
  current_pitcher_name: null,
  season_week: null,
  away_team_abb: "SUI",
  venue_location: null,
  venue_name: "Merkur Spiel-Arena",
  runner_on_second: null,
  current_balls: null,
  home_team_city: null,
  weather: null,
  decision_method: null,
  broadcast: null,
  season_year: "2024 Germany",
  home_starter: null,
  weather_temp: null,
  current_down_and_distance: null,
  away_team_name: null,
  home_team_name: null,
};

const tennisScoresATPResponse = {
  game_id: "42461-15533-2024-26",
  score_home_total: 1,
  score_away_total: 0,
  clock: null,
  sport: "tennis",
  league: "ATP",
  period: "2",
  status: "In progress",
  is_live: true,
  away_team: "Roberto Carballes Baena",
  home_team: "Gael Monfils",
  attendance: null,
  start_date: "2024-06-25T16:30:00+00:00",
  description: "Gael Monfils v Roberto Carballes Baena",
  score_away_period_1: 3,
  score_away_period_2: 4,
  score_home_period_1: 6,
  score_home_period_2: 5,
  current_batter_name: null,
  weather_temp_high: null,
  weather: null,
  decision_method: null,
  decision: null,
  away_team_name: null,
  broadcast: null,
  season_week: "1/16 final",
  away_team_abb: null,
  season_year: "ATP World Tour 2024",
  home_team_abb: null,
  current_pitcher_name: null,
  current_outs: null,
  season_type: "Mallorca Championships 2024",
  away_starter: null,
  runner_on_third: null,
  home_team_name: null,
  current_strikes: null,
  weather_temp: null,
  away_team_city: null,
  current_down_and_distance: null,
  current_balls: null,
  current_possession: null,
  duration: null,
  venue_name: null,
  last_play: null,
  runner_on_first: null,
  home_team_city: null,
  runner_on_second: null,
  venue_location: "Mallorca, Spain",
  capacity: null,
  home_starter: null,
};

const volleyballScoresResponseApprove = {
  game_id: "21396-35989-2024-06-21",
  score_home_total: 0,
  score_away_total: 2,
  clock: "00:00",
  sport: "volleyball",
  league: "FIVB - Nations League",
  period: "3",
  status: "In progress",
  is_live: false,
  duration: null,
  away_team: "Cuba",
  home_team: "Bulgaria",
  start_date: "2024-06-21T14:30:00+00:00",
  description: "Cuba vs Bulgaria",
  score_away_period_1: 25,
  score_away_period_2: 25,
  score_away_period_3: 19,
  score_home_period_1: 18,
  score_home_period_2: 20,
  score_home_period_3: 18,
  weather_temp: null,
  current_outs: null,
  broadcast: null,
  home_starter: null,
  home_team_name: null,
  decision_method: null,
  away_team_name: null,
  current_balls: null,
  current_batter_name: null,
  attendance: null,
  home_team_city: null,
  decision: null,
  away_starter: null,
  weather: null,
  runner_on_second: null,
  current_down_and_distance: null,
  away_team_abb: "CUB",
  season_week: "25",
  current_pitcher_name: null,
  home_team_abb: "BUL",
  current_strikes: null,
  weather_temp_high: null,
  season_type: null,
  capacity: null,
  season_year: "2024",
  venue_location: null,
  runner_on_third: null,
  runner_on_first: null,
  last_play: null,
  current_possession: null,
  venue_name: null,
  away_team_city: null,
};

const volleyballScoresResponseBlock = {
  game_id: "21396-35989-2024-06-21",
  score_home_total: 2,
  score_away_total: 2,
  clock: "00:00",
  sport: "volleyball",
  league: "FIVB - Nations League",
  period: "5",
  status: "In progress",
  is_live: false,
  duration: null,
  away_team: "Cuba",
  home_team: "Bulgaria",
  start_date: "2024-06-21T14:30:00+00:00",
  description: "Cuba vs Bulgaria",
  score_away_period_1: 25,
  score_away_period_2: 25,
  score_away_period_3: 25,
  score_away_period_4: 25,
  score_away_period_5: 13,
  score_home_period_1: 18,
  score_home_period_2: 20,
  score_home_period_3: 20,
  score_home_period_4: 20,
  score_home_period_5: 10,
  weather_temp: null,
  current_outs: null,
  broadcast: null,
  home_starter: null,
  home_team_name: null,
  decision_method: null,
  away_team_name: null,
  current_balls: null,
  current_batter_name: null,
  attendance: null,
  home_team_city: null,
  decision: null,
  away_starter: null,
  weather: null,
  runner_on_second: null,
  current_down_and_distance: null,
  away_team_abb: "CUB",
  season_week: "25",
  current_pitcher_name: null,
  home_team_abb: "BUL",
  current_strikes: null,
  weather_temp_high: null,
  season_type: null,
  capacity: null,
  season_year: "2024",
  venue_location: null,
  runner_on_third: null,
  runner_on_first: null,
  last_play: null,
  current_possession: null,
  venue_name: null,
  away_team_city: null,
};

module.exports = {
  nbaScoresResponse,
  mlbScoresResponse,
  soccerScoresResponse,
  soccerScoresHalftimeResponse,
  tennisScoresATPResponse,
  volleyballScoresResponseApprove,
  volleyballScoresResponseBlock,
};