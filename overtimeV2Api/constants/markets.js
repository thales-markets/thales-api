const ResultType = {
  EXACT_POSITION: 1,
  OVER_UNDER: 2,
  COMBINED_POSITIONS: 3,
  SPREAD: 4,
};

const OverUnderType = {
  Over: 0,
  Under: 1,
};

const MarketType = {
  // Winner
  WINNER: 0,
  // Winner without draw
  DRAW_NO_BET: 10010,
  // Winner with draw - for hockey
  WINNER2: 10011,
  // Winner (placeholder)
  WINNER3: 10012,
  // Who will score first
  FIRST_SCORE: 10019,
  // Who will score last
  LAST_SCORE: 10020,
  // Clean sheet per team
  CLEAN_SHEET_HOME_TEAM: 10141,
  CLEAN_SHEET_AWAY_TEAM: 10142,
  // Winner period - half for soccer, quarter for basketball
  FIRST_PERIOD_WINNER: 10021,
  SECOND_PERIOD_WINNER: 10022,
  THIRD_PERIOD_WINNER: 10023,
  FOURTH_PERIOD_WINNER: 10024,
  FIFTH_PERIOD_WINNER: 10025,
  SIXTH_PERIOD_WINNER: 10026,
  SEVENTH_PERIOD_WINNER: 10027,
  EIGHTH_PERIOD_WINNER: 10028,
  NINTH_PERIOD_WINNER: 10029,
  // Winner period - half for basketball
  FIRST_PERIOD_WINNER2: 10051,
  SECOND_PERIOD_WINNER2: 10052,
  THIRD_PERIOD_WINNER2: 10053,
  FOURTH_PERIOD_WINNER2: 10054,
  FIFTH_PERIOD_WINNER2: 10055,
  SIXTH_PERIOD_WINNER2: 10056,
  SEVENTH_PERIOD_WINNER2: 10057,
  EIGHTH_PERIOD_WINNER2: 10058,
  NINTH_PERIOD_WINNER2: 10059,
  // Winner without draw period - half for soccer, quarter for basketball
  FIRST_PERIOD_DRAW_NO_BET: 10121,
  SECOND_PERIOD_DRAW_NO_BET: 10122,
  THIRD_PERIOD_DRAW_NO_BET: 10123,
  FOURTH_PERIOD_DRAW_NO_BET: 10124,

  // Spread (handicap)
  SPREAD: 10001,
  // Spread (handicap) - sets for tennis
  SPREAD2: 10013,
  // Spread period - half for soccer, quarter for basketball
  FIRST_PERIOD_SPREAD: 10041,
  SECOND_PERIOD_SPREAD: 10042,
  THIRD_PERIOD_SPREAD: 10043,
  FOURTH_PERIOD_SPREAD: 10044,
  FIFTH_PERIOD_SPREAD: 10045,
  SIXTH_PERIOD_SPREAD: 10046,
  SEVENTH_PERIOD_SPREAD: 10047,
  EIGHTH_PERIOD_SPREAD: 10048,
  NINTH_PERIOD_SPREAD: 10049,
  // Spread period - half for basketball
  FIRST_PERIOD_SPREAD2: 10071,
  SECOND_PERIOD_SPREAD2: 10072,
  THIRD_PERIOD_SPREAD2: 10073,
  FOURTH_PERIOD_SPREAD2: 10074,
  FIFTH_PERIOD_SPREAD2: 10075,
  SIXTH_PERIOD_SPREAD2: 10076,
  SEVENTH_PERIOD_SPREAD2: 10077,
  EIGHTH_PERIOD_SPREAD2: 10078,
  NINTH_PERIOD_SPREAD2: 10079,

  // Total
  TOTAL: 10002,
  // Total - sets for tennis
  TOTAL2: 10014,
  // Total period - half for soccer, quarter for basketball
  FIRST_PERIOD_TOTAL: 10031,
  SECOND_PERIOD_TOTAL: 10032,
  THIRD_PERIOD_TOTAL: 10033,
  FOURTH_PERIOD_TOTAL: 10034,
  FIFTH_PERIOD_TOTAL: 10035,
  SIXTH_PERIOD_TOTAL: 10036,
  SEVENTH_PERIOD_TOTAL: 10037,
  EIGHTH_PERIOD_TOTAL: 10038,
  NINTH_PERIOD_TOTAL: 10039,
  // Total period - half for basketball
  FIRST_PERIOD_TOTAL2: 10061,
  SECOND_PERIOD_TOTAL2: 10062,
  THIRD_PERIOD_TOTAL2: 10063,
  FOURTH_PERIOD_TOTAL2: 10064,
  FIFTH_PERIOD_TOTAL2: 10065,
  SIXTH_PERIOD_TOTAL2: 10066,
  SEVENTH_PERIOD_TOTAL2: 10067,
  EIGHTH_PERIOD_TOTAL2: 10068,
  NINTH_PERIOD_TOTAL2: 10069,
  // Total per team
  TOTAL_HOME_TEAM: 10017,
  TOTAL_AWAY_TEAM: 10018,
  // Total per team period - half for soccer
  FIRST_PERIOD_TOTAL_HOME_TEAM: 10111,
  FIRST_PERIOD_TOTAL_AWAY_TEAM: 10112,
  SECOND_PERIOD_TOTAL_HOME_TEAM: 10211,
  SECOND_PERIOD_TOTAL_AWAY_TEAM: 10212,
  // Total per team period - half for basketball
  FIRST_PERIOD_TOTAL2_HOME_TEAM: 10118,
  FIRST_PERIOD_TOTAL2_AWAY_TEAM: 10119,
  SECOND_PERIOD_TOTAL2_HOME_TEAM: 10218,
  SECOND_PERIOD_TOTAL2_AWAY_TEAM: 10219,

  // Total odd/even
  TOTAL_ODD_EVEN: 10005,
  // Total odd/even period - half for soccer, quarter for basketball
  FIRST_PERIOD_TOTAL_ODD_EVEN: 10081,
  SECOND_PERIOD_TOTAL_ODD_EVEN: 10082,
  THIRD_PERIOD_TOTAL_ODD_EVEN: 10083,
  FOURTH_PERIOD_TOTAL_ODD_EVEN: 10084,
  FIFTH_PERIOD_TOTAL_ODD_EVEN: 10085,
  SIXTH_PERIOD_TOTAL_ODD_EVEN: 10086,
  SEVENTH_PERIOD_TOTAL_ODD_EVEN: 10087,
  EIGHTH_PERIOD_TOTAL_ODD_EVEN: 10088,
  NINTH_PERIOD_TOTAL_ODD_EVEN: 10089,
  // Total odd/even period - half for basketball
  FIRST_PERIOD_TOTAL2_ODD_EVEN: 10091,
  SECOND_PERIOD_TOTAL2_ODD_EVEN: 10092,
  THIRD_PERIOD_TOTAL2_ODD_EVEN: 10093,
  FOURTH_PERIOD_TOTAL2_ODD_EVEN: 10094,
  FIFTH_PERIOD_TOTAL2_ODD_EVEN: 10095,
  SIXTH_PERIOD_TOTAL2_ODD_EVEN: 10096,
  SEVENTH_PERIOD_TOTAL2_ODD_EVEN: 10097,
  EIGHTH_PERIOD_TOTAL2_ODD_EVEN: 10098,
  NINTH_PERIOD_TOTAL2_ODD_EVEN: 10099,

  // Double chance
  DOUBLE_CHANCE: 10003,
  // Double chance period - half for soccer
  FIRST_PERIOD_DOUBLE_CHANCE: 10015,
  SECOND_PERIOD_DOUBLE_CHANCE: 10016,

  // Both teams to score
  BOTH_TEAMS_TO_SCORE: 10009,
  // Both teams to score period - half for soccer
  FIRST_PERIOD_BOTH_TEAMS_TO_SCORE: 10101,
  SECOND_PERIOD_BOTH_TEAMS_TO_SCORE: 10102,
  THIRD_PERIOD_BOTH_TEAMS_TO_SCORE: 10103,
  FOURTH_PERIOD_BOTH_TEAMS_TO_SCORE: 10104,
  FIFTH_PERIOD_BOTH_TEAMS_TO_SCORE: 10105,
  SIXTH_PERIOD_BOTH_TEAMS_TO_SCORE: 10106,
  SEVENTH_PERIOD_BOTH_TEAMS_TO_SCORE: 10107,
  EIGHTH_PERIOD_BOTH_TEAMS_TO_SCORE: 10108,
  NINTH_PERIOD_BOTH_TEAMS_TO_SCORE: 10109,

  // Combined positions
  WINNER_TOTAL: 10004,
  HALFTIME_FULLTIME: 10006,
  GOALS: 10007,
  HALFTIME_FULLTIME_GOALS: 10008,

  // Who will qualify for the next round
  WHO_WILL_QUALIFY: 10130,
  // Will there be overtime in the game
  WILL_THERE_BE_OVERTIME: 10131,
  // No runs in the first inning
  FIRST_INNING_NO_RUNS: 10132,

  // Player props
  PLAYER_PROPS_HOMERUNS: 11010,
  PLAYER_PROPS_BASES: 11011,
  PLAYER_PROPS_STRIKEOUTS: 11019,
  PLAYER_PROPS_PASSING_YARDS: 11051,
  PLAYER_PROPS_PASSING_TOUCHDOWNS: 11052,
  PLAYER_PROPS_RUSHING_YARDS: 11053,
  PLAYER_PROPS_RECEIVING_YARDS: 11057,
  PLAYER_PROPS_TOUCHDOWNS_SCORER: 11055,
  PLAYER_PROPS_FIELD_GOALS_MADE: 11060,
  PLAYER_PROPS_PITCHER_HITS_ALLOWED: 11047,
  PLAYER_PROPS_POINTS: 11029,
  PLAYER_PROPS_SHOTS: 11097,
  PLAYER_PROPS_GOALS: 11086,
  PLAYER_PROPS_HITS_RECORDED: 11012,
  PLAYER_PROPS_REBOUNDS: 11035,
  PLAYER_PROPS_ASSISTS: 11039,
  PLAYER_PROPS_DOUBLE_DOUBLE: 11087,
  PLAYER_PROPS_TRIPLE_DOUBLE: 11088,
  PLAYER_PROPS_RECEPTIONS: 11058,
  PLAYER_PROPS_FIRST_TOUCHDOWN: 11049,
  PLAYER_PROPS_LAST_TOUCHDOWN: 11056,
  PLAYER_PROPS_3PTS_MADE: 11038,
  PLAYER_PROPS_BLOCKS: 11098,
  PLAYER_PROPS_OVER_GOALS: 11100,

  PLAYER_PROPS_INTERCEPTIONS: 11202,
  PLAYER_PROPS_KICKING_POINTS: 11203,
  PLAYER_PROPS_PASSING_ATTEMPTS: 11204,
  PLAYER_PROPS_PASSING_COMPLETIONS: 11205,
  PLAYER_PROPS_TOUCHDOWNS: 11206,

  PLAYER_PROPS_SACKS: 11207,
  PLAYER_PROPS_PASSING_RUSHING: 11208,
  PLAYER_PROPS_RUSHING_RECEIVING: 11209,
  PLAYER_PROPS_LONGEST_RECEPTION: 11210,
  PLAYER_PROPS_EXTRA_POINTS: 11211,
  PLAYER_PROPS_TACKLES: 11212,

  PLAYER_PROPS_OUTS: 11213,
  PLAYER_PROPS_RBIS: 11214,
  PLAYER_PROPS_HITS_RUNS_RBIS: 11215,
  PLAYER_PROPS_EARNED_RUNS: 11216,
  PLAYER_PROPS_DOUBLES: 11217,
  PLAYER_PROPS_BATTING_WALKS: 11218,
  PLAYER_PROPS_BATTING_STRIKEOUTS: 11219,
  PLAYER_PROPS_SINGLES: 11220,
  PLAYER_PROPS_STOLEN_BASES: 11221,
  PLAYER_PROPS_RUNS: 11222,
  PLAYER_PROPS_WALKS: 11223,
  PLAYER_PROPS_POINTS_ASSISTS: 11225,
  PLAYER_PROPS_POINTS_REBOUNDS: 11226,
  PLAYER_PROPS_POINTS_REBOUNDS_ASSISTS: 11227,
  PLAYER_PROPS_REBOUNDS_ASSISTS: 11228,
  PLAYER_PROPS_STEALS: 11229,
  PLAYER_PROPS_STEALS_BLOCKS: 11230,

  PLAYER_PROPS_CARD_RECEIVER: 11234,
  PLAYER_PROPS_RED_CARD_RECEIVER: 11235,
  PLAYER_PROPS_FIRST_SCORER: 11236,
  PLAYER_PROPS_LAST_SCORER: 11237,
  PLAYER_PROPS_SHOTS_ON_TARGET: 11238,
  PLAYER_PROPS_TOTAL_SHOTS: 11239,

  // UFC market types
  WINNING_ROUND: 10151,
  GO_THE_DISTANCE: 10154,
  WILL_FIGHT_END_IN_FIRST_MINUTE: 10155,
  WILL_POINT_BE_DEDUCTED: 10156,
  ENDING_METHOD: 10157,
  METHOD_OF_VICTORY: 10158,
  // UFC player props market types
  PLAYER_PROPS_UFC_TAKEDOWNS_LANDED: 11200,
  PLAYER_PROPS_UFC_SIGNIFICANT_STRIKES_LANDED: 11201,

  // US election market types
  US_ELECTION_POPULAR_VOTE_WINNER: 10900,
  US_ELECTION_WINNING_PARTY: 10901,
  US_ELECTION_WINNING_PARTY_ARIZONA: 10902,
  US_ELECTION_WINNING_PARTY_GEORGIA: 10903,
  US_ELECTION_WINNING_PARTY_MICHIGAN: 10904,
  US_ELECTION_WINNING_PARTY_NEVADA: 10905,
  US_ELECTION_WINNING_PARTY_PENNSYLVANIA: 10906,
  US_ELECTION_WINNING_PARTY_WINSCONSIN: 10907,
  US_ELECTION_WINNING_PARTY_NORTH_CAROLINA: 10908,

  // Correct score
  CORRECT_SCORE: 10100,

  // Total exact per team
  TOTAL_EXACT_HOME_TEAM: 10143,
  TOTAL_EXACT_AWAY_TEAM: 10144,
  // Total exact per team - half for soccer
  FIRST_PERIOD_TOTAL_EXACT_HOME_TEAM: 10145,
  FIRST_PERIOD_TOTAL_EXACT_AWAY_TEAM: 10146,
  SECOND_PERIOD_TOTAL_EXACT_HOME_TEAM: 10147,
  SECOND_PERIOD_TOTAL_EXACT_AWAY_TEAM: 10148,

  // Futures
  LEAGUE_WINNER: 13001,
  MVP: 13002,
  CUP_WINNER: 13003,

  // Spread (handicap) corners
  SPREAD_CORNERS: 10221,
  // Total corners
  TOTAL_CORNERS: 10222,
  // Total corners per team
  TOTAL_CORNERS_HOME_TEAM: 10223,
  TOTAL_CORNERS_AWAY_TEAM: 10224,
  // Total corners odd/even
  TOTAL_CORNERS_ODD_EVEN: 10225,
  // Total corners period - half for soccer
  FIRST_PERIOD_TOTAL_CORNERS: 10226,
  SECOND_PERIOD_TOTAL_CORNERS: 10227,
  // Total corners per team period - half for soccer
  FIRST_PERIOD_TOTAL_CORNERS_HOME_TEAM: 10228,
  FIRST_PERIOD_TOTAL_CORNERS_AWAY_TEAM: 10229,
  SECOND_PERIOD_TOTAL_CORNERS_HOME_TEAM: 10230,
  SECOND_PERIOD_TOTAL_CORNERS_AWAY_TEAM: 10231,
  // Spread corners period - half for soccer
  FIRST_PERIOD_SPREAD_CORNERS: 10232,
  SECOND_PERIOD_SPREAD_CORNERS: 10233,
  // Most corners
  MOST_CORNERS: 10234,
  // Most corners period - half for soccer
  FIRST_PERIOD_MOST_CORNERS: 10235,
  SECOND_PERIOD_MOST_CORNERS: 10236,

  // Spread (handicap) cards
  SPREAD_CARDS: 10241,
  // Total cards
  TOTAL_CARDS: 10242,
  // Total cards per team
  TOTAL_CARDS_HOME_TEAM: 10243,
  TOTAL_CARDS_AWAY_TEAM: 10244,
  // Total red cards
  TOTA_RED_CARDS: 10245,
  // Most cards
  MOST_CARDS: 10246,
  //First/last card
  FIRST_CARD: 10247,
  LAST_CARD: 10248,
};

const MarketTypeMap = {
  // Winner
  [MarketType.WINNER]: {
    id: MarketType.WINNER,
    key: "winner",
    name: "Winner",
    resultType: ResultType.EXACT_POSITION,
  },
  // Winner without draw
  [MarketType.DRAW_NO_BET]: {
    id: MarketType.DRAW_NO_BET,
    key: "drawNoBet",
    name: "Draw no bet",
    resultType: ResultType.SPREAD,
  },
  // Winner with draw - for hockey
  [MarketType.WINNER2]: {
    id: MarketType.WINNER2,
    key: "winner2",
    name: "Winner",
    resultType: ResultType.EXACT_POSITION,
  },
  // Winner (placeholder)
  [MarketType.WINNER3]: {
    id: MarketType.WINNER3,
    key: "winner3",
    name: "Winner",
    resultType: ResultType.EXACT_POSITION,
  },
  // Who will score first
  [MarketType.FIRST_SCORE]: {
    id: MarketType.FIRST_SCORE,
    key: "firstScore",
    name: "First",
    resultType: ResultType.EXACT_POSITION,
  },
  // Who will score last
  [MarketType.LAST_SCORE]: {
    id: MarketType.LAST_SCORE,
    key: "lastScore",
    name: "Last",
    resultType: ResultType.EXACT_POSITION,
  },
  // Clean sheet per team
  [MarketType.CLEAN_SHEET_HOME_TEAM]: {
    id: MarketType.CLEAN_SHEET_HOME_TEAM,
    key: "cleanSheetHomeTeam",
    name: "Clean sheet",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.CLEAN_SHEET_AWAY_TEAM]: {
    id: MarketType.CLEAN_SHEET_AWAY_TEAM,
    key: "cleanSheetAwayTeam",
    name: "Clean sheet",
    resultType: ResultType.EXACT_POSITION,
  },
  // Winner period - half for soccer, quarter for basketball
  [MarketType.FIRST_PERIOD_WINNER]: {
    id: MarketType.FIRST_PERIOD_WINNER,
    key: "firstPeriodWinner",
    name: "Winner 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_WINNER]: {
    id: MarketType.SECOND_PERIOD_WINNER,
    key: "secondPeriodWinner",
    name: "Winner 2nd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.THIRD_PERIOD_WINNER]: {
    id: MarketType.THIRD_PERIOD_WINNER,
    key: "thirdPeriodWinner",
    name: "Winner 3rd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FOURTH_PERIOD_WINNER]: {
    id: MarketType.FOURTH_PERIOD_WINNER,
    key: "fourthPeriodWinner",
    name: "Winner 4th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FIFTH_PERIOD_WINNER]: {
    id: MarketType.FIFTH_PERIOD_WINNER,
    key: "fifthPeriodWinner",
    name: "Winner 5th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SIXTH_PERIOD_WINNER]: {
    id: MarketType.SIXTH_PERIOD_WINNER,
    key: "sixthPeriodWinner",
    name: "Winner 6th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SEVENTH_PERIOD_WINNER]: {
    id: MarketType.SEVENTH_PERIOD_WINNER,
    key: "seventhPeriodWinner",
    name: "Winner 7th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.EIGHTH_PERIOD_WINNER]: {
    id: MarketType.EIGHTH_PERIOD_WINNER,
    key: "eightPeriodWinner",
    name: "Winner 8th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.NINTH_PERIOD_WINNER]: {
    id: MarketType.NINTH_PERIOD_WINNER,
    key: "ninthPeriodWinner",
    name: "Winner 9th",
    resultType: ResultType.EXACT_POSITION,
  },
  // Winner period - half for basketball
  [MarketType.FIRST_PERIOD_WINNER2]: {
    id: MarketType.FIRST_PERIOD_WINNER2,
    key: "firstPeriodWinner2",
    name: "Winner 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_WINNER2]: {
    id: MarketType.SECOND_PERIOD_WINNER2,
    key: "secondPeriodWinner2",
    name: "Winner 2nd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.THIRD_PERIOD_WINNER2]: {
    id: MarketType.THIRD_PERIOD_WINNER2,
    key: "thirdPeriodWinner2",
    name: "Winner 3rd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FOURTH_PERIOD_WINNER2]: {
    id: MarketType.FOURTH_PERIOD_WINNER2,
    key: "fourthPeriodWinner2",
    name: "Winner 4th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FIFTH_PERIOD_WINNER2]: {
    id: MarketType.FIFTH_PERIOD_WINNER2,
    key: "fifthPeriodWinner2",
    name: "Winner 5th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SIXTH_PERIOD_WINNER2]: {
    id: MarketType.SIXTH_PERIOD_WINNER2,
    key: "sixthPeriodWinner2",
    name: "Winner 6th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SEVENTH_PERIOD_WINNER2]: {
    id: MarketType.SEVENTH_PERIOD_WINNER2,
    key: "seventhPeriodWinner2",
    name: "Winner 7th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.EIGHTH_PERIOD_WINNER2]: {
    id: MarketType.EIGHTH_PERIOD_WINNER2,
    key: "eightPeriodWinner2",
    name: "Winner 8th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.NINTH_PERIOD_WINNER2]: {
    id: MarketType.NINTH_PERIOD_WINNER2,
    key: "ninthPeriodWinner2",
    name: "Winner 9th",
    resultType: ResultType.EXACT_POSITION,
  },
  // Winner without draw period - half for soccer, quarter for basketball
  [MarketType.FIRST_PERIOD_DRAW_NO_BET]: {
    id: MarketType.FIRST_PERIOD_DRAW_NO_BET,
    key: "firstPeriodDrawNoBet",
    name: "Draw no bet 1st",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SECOND_PERIOD_DRAW_NO_BET]: {
    id: MarketType.SECOND_PERIOD_DRAW_NO_BET,
    key: "secondPeriodDrawNoBet",
    name: "Draw no bet 2nd",
    resultType: ResultType.SPREAD,
  },
  [MarketType.THIRD_PERIOD_DRAW_NO_BET]: {
    id: MarketType.THIRD_PERIOD_DRAW_NO_BET,
    key: "thirdPeriodDrawNoBet",
    name: "Draw no bet 3rd",
    resultType: ResultType.SPREAD,
  },
  [MarketType.FOURTH_PERIOD_DRAW_NO_BET]: {
    id: MarketType.FOURTH_PERIOD_DRAW_NO_BET,
    key: "fourthPeriodDrawNoBet",
    name: "Draw no bet 4th",
    resultType: ResultType.SPREAD,
  },

  // Spread (handicap)
  [MarketType.SPREAD]: {
    id: MarketType.SPREAD,
    key: "spread",
    name: "Handicap",
    resultType: ResultType.SPREAD,
  },
  // Spread (handicap) - sets for tennis
  [MarketType.SPREAD2]: {
    id: MarketType.SPREAD2,
    key: "spread2",
    name: "Handicap",
    resultType: ResultType.SPREAD,
  },
  // Spread period - half for soccer, quarter for basketball
  [MarketType.FIRST_PERIOD_SPREAD]: {
    id: MarketType.FIRST_PERIOD_SPREAD,
    key: "firstPeriodSpread",
    name: "Handicap 1st",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SECOND_PERIOD_SPREAD]: {
    id: MarketType.SECOND_PERIOD_SPREAD,
    key: "secondPeriodSpread",
    name: "Handicap 2nd",
    resultType: ResultType.SPREAD,
  },
  [MarketType.THIRD_PERIOD_SPREAD]: {
    id: MarketType.THIRD_PERIOD_SPREAD,
    key: "thirdPeriodSpread",
    name: "Handicap 3rd",
    resultType: ResultType.SPREAD,
  },
  [MarketType.FOURTH_PERIOD_SPREAD]: {
    id: MarketType.FOURTH_PERIOD_SPREAD,
    key: "fourthPeriodSpread",
    name: "Handicap 4th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.FIFTH_PERIOD_SPREAD]: {
    id: MarketType.FIFTH_PERIOD_SPREAD,
    key: "fifthPeriodSpread",
    name: "Handicap 5th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SIXTH_PERIOD_SPREAD]: {
    id: MarketType.SIXTH_PERIOD_SPREAD,
    key: "sixthPeriodSpread",
    name: "Handicap 6th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SEVENTH_PERIOD_SPREAD]: {
    id: MarketType.SEVENTH_PERIOD_SPREAD,
    key: "seventhPeriodSpread",
    name: "Handicap 7th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.EIGHTH_PERIOD_SPREAD]: {
    id: MarketType.EIGHTH_PERIOD_SPREAD,
    key: "eightPeriodSpread",
    name: "Handicap 8th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.NINTH_PERIOD_SPREAD]: {
    id: MarketType.NINTH_PERIOD_SPREAD,
    key: "ninthPeriodSpread",
    name: "Handicap 9th",
    resultType: ResultType.SPREAD,
  },
  // Spread period - half for basketball
  [MarketType.FIRST_PERIOD_SPREAD2]: {
    id: MarketType.FIRST_PERIOD_SPREAD2,
    key: "firstPeriodSpread2",
    name: "Handicap 1st",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SECOND_PERIOD_SPREAD2]: {
    id: MarketType.SECOND_PERIOD_SPREAD2,
    key: "secondPeriodSpread2",
    name: "Handicap 2nd",
    resultType: ResultType.SPREAD,
  },
  [MarketType.THIRD_PERIOD_SPREAD2]: {
    id: MarketType.THIRD_PERIOD_SPREAD2,
    key: "thirdPeriodSpread2",
    name: "Handicap 3rd",
    resultType: ResultType.SPREAD,
  },
  [MarketType.FOURTH_PERIOD_SPREAD2]: {
    id: MarketType.FOURTH_PERIOD_SPREAD2,
    key: "fourthPeriodSpread2",
    name: "Handicap 4th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.FIFTH_PERIOD_SPREAD2]: {
    id: MarketType.FIFTH_PERIOD_SPREAD2,
    key: "fifthPeriodSpread2",
    name: "Handicap 5th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SIXTH_PERIOD_SPREAD2]: {
    id: MarketType.SIXTH_PERIOD_SPREAD2,
    key: "sixthPeriodSpread2",
    name: "Handicap 6th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.SEVENTH_PERIOD_SPREAD2]: {
    id: MarketType.SEVENTH_PERIOD_SPREAD2,
    key: "seventhPeriodSpread2",
    name: "Handicap 7th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.EIGHTH_PERIOD_SPREAD2]: {
    id: MarketType.EIGHTH_PERIOD_SPREAD2,
    key: "eightPeriodSpread2",
    name: "Handicap 8th",
    resultType: ResultType.SPREAD,
  },
  [MarketType.NINTH_PERIOD_SPREAD2]: {
    id: MarketType.NINTH_PERIOD_SPREAD2,
    key: "ninthPeriodSpread2",
    name: "Handicap 9th",
    resultType: ResultType.SPREAD,
  },

  // Total
  [MarketType.TOTAL]: {
    id: MarketType.TOTAL,
    key: "total",
    name: "Total",
    resultType: ResultType.OVER_UNDER,
  },
  // Total - sets for tennis
  [MarketType.TOTAL2]: {
    id: MarketType.TOTAL2,
    key: "total2",
    name: "Total",
    resultType: ResultType.OVER_UNDER,
  },
  // Total period - half for soccer, quarter for basketball
  [MarketType.FIRST_PERIOD_TOTAL]: {
    id: MarketType.FIRST_PERIOD_TOTAL,
    key: "firstPeriodTotal",
    name: "Total 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL]: {
    id: MarketType.SECOND_PERIOD_TOTAL,
    key: "secondPeriodTotal",
    name: "Total 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.THIRD_PERIOD_TOTAL]: {
    id: MarketType.THIRD_PERIOD_TOTAL,
    key: "thirdPeriodTotal",
    name: "Total 3rd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FOURTH_PERIOD_TOTAL]: {
    id: MarketType.FOURTH_PERIOD_TOTAL,
    key: "fourthPeriodTotal",
    name: "Total 4th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FIFTH_PERIOD_TOTAL]: {
    id: MarketType.FIFTH_PERIOD_TOTAL,
    key: "fifthPeriodTotal",
    name: "Total 5th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SIXTH_PERIOD_TOTAL]: {
    id: MarketType.SIXTH_PERIOD_TOTAL,
    key: "sixthPeriodTotal",
    name: "Total 6th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SEVENTH_PERIOD_TOTAL]: {
    id: MarketType.SEVENTH_PERIOD_TOTAL,
    key: "seventhPeriodTotal",
    name: "Total 7th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.EIGHTH_PERIOD_TOTAL]: {
    id: MarketType.EIGHTH_PERIOD_TOTAL,
    key: "eightPeriodTotal",
    name: "Total 8th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.NINTH_PERIOD_TOTAL]: {
    id: MarketType.NINTH_PERIOD_TOTAL,
    key: "ninthPeriodTotal",
    name: "Total 9th",
    resultType: ResultType.OVER_UNDER,
  },
  // Total period - half for basketball
  [MarketType.FIRST_PERIOD_TOTAL2]: {
    id: MarketType.FIRST_PERIOD_TOTAL2,
    key: "firstPeriodTotal2",
    name: "Total 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL2]: {
    id: MarketType.SECOND_PERIOD_TOTAL2,
    key: "secondPeriodTotal",
    name: "Total 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.THIRD_PERIOD_TOTAL2]: {
    id: MarketType.THIRD_PERIOD_TOTAL2,
    key: "thirdPeriodTotal2",
    name: "Total 3rd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FOURTH_PERIOD_TOTAL2]: {
    id: MarketType.FOURTH_PERIOD_TOTAL2,
    key: "fourthPeriodTotal2",
    name: "Total 4th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FIFTH_PERIOD_TOTAL2]: {
    id: MarketType.FIFTH_PERIOD_TOTAL2,
    key: "fifthPeriodTotal2",
    name: "Total 5th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SIXTH_PERIOD_TOTAL2]: {
    id: MarketType.SIXTH_PERIOD_TOTAL2,
    key: "sixthPeriodTotal2",
    name: "Total 6th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SEVENTH_PERIOD_TOTAL2]: {
    id: MarketType.SEVENTH_PERIOD_TOTAL2,
    key: "seventhPeriodTotal2",
    name: "Total 7th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.EIGHTH_PERIOD_TOTAL2]: {
    id: MarketType.EIGHTH_PERIOD_TOTAL2,
    key: "eightPeriodTotal2",
    name: "Total 8th",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.NINTH_PERIOD_TOTAL2]: {
    id: MarketType.NINTH_PERIOD_TOTAL2,
    key: "ninthPeriodTotal2",
    name: "Total 9th",
    resultType: ResultType.OVER_UNDER,
  },
  // Total per team
  [MarketType.TOTAL_HOME_TEAM]: {
    id: MarketType.TOTAL_HOME_TEAM,
    key: "totalHomeTeam",
    name: "Total",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.TOTAL_AWAY_TEAM]: {
    id: MarketType.TOTAL_AWAY_TEAM,
    key: "totalAwayTeam",
    name: "Total",
    resultType: ResultType.OVER_UNDER,
  },
  // Total per team period - half for soccer
  [MarketType.FIRST_PERIOD_TOTAL_HOME_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL_HOME_TEAM,
    key: "firstPeriodTotalHomeTeam",
    name: "Total 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FIRST_PERIOD_TOTAL_AWAY_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL_AWAY_TEAM,
    key: "firstPeriodTotalAwayTeam",
    name: "Total 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL_HOME_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL_HOME_TEAM,
    key: "secondPeriodTotalHomeTeam",
    name: "Total 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL_AWAY_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL_AWAY_TEAM,
    key: "secondPeriodTotalAwayTeam",
    name: "Total 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  // Total per team period - half for basketball
  [MarketType.FIRST_PERIOD_TOTAL2_HOME_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL2_HOME_TEAM,
    key: "firstPeriodTotal2HomeTeam",
    name: "Total 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FIRST_PERIOD_TOTAL2_AWAY_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL2_AWAY_TEAM,
    key: "firstPeriodTotal2AwayTeam",
    name: "Total 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL2_HOME_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL2_HOME_TEAM,
    key: "secondPeriodTotal2HomeTeam",
    name: "Total 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL2_AWAY_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL2_AWAY_TEAM,
    key: "secondPeriodTotal2AwayTeam",
    name: "Total 2nd",
    resultType: ResultType.OVER_UNDER,
  },

  // Total odd/even
  [MarketType.TOTAL_ODD_EVEN]: {
    id: MarketType.TOTAL_ODD_EVEN,
    key: "totalOddEven",
    name: "Total odd/even",
    resultType: ResultType.EXACT_POSITION,
  },
  // Total odd/even period - half for soccer, quarter for basketball
  [MarketType.FIRST_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.FIRST_PERIOD_TOTAL_ODD_EVEN,
    key: "firstPeriodTotalOddEven",
    name: "Total odd/even 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.SECOND_PERIOD_TOTAL_ODD_EVEN,
    key: "secondPeriodTotalOddEven",
    name: "Total odd/even 2nd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.THIRD_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.THIRD_PERIOD_TOTAL_ODD_EVEN,
    key: "thirdPeriodTotalOddEven",
    name: "Total odd/even 3rd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FOURTH_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.FOURTH_PERIOD_TOTAL_ODD_EVEN,
    key: "fourthPeriodTotalOddEven",
    name: "Total odd/even 4th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FIFTH_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.FIFTH_PERIOD_TOTAL_ODD_EVEN,
    key: "fifthPeriodTotalOddEven",
    name: "Total odd/even 5th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SIXTH_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.SIXTH_PERIOD_TOTAL_ODD_EVEN,
    key: "sixthPeriodTotalOddEven",
    name: "Total odd/even 6th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SEVENTH_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.SEVENTH_PERIOD_TOTAL_ODD_EVEN,
    key: "seventhPeriodTotalOddEven",
    name: "Total odd/even 7th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.EIGHTH_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.EIGHTH_PERIOD_TOTAL_ODD_EVEN,
    key: "eightPeriodTotalOddEven",
    name: "Total odd/even 8th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.NINTH_PERIOD_TOTAL_ODD_EVEN]: {
    id: MarketType.NINTH_PERIOD_TOTAL_ODD_EVEN,
    key: "ninthPeriodTotalOddEven",
    name: "Total odd/even 9th",
    resultType: ResultType.EXACT_POSITION,
  },
  // Total odd/even period - half for basketball
  [MarketType.FIRST_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.FIRST_PERIOD_TOTAL2_ODD_EVEN,
    key: "firstPeriodTotal2OddEven",
    name: "Total odd/even 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.SECOND_PERIOD_TOTAL2_ODD_EVEN,
    key: "secondPeriodTotal2OddEven",
    name: "Total odd/even 2nd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.THIRD_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.THIRD_PERIOD_TOTAL2_ODD_EVEN,
    key: "thirdPeriodTotal2OddEven",
    name: "Total odd/even 3rd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FOURTH_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.FOURTH_PERIOD_TOTAL2_ODD_EVEN,
    key: "fourthPeriodTotal2OddEven",
    name: "Total odd/even 4th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FIFTH_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.FIFTH_PERIOD_TOTAL2_ODD_EVEN,
    key: "fifthPeriodTotal2OddEven",
    name: "Total odd/even 5th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SIXTH_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.SIXTH_PERIOD_TOTAL2_ODD_EVEN,
    key: "sixthPeriodTotal2OddEven",
    name: "Total odd/even 6th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SEVENTH_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.SEVENTH_PERIOD_TOTAL2_ODD_EVEN,
    key: "seventhPeriodTotal2OddEven",
    name: "Total odd/even 7th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.EIGHTH_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.EIGHTH_PERIOD_TOTAL2_ODD_EVEN,
    key: "eightPeriodTotal2OddEven",
    name: "Total odd/even 8th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.NINTH_PERIOD_TOTAL2_ODD_EVEN]: {
    id: MarketType.NINTH_PERIOD_TOTAL2_ODD_EVEN,
    key: "ninthPeriodTotal2OddEven",
    name: "Total odd/even 9th",
    resultType: ResultType.EXACT_POSITION,
  },

  // Double chance
  [MarketType.DOUBLE_CHANCE]: {
    id: MarketType.DOUBLE_CHANCE,
    key: "doubleChance",
    name: "Double chance",
    resultType: ResultType.EXACT_POSITION,
  },
  // Double chance period - half for soccer
  [MarketType.FIRST_PERIOD_DOUBLE_CHANCE]: {
    id: MarketType.FIRST_PERIOD_DOUBLE_CHANCE,
    key: "firstPeriodDoubleChance",
    name: "Double chance 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_DOUBLE_CHANCE]: {
    id: MarketType.SECOND_PERIOD_DOUBLE_CHANCE,
    key: "secondPeriodDoubleChance",
    name: "Double chance 2nd",
    resultType: ResultType.EXACT_POSITION,
  },

  // Both teams to score
  [MarketType.BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.BOTH_TEAMS_TO_SCORE,
    key: "bothTeamsToScore",
    name: "Both teams to score",
    resultType: ResultType.EXACT_POSITION,
  },
  // Both teams to score period - half for soccer
  [MarketType.FIRST_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.FIRST_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "firstPeriodBothTeamsToScore",
    name: "Both teams to score 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.SECOND_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "secondPeriodBothTeamsToScore",
    name: "Both teams to score 2nd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.THIRD_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.THIRD_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "thirdPeriodBothTeamsToScore",
    name: "Both teams to score 3rd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FOURTH_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.FOURTH_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "fourthPeriodBothTeamsToScore",
    name: "Both teams to score 4th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FIFTH_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.FIFTH_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "fifthPeriodBothTeamsToScore",
    name: "Both teams to score 5th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SIXTH_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.SIXTH_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "sixthPeriodBothTeamsToScore",
    name: "Both teams to score 6th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SEVENTH_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.SEVENTH_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "seventhPeriodBothTeamsToScore",
    name: "Both teams to score 7th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.EIGHTH_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.EIGHTH_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "eightPeriodBothTeamsToScore",
    name: "Both teams to score 8th",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.NINTH_PERIOD_BOTH_TEAMS_TO_SCORE]: {
    id: MarketType.NINTH_PERIOD_BOTH_TEAMS_TO_SCORE,
    key: "ninthPeriodBothTeamsToScore",
    name: "Both teams to score 9th",
    resultType: ResultType.EXACT_POSITION,
  },

  // Combined positions
  [MarketType.WINNER_TOTAL]: {
    id: MarketType.WINNER_TOTAL,
    key: "winnerTotal",
    name: "Winner + Total",
    resultType: ResultType.COMBINED_POSITIONS,
  },
  [MarketType.HALFTIME_FULLTIME]: {
    id: MarketType.HALFTIME_FULLTIME,
    key: "halftimeFulltime",
    name: "Half-time/Full-time",
    resultType: ResultType.COMBINED_POSITIONS,
  },
  [MarketType.GOALS]: {
    id: MarketType.GOALS,
    key: "goals",
    name: "Goals",
    resultType: ResultType.COMBINED_POSITIONS,
  },
  [MarketType.HALFTIME_FULLTIME_GOALS]: {
    id: MarketType.HALFTIME_FULLTIME_GOALS,
    key: "halftimeFulltimeGoals",
    name: "Half-time/Full-time + Goals",
    resultType: ResultType.COMBINED_POSITIONS,
  },

  // Who will qualify for the next round
  [MarketType.WHO_WILL_QUALIFY]: {
    id: MarketType.WHO_WILL_QUALIFY,
    key: "whoWillQualify",
    name: "Who will qualify for the next round",
    resultType: ResultType.EXACT_POSITION,
  },
  // Will there be overtime in the game
  [MarketType.WILL_THERE_BE_OVERTIME]: {
    id: MarketType.WILL_THERE_BE_OVERTIME,
    key: "willThereBeOvertime",
    name: "Overtime",
    description: "Will there be overtime in the game",
    resultType: ResultType.EXACT_POSITION,
  },
  // No runs in the first inning
  [MarketType.FIRST_INNING_NO_RUNS]: {
    id: MarketType.FIRST_INNING_NO_RUNS,
    key: "firstInningNoRuns",
    name: "No runs in the first inning",
    resultType: ResultType.EXACT_POSITION,
  },

  // Player props
  [MarketType.PLAYER_PROPS_STRIKEOUTS]: {
    id: MarketType.PLAYER_PROPS_STRIKEOUTS,
    key: "strikeouts",
    name: "Strikeouts",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_HOMERUNS]: {
    id: MarketType.PLAYER_PROPS_HOMERUNS,
    key: "homeruns",
    name: "Home runs",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_BASES]: {
    id: MarketType.PLAYER_PROPS_BASES,
    key: "bases",
    name: "Bases",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_PASSING_YARDS]: {
    id: MarketType.PLAYER_PROPS_PASSING_YARDS,
    key: "passingYards",
    name: "Passing yards",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_PASSING_TOUCHDOWNS]: {
    id: MarketType.PLAYER_PROPS_PASSING_TOUCHDOWNS,
    key: "passingTouchdowns",
    name: "Passing touchdowns",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RUSHING_YARDS]: {
    id: MarketType.PLAYER_PROPS_RUSHING_YARDS,
    key: "rushingYards",
    name: "Rushing yards",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RECEIVING_YARDS]: {
    id: MarketType.PLAYER_PROPS_RECEIVING_YARDS,
    key: "receivingYards",
    name: "Receiving yards",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_TOUCHDOWNS_SCORER]: {
    id: MarketType.PLAYER_PROPS_TOUCHDOWNS_SCORER,
    key: "touchdowns",
    name: "Scoring touchdown",
    description: "Who will score a touchdown in the game?",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_FIELD_GOALS_MADE]: {
    id: MarketType.PLAYER_PROPS_FIELD_GOALS_MADE,
    key: "fieldGoalsMade",
    name: "Field goals made",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_PITCHER_HITS_ALLOWED]: {
    id: MarketType.PLAYER_PROPS_PITCHER_HITS_ALLOWED,
    key: "pitcherHitsAllowed",
    name: "Pitcher hits allowed",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_POINTS]: {
    id: MarketType.PLAYER_PROPS_POINTS,
    key: "points",
    name: "Points",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_SHOTS]: {
    id: MarketType.PLAYER_PROPS_SHOTS,
    key: "shots",
    name: "Shots",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_GOALS]: {
    id: MarketType.PLAYER_PROPS_GOALS,
    key: "goals",
    name: "Goals",
    description: "Who will score a goal in the game?",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_HITS_RECORDED]: {
    id: MarketType.PLAYER_PROPS_HITS_RECORDED,
    key: "hitsRecorded",
    name: "Hits recorded",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_REBOUNDS]: {
    id: MarketType.PLAYER_PROPS_REBOUNDS,
    key: "rebounds",
    name: "Rebounds",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_ASSISTS]: {
    id: MarketType.PLAYER_PROPS_ASSISTS,
    key: "assists",
    name: "Assists",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_DOUBLE_DOUBLE]: {
    id: MarketType.PLAYER_PROPS_DOUBLE_DOUBLE,
    key: "doubleDouble",
    name: "Double double",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_TRIPLE_DOUBLE]: {
    id: MarketType.PLAYER_PROPS_TRIPLE_DOUBLE,
    key: "tripleDouble",
    name: "Triple double",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RECEPTIONS]: {
    id: MarketType.PLAYER_PROPS_RECEPTIONS,
    key: "receptions",
    name: "Receptions",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_FIRST_TOUCHDOWN]: {
    id: MarketType.PLAYER_PROPS_FIRST_TOUCHDOWN,
    key: "firstTouchdown",
    name: "First touchdown",
    description: "Who will score the first touchdown in the game? (incl. OT)",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_LAST_TOUCHDOWN]: {
    id: MarketType.PLAYER_PROPS_LAST_TOUCHDOWN,
    key: "lastTouchdown",
    name: "Last touchdown",
    description: "Who will score the last touchdown in the game?",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_3PTS_MADE]: {
    id: MarketType.PLAYER_PROPS_3PTS_MADE,
    key: "threePointsMade",
    name: "3-points made",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_BLOCKS]: {
    id: MarketType.PLAYER_PROPS_BLOCKS,
    key: "blocks",
    name: "Blcoks",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_OVER_GOALS]: {
    id: MarketType.PLAYER_PROPS_OVER_GOALS,
    key: "overGoals",
    name: "Over goals",
    description: "How many goals will player score?",
    resultType: ResultType.OVER_UNDER,
  },

  [MarketType.PLAYER_PROPS_INTERCEPTIONS]: {
    id: MarketType.PLAYER_PROPS_INTERCEPTIONS,
    key: "interceptions",
    name: "Interceptions",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_KICKING_POINTS]: {
    id: MarketType.PLAYER_PROPS_KICKING_POINTS,
    key: "KickingPoints",
    name: "Kicking points",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_PASSING_ATTEMPTS]: {
    id: MarketType.PLAYER_PROPS_PASSING_ATTEMPTS,
    key: "passingAttempts",
    name: "Passing attempts",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_PASSING_COMPLETIONS]: {
    id: MarketType.PLAYER_PROPS_PASSING_COMPLETIONS,
    key: "passingCompletions",
    name: "Passing completions",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_TOUCHDOWNS]: {
    id: MarketType.PLAYER_PROPS_TOUCHDOWNS,
    key: "totalTouchdowns", // TODO: new
    name: "Touchdowns", // TODO: new
    resultType: ResultType.OVER_UNDER,
  },

  [MarketType.PLAYER_PROPS_SACKS]: {
    id: MarketType.PLAYER_PROPS_SACKS,
    key: "sacks",
    name: "Sacks",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_PASSING_RUSHING]: {
    id: MarketType.PLAYER_PROPS_PASSING_RUSHING,
    key: "passingAndRushing",
    name: "Passing + Rushing Yards",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RUSHING_RECEIVING]: {
    id: MarketType.PLAYER_PROPS_RUSHING_RECEIVING,
    key: "rushingAndReceiving",
    name: "Rushing + Receiving Yards",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_LONGEST_RECEPTION]: {
    id: MarketType.PLAYER_PROPS_LONGEST_RECEPTION,
    key: "longestReception",
    name: "Longest reception",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_EXTRA_POINTS]: {
    id: MarketType.PLAYER_PROPS_EXTRA_POINTS,
    key: "extraPoints",
    name: "Extra points",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_TACKLES]: {
    id: MarketType.PLAYER_PROPS_TACKLES,
    key: "tackles",
    name: "Tackles",
    resultType: ResultType.OVER_UNDER,
  },

  [MarketType.PLAYER_PROPS_OUTS]: {
    id: MarketType.PLAYER_PROPS_OUTS,
    key: "outs",
    name: "Outs recorded",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RBIS]: {
    id: MarketType.PLAYER_PROPS_RBIS,
    key: "rbis",
    name: "RBIs O/U",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_HITS_RUNS_RBIS]: {
    id: MarketType.PLAYER_PROPS_HITS_RUNS_RBIS,
    key: "hitsRunsRbis",
    name: "Hits + Runs + RBIs",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_EARNED_RUNS]: {
    id: MarketType.PLAYER_PROPS_EARNED_RUNS,
    key: "earnedRuns",
    name: "Earned runs allowed",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_DOUBLES]: {
    id: MarketType.PLAYER_PROPS_DOUBLES,
    key: "doubles",
    name: "Doubles",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_BATTING_WALKS]: {
    id: MarketType.PLAYER_PROPS_BATTING_WALKS,
    key: "battingWalks",
    name: "Walks",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_BATTING_STRIKEOUTS]: {
    id: MarketType.PLAYER_PROPS_BATTING_STRIKEOUTS,
    key: "battingStrikeouts",
    name: "Strikeouts",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_SINGLES]: {
    id: MarketType.PLAYER_PROPS_SINGLES,
    key: "singles",
    name: "Singles",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_STOLEN_BASES]: {
    id: MarketType.PLAYER_PROPS_STOLEN_BASES,
    key: "stolenBases",
    name: "Stolen bases",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RUNS]: {
    id: MarketType.PLAYER_PROPS_RUNS,
    key: "runsScored",
    name: "Runs scored",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_WALKS]: {
    id: MarketType.PLAYER_PROPS_WALKS,
    key: "walksAllowed",
    name: "Walks allowed",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_POINTS_ASSISTS]: {
    id: MarketType.PLAYER_PROPS_POINTS_ASSISTS,
    key: "pointsAssists",
    name: "Points + Assists",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_POINTS_REBOUNDS]: {
    id: MarketType.PLAYER_PROPS_POINTS_REBOUNDS,
    key: "pointsRebound",
    name: "Points + Rebounds",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_POINTS_REBOUNDS_ASSISTS]: {
    id: MarketType.PLAYER_PROPS_POINTS_REBOUNDS_ASSISTS,
    key: "pointsReboundsAssists",
    name: "Points + Rebounds + Assists",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_REBOUNDS_ASSISTS]: {
    id: MarketType.PLAYER_PROPS_REBOUNDS_ASSISTS,
    key: "reboundsAssists",
    name: "Rebounds + Assists",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_STEALS]: {
    id: MarketType.PLAYER_PROPS_STEALS,
    key: "steals",
    name: "Steals",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_STEALS_BLOCKS]: {
    id: MarketType.PLAYER_PROPS_STEALS_BLOCKS,
    key: "stealsBlocks",
    name: "Steals + Blocks",
    resultType: ResultType.OVER_UNDER,
  },

  [MarketType.PLAYER_PROPS_CARD_RECEIVER]: {
    id: MarketType.PLAYER_PROPS_CARD_RECEIVER,
    key: "cardReceiver",
    name: "Card receiver",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_RED_CARD_RECEIVER]: {
    id: MarketType.PLAYER_PROPS_RED_CARD_RECEIVER,
    key: "redCardReceiver",
    name: "Red card receiver",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_FIRST_SCORER]: {
    id: MarketType.PLAYER_PROPS_FIRST_SCORER,
    key: "firstScorer",
    name: "First scorer",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_LAST_SCORER]: {
    id: MarketType.PLAYER_PROPS_LAST_SCORER,
    key: "lastScorer",
    name: "Last scorer",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_SHOTS_ON_TARGET]: {
    id: MarketType.PLAYER_PROPS_SHOTS_ON_TARGET,
    key: "shotsOnTarget",
    name: "Shots on target",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_TOTAL_SHOTS]: {
    id: MarketType.PLAYER_PROPS_TOTAL_SHOTS,
    key: "shots",
    name: "Shots",
    resultType: ResultType.OVER_UNDER,
  },

  // UFC market types
  [MarketType.WINNING_ROUND]: {
    id: MarketType.WINNING_ROUND,
    key: "winningRound",
    name: "Winning round",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.GO_THE_DISTANCE]: {
    id: MarketType.GO_THE_DISTANCE,
    key: "goTheDistance",
    name: "Go the distance",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.WILL_FIGHT_END_IN_FIRST_MINUTE]: {
    id: MarketType.WILL_FIGHT_END_IN_FIRST_MINUTE,
    key: "willFightEndInFirstMinute",
    name: "First minute finish",
    description: "Will the fight end in the first minute",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.WILL_POINT_BE_DEDUCTED]: {
    id: MarketType.WILL_POINT_BE_DEDUCTED,
    key: "willPointBeDeducted",
    name: "Point to be deducted",
    description: "Will point be deducted",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.ENDING_METHOD]: {
    id: MarketType.ENDING_METHOD,
    key: "endingMethod",
    name: "Ending method",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.METHOD_OF_VICTORY]: {
    id: MarketType.METHOD_OF_VICTORY,
    key: "methodOfVictory",
    name: "Method of victory",
    resultType: ResultType.EXACT_POSITION,
  },
  // UFC player props market types
  [MarketType.PLAYER_PROPS_UFC_TAKEDOWNS_LANDED]: {
    id: MarketType.PLAYER_PROPS_UFC_TAKEDOWNS_LANDED,
    key: "takedownsLanded",
    name: "Takedowns landed",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.PLAYER_PROPS_UFC_SIGNIFICANT_STRIKES_LANDED]: {
    id: MarketType.PLAYER_PROPS_UFC_SIGNIFICANT_STRIKES_LANDED,
    key: "significantStrikesLanded",
    name: "Significant strikes landed",
    resultType: ResultType.OVER_UNDER,
  },

  // US election market types
  [MarketType.US_ELECTION_POPULAR_VOTE_WINNER]: {
    id: MarketType.US_ELECTION_POPULAR_VOTE_WINNER,
    key: "popularVoteWinner",
    name: "Popular vote winner",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY]: {
    id: MarketType.US_ELECTION_WINNING_PARTY,
    key: "winningParty",
    name: "Winning party",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_ARIZONA]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_ARIZONA,
    key: "winningPartyArizona",
    name: "Winning party Arizona",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_GEORGIA]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_GEORGIA,
    key: "winningPartyGeorgia",
    name: "Winning party Georgia",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_MICHIGAN]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_MICHIGAN,
    key: "winningPartyMichigan",
    name: "Winning party Michigan",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_NEVADA]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_NEVADA,
    key: "winningPartyNevada",
    name: "Winning party Nevada",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_PENNSYLVANIA]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_PENNSYLVANIA,
    key: "winningPartyPennsylvania",
    name: "Winning party Pennsylvania",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_WINSCONSIN]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_WINSCONSIN,
    key: "winningPartyWinsconsin",
    name: "Winning party Winsconsin",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.US_ELECTION_WINNING_PARTY_NORTH_CAROLINA]: {
    id: MarketType.US_ELECTION_WINNING_PARTY_NORTH_CAROLINA,
    key: "winningPartyNorthCarolina",
    name: "Winning party North Carolina",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.CORRECT_SCORE]: {
    id: MarketType.CORRECT_SCORE,
    key: "correctScore",
    name: "Correct score",
    resultType: ResultType.EXACT_POSITION,
  },

  // Total exact per team
  [MarketType.TOTAL_EXACT_HOME_TEAM]: {
    id: MarketType.TOTAL_EXACT_HOME_TEAM,
    key: "exactTotalHomeTeam",
    name: "Exact total",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.TOTAL_EXACT_AWAY_TEAM]: {
    id: MarketType.TOTAL_EXACT_AWAY_TEAM,
    key: "exactTotalAwayTeam",
    name: "Exact total",
    resultType: ResultType.EXACT_POSITION,
  },

  // Total exact per team - half for soccer
  [MarketType.FIRST_PERIOD_TOTAL_EXACT_HOME_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL_EXACT_HOME_TEAM,
    key: "firstPeriodExactTotalHomeTeam",
    name: "Exact total 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.FIRST_PERIOD_TOTAL_EXACT_AWAY_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL_EXACT_AWAY_TEAM,
    key: "firstPeriodExactTotalAwayTeam",
    name: "Exact total 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_TOTAL_EXACT_HOME_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL_EXACT_HOME_TEAM,
    key: "secondPeriodExactTotalHomeTeam",
    name: "Exact total 2nd",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_TOTAL_EXACT_AWAY_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL_EXACT_AWAY_TEAM,
    key: "secondPeriodExactTotalAwayTeam",
    name: "Exact total 2nd",
    resultType: ResultType.EXACT_POSITION,
  },

  // Futures
  [MarketType.LEAGUE_WINNER]: {
    id: MarketType.LEAGUE_WINNER,
    key: "leagueWinner",
    name: "Champion",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.MVP]: {
    id: MarketType.MVP,
    key: "mvp",
    name: "MVP",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.CUP_WINNER]: {
    id: MarketType.CUP_WINNER,
    key: "cupWinner",
    name: "Cup winner",
    resultType: ResultType.EXACT_POSITION,
  },

  // Spread (handicap) corners
  [MarketType.SPREAD_CORNERS]: {
    id: MarketType.SPREAD_CORNERS,
    key: "spreadCorners",
    name: "Handicap corners",
    resultType: ResultType.SPREAD,
  },
  // Total corners
  [MarketType.TOTAL_CORNERS]: {
    id: MarketType.TOTAL_CORNERS,
    key: "totalCorners",
    name: "Total corners",
    resultType: ResultType.OVER_UNDER,
  },
  // Total corners per team
  [MarketType.TOTAL_CORNERS_HOME_TEAM]: {
    id: MarketType.TOTAL_CORNERS_HOME_TEAM,
    key: "totalCornersHomeTeam",
    name: "Total corners",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.TOTAL_CORNERS_AWAY_TEAM]: {
    id: MarketType.TOTAL_CORNERS_AWAY_TEAM,
    key: "totalCornersAwayTeam",
    name: "Total corners",
    resultType: ResultType.OVER_UNDER,
  },
  // Total corners odd/even
  [MarketType.TOTAL_CORNERS_ODD_EVEN]: {
    id: MarketType.TOTAL_CORNERS_ODD_EVEN,
    key: "totalCornersOddEven",
    name: "Total corners odd/even",
    resultType: ResultType.EXACT_POSITION,
  },
  // Total corners period - half for soccer
  [MarketType.FIRST_PERIOD_TOTAL_CORNERS]: {
    id: MarketType.FIRST_PERIOD_TOTAL_CORNERS,
    key: "firstPeriodTotalCorners",
    name: "Total corners 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL_CORNERS]: {
    id: MarketType.SECOND_PERIOD_TOTAL_CORNERS,
    key: "secondPeriodTotalCorners",
    name: "Total corners 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  // Total corners per team period - half for soccer
  [MarketType.FIRST_PERIOD_TOTAL_CORNERS_HOME_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL_CORNERS_HOME_TEAM,
    key: "firstPeriodTotalCornersHomeTeam",
    name: "Total corners 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.FIRST_PERIOD_TOTAL_CORNERS_AWAY_TEAM]: {
    id: MarketType.FIRST_PERIOD_TOTAL_CORNERS_AWAY_TEAM,
    key: "firstPeriodTotalCornersAwayTeam",
    name: "Total corners 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL_CORNERS_HOME_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL_CORNERS_HOME_TEAM,
    key: "secondPeriodTotalCornersHomeTeam",
    name: "Total corners 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_TOTAL_CORNERS_AWAY_TEAM]: {
    id: MarketType.SECOND_PERIOD_TOTAL_CORNERS_AWAY_TEAM,
    key: "secondPeriodTotalCornersAwayTeam",
    name: "Total corners 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  // Spread corners period - half for soccer
  [MarketType.FIRST_PERIOD_SPREAD_CORNERS]: {
    id: MarketType.FIRST_PERIOD_SPREAD_CORNERS,
    key: "firstPeriodSpreadCorners",
    name: "Handicap corners 1st",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.SECOND_PERIOD_SPREAD_CORNERS]: {
    id: MarketType.SECOND_PERIOD_SPREAD_CORNERS,
    key: "secondPeriodSpreadCorners",
    name: "Handicap corners 2nd",
    resultType: ResultType.OVER_UNDER,
  },
  // Most corners
  [MarketType.MOST_CORNERS]: {
    id: MarketType.MOST_CORNERS,
    key: "mostCorners",
    name: "Most corners",
    resultType: ResultType.EXACT_POSITION,
  },
  // Most corners period - half for soccer
  [MarketType.FIRST_PERIOD_MOST_CORNERS]: {
    id: MarketType.FIRST_PERIOD_MOST_CORNERS,
    key: "firstPeriodMostCorners",
    name: "Most corners 1st",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.SECOND_PERIOD_MOST_CORNERS]: {
    id: MarketType.SECOND_PERIOD_MOST_CORNERS,
    key: "secondPeriodSpreadCorners",
    name: "Most corners 2nd",
    resultType: ResultType.EXACT_POSITION,
  },

  // Spread (handicap) cards
  [MarketType.SPREAD_CARDS]: {
    id: MarketType.SPREAD_CARDS,
    key: "spreadCards",
    name: "Handicap cards",
    resultType: ResultType.SPREAD,
  },
  // Total cards
  [MarketType.TOTAL_CARDS]: {
    id: MarketType.TOTAL_CARDS,
    key: "totalCards",
    name: "Total cards",
    resultType: ResultType.OVER_UNDER,
  },
  // Total cards per team
  [MarketType.TOTAL_CARDS_HOME_TEAM]: {
    id: MarketType.TOTAL_CARDS_HOME_TEAM,
    key: "totalCardsHomeTeam",
    name: "Total cards",
    resultType: ResultType.OVER_UNDER,
  },
  [MarketType.TOTAL_CARDS_AWAY_TEAM]: {
    id: MarketType.TOTAL_CARDS_AWAY_TEAM,
    key: "totalCardsAwayTeam",
    name: "Total cards",
    resultType: ResultType.OVER_UNDER,
  },
  // Total red cards
  [MarketType.TOTA_RED_CARDS]: {
    id: MarketType.TOTA_RED_CARDS,
    key: "totalRedCards",
    name: "Total red cards",
    resultType: ResultType.OVER_UNDER,
  },
  // Most cards
  [MarketType.MOST_CARDS]: {
    id: MarketType.MOST_CARDS,
    key: "mostCards",
    name: "Most cards",
    resultType: ResultType.EXACT_POSITION,
  },
  //First/last card
  [MarketType.FIRST_CARD]: {
    id: MarketType.FIRST_CARD,
    key: "firstCards",
    name: "First card",
    resultType: ResultType.EXACT_POSITION,
  },
  [MarketType.LAST_CARD]: {
    id: MarketType.LAST_CARD,
    key: "lastCard",
    name: "Last card",
    resultType: ResultType.EXACT_POSITION,
  },
};

const PLAYER_PROPS_MARKET_TYPES = [
  MarketType.PLAYER_PROPS_HOMERUNS,
  MarketType.PLAYER_PROPS_BASES,
  MarketType.PLAYER_PROPS_STRIKEOUTS,
  MarketType.PLAYER_PROPS_PASSING_YARDS,
  MarketType.PLAYER_PROPS_PASSING_TOUCHDOWNS,
  MarketType.PLAYER_PROPS_RUSHING_YARDS,
  MarketType.PLAYER_PROPS_RECEIVING_YARDS,
  MarketType.PLAYER_PROPS_TOUCHDOWNS_SCORER,
  MarketType.PLAYER_PROPS_FIELD_GOALS_MADE,
  MarketType.PLAYER_PROPS_PITCHER_HITS_ALLOWED,
  MarketType.PLAYER_PROPS_POINTS,
  MarketType.PLAYER_PROPS_SHOTS,
  MarketType.PLAYER_PROPS_GOALS,
  MarketType.PLAYER_PROPS_HITS_RECORDED,
  MarketType.PLAYER_PROPS_REBOUNDS,
  MarketType.PLAYER_PROPS_ASSISTS,
  MarketType.PLAYER_PROPS_DOUBLE_DOUBLE,
  MarketType.PLAYER_PROPS_TRIPLE_DOUBLE,
  MarketType.PLAYER_PROPS_RECEPTIONS,
  MarketType.PLAYER_PROPS_FIRST_TOUCHDOWN,
  MarketType.PLAYER_PROPS_LAST_TOUCHDOWN,
  MarketType.PLAYER_PROPS_3PTS_MADE,
  MarketType.PLAYER_PROPS_BLOCKS,
  MarketType.PLAYER_PROPS_OVER_GOALS,
  MarketType.PLAYER_PROPS_UFC_TAKEDOWNS_LANDED,
  MarketType.PLAYER_PROPS_UFC_SIGNIFICANT_STRIKES_LANDED,
  MarketType.PLAYER_PROPS_INTERCEPTIONS,
  MarketType.PLAYER_PROPS_KICKING_POINTS,
  MarketType.PLAYER_PROPS_PASSING_ATTEMPTS,
  MarketType.PLAYER_PROPS_PASSING_COMPLETIONS,
  MarketType.PLAYER_PROPS_TOUCHDOWNS,
  MarketType.PLAYER_PROPS_SACKS,
  MarketType.PLAYER_PROPS_RUSHING_RECEIVING,
  MarketType.PLAYER_PROPS_PASSING_RUSHING,
  MarketType.PLAYER_PROPS_LONGEST_RECEPTION,
  MarketType.PLAYER_PROPS_EXTRA_POINTS,
  MarketType.PLAYER_PROPS_TACKLES,
  MarketType.PLAYER_PROPS_OUTS,
  MarketType.PLAYER_PROPS_RBIS,
  MarketType.PLAYER_PROPS_HITS_RUNS_RBIS,
  MarketType.PLAYER_PROPS_EARNED_RUNS,
  MarketType.PLAYER_PROPS_DOUBLES,
  MarketType.PLAYER_PROPS_BATTING_WALKS,
  MarketType.PLAYER_PROPS_BATTING_STRIKEOUTS,
  MarketType.PLAYER_PROPS_SINGLES,
  MarketType.PLAYER_PROPS_STOLEN_BASES,
  MarketType.PLAYER_PROPS_RUNS,
  MarketType.PLAYER_PROPS_WALKS,
  MarketType.PLAYER_PROPS_POINTS_ASSISTS,
  MarketType.PLAYER_PROPS_POINTS_REBOUNDS,
  MarketType.PLAYER_PROPS_POINTS_REBOUNDS_ASSISTS,
  MarketType.PLAYER_PROPS_REBOUNDS_ASSISTS,
  MarketType.PLAYER_PROPS_STEALS,
  MarketType.PLAYER_PROPS_STEALS_BLOCKS,
  MarketType.PLAYER_PROPS_CARD_RECEIVER,
  MarketType.PLAYER_PROPS_RED_CARD_RECEIVER,
  MarketType.PLAYER_PROPS_FIRST_SCORER,
  MarketType.PLAYER_PROPS_LAST_SCORER,
  MarketType.PLAYER_PROPS_SHOTS_ON_TARGET,
  MarketType.PLAYER_PROPS_TOTAL_SHOTS,
];

const ONE_SIDE_PLAYER_PROPS_MARKET_TYPES = [
  MarketType.PLAYER_PROPS_TOUCHDOWNS_SCORER,
  MarketType.PLAYER_PROPS_GOALS,
  MarketType.PLAYER_PROPS_FIRST_TOUCHDOWN,
  MarketType.PLAYER_PROPS_LAST_TOUCHDOWN,
  MarketType.PLAYER_PROPS_CARD_RECEIVER,
  MarketType.PLAYER_PROPS_RED_CARD_RECEIVER,
  MarketType.PLAYER_PROPS_FIRST_SCORER,
  MarketType.PLAYER_PROPS_LAST_SCORER,
];

const YES_NO_PLAYER_PROPS_MARKET_TYPES = [MarketType.PLAYER_PROPS_DOUBLE_DOUBLE, MarketType.PLAYER_PROPS_TRIPLE_DOUBLE];

const COMBINED_POSITIONS_MARKET_TYPES = [
  MarketType.WINNER_TOTAL,
  MarketType.HALFTIME_FULLTIME,
  MarketType.GOALS,
  MarketType.HALFTIME_FULLTIME_GOALS,
];

const FUTURES_MARKET_TYPES = [MarketType.LEAGUE_WINNER, MarketType.MVP, MarketType.CUP_WINNER];

const OddsType = {
  AMERICAN: "american-odds",
  DECIMAL: "decimal-odds",
  AMM: "normalized-implied-odds",
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const Status = {
  OPEN: 0,
  PAUSED: 1,
  IN_PROGRESS: 3,
  RESOLVED: 10,
  CANCELLED: 255,
};

const TicketMarketStatus = {
  OPEN: 0,
  CANCELLED: 1,
  WINNING: 2,
  LOSING: 3,
};

const MIN_ODDS_FOR_DIFF_CHECKING = 0.2;
const LIVE_TYPE_ID_BASE = 100000;
const MAX_ALLOWED_STALE_ODDS_DELAY = process.env.MAX_ALLOWED_STALE_ODDS_DELAY || 1000 * 60 * 3; // 3 mins

const PARENT_MARKET_PROPERTIES_TO_EXCLUDE = [
  "sport",
  "leagueId",
  "leagueName",
  "type",
  "maturityDate",
  "isOpen",
  "isResolved",
  "isCancelled",
  "isPaused",
  "isOneSideMarket",
  "isPlayerPropsMarket",
  "isOneSidePlayerPropsMarket",
  "isYesNoPlayerPropsMarket",
  "isV3",
];

const CHILD_MARKET_PROPERTIES_TO_EXCLUDE = [
  ...PARENT_MARKET_PROPERTIES_TO_EXCLUDE,
  "gameId",
  "subLeagueId",
  "maturity",
  "homeTeam",
  "awayTeam",
];

const EnetpulseRounds = {
  [0]: "",
  [1]: "no round",
  [2]: "Semi-finals",
  [3]: "Quarter-finals",
  [4]: "1/8",
  [5]: "1/16",
  [6]: "1/32",
  [7]: "1/64",
  [8]: "1/128",
  [9]: "Final",
};

const MEDIUM_ODDS = 0.52;

module.exports = {
  ResultType,
  MarketType,
  OverUnderType,
  MarketTypeMap,
  PLAYER_PROPS_MARKET_TYPES,
  ONE_SIDE_PLAYER_PROPS_MARKET_TYPES,
  YES_NO_PLAYER_PROPS_MARKET_TYPES,
  OddsType,
  ZERO_ADDRESS,
  Status,
  MIN_ODDS_FOR_DIFF_CHECKING,
  MAX_ALLOWED_STALE_ODDS_DELAY,
  COMBINED_POSITIONS_MARKET_TYPES,
  EnetpulseRounds,
  LIVE_TYPE_ID_BASE,
  TicketMarketStatus,
  FUTURES_MARKET_TYPES,
  MEDIUM_ODDS,
  PARENT_MARKET_PROPERTIES_TO_EXCLUDE,
  CHILD_MARKET_PROPERTIES_TO_EXCLUDE,
};
