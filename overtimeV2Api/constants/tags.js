const SPORTS_MAP = {
  1: "Football",
  2: "Football",
  3: "Baseball",
  4: "Basketball",
  5: "Basketball",
  6: "Hockey",
  7: "Fighting",
  8: "Basketball",
  10: "Soccer",
  11: "Soccer",
  12: "Soccer",
  13: "Soccer",
  14: "Soccer",
  15: "Soccer",
  16: "Soccer",
  17: "Soccer",
  18: "Soccer",
  19: "Soccer",
  445: "Motosport",
  497: "Motosport",
  153: "Tennis",
  156: "Tennis",
  9977: "eSports",
  9983: "eSports",
  10138: "eSports",
  20: "Cricket",
  399: "Basketball",
  9196: "Fighting",
  10595: "Fighting",
  57: "Soccer",
  61: "Soccer",
  45: "Soccer",
  33: "Hockey",
  296: "Soccer",
  21: "Cricket",
  50: "Soccer",
  100021: "Golf",
  100121: "Golf",
  9806: "Soccer",
  9821: "Soccer",
  288: "Soccer",
  42: "Soccer",
  10216: "Soccer",
  76: "Soccer",
  73: "Soccer",
  409: "Basketball",
  536: "Soccer",
  268: "Soccer",
  10199: "Soccer",
  132: "Soccer",
  134: "Soccer",
  138: "Soccer",
  141: "Soccer",
  209: "Soccer",
};

const SPORTS_TAGS_MAP = {
  Football: [1, 2],
  Baseball: [3],
  Basketball: [4, 5, 8, 399, 409],
  Hockey: [6, 33],
  Soccer: [
    10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 57, 61, 45, 296, 50, 9806, 9821, 288, 42, 10216, 76, 73, 536, 268, 10199,
    132, 134, 138, 141, 209,
  ],
  MMA: [7, 9196, 10595],
  Motosport: [445, 497],
  Tennis: [153, 156],
  eSports: [9977, 9983, 10138],
  Cricket: [20, 21],
  Golf: [100021, 100121],
};

ENETPULSE_SPORTS = [
  153, 156, 9977, 9983, 10138, 399, 9196, 10595, 57, 61, 45, 445, 33, 296, 50, 497, 9806, 9821, 288, 42, 10216, 76, 73,
  409, 536, 268, 10199, 132, 134, 138, 141, 209,
];

JSON_ODDS_SPORTS = [100021, 100121];

const GOLF_TOURNAMENT_WINNER_TAG = 100121;

const TWO_POSITIONAL_SPORTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 20, 21, 153, 156, 399, 445, 409, 497, 9196, 9977, 9983, 10138, 10595, 100021, 100121,
];

const LIVE_SUPPORTED_LEAGUES = [
  3, 4, 6, 10, 11, 12, 13, 14, 15, 16, 17, 19, 57, 61, 399, 536, 9977, 9983, 10138, 153, 156,
];

const SPORTS_NO_FORMAL_HOME_AWAY = [9977, 9983, 10138, 153, 156];

const SPORT_ID_MAP_RUNDOWN = {
  1: 1, // NCAAF
  2: 2, // NFL
  3: 3, // MLB
  4: 4, // NBA
  5: 5, // NCAAB
  6: 6, // NHL
  7: 7, // UFC
  8: 8, // WNBA
  10: 10, // MLS
  11: 11, // EPL
  12: 12, // France League 1
  13: 13, // Bundesliga
  14: 14, // La Liga
  15: 15, // Seria A
  16: 16, // Champions League
  17: 17, // Europa League
  18: 18, // FIFA WC
  19: 19, // J1
  20: 20, // IPL
  21: 21, // T20
};

const SPORT_ID_MAP_ENETPULSE = {
  18: 320, // Hockey Norway
  24: 6, // NHL
  33: 33, // Hockey World Championship
  16: 42, // Champions League
  45: 45, // Copa Libertadores
  11: 47, // EPL
  50: 50, // EURO Qualification
  12: 53, // France League 1
  13: 54, // Bundesliga
  15: 55, // Seria A
  57: 57, // Netherlands League 1
  61: 61, // Portugal League 1
  17: 73, // Europa League
  76: 76, // World Cup Woman
  14: 87, // La Liga
  153: 153, // Tennis GS
  156: 156, // Tennis Masters 1000
  132: 132, // FA Cup
  134: 134, // Coupe de France
  138: 138, // Copa del Rey
  141: 141, // Coppa Italia
  209: 209, // DFB Pokal
  268: 268, // Brazil Football League
  288: 288, // EURO U21
  296: 296, // FIFA WC U20
  310: 310, // Hockey Czech
  319: 319, // Hockey Finland
  322: 322, // Hockey Germany
  327: 327, // Hockey Switzerland
  399: 399, // EuroLeague
  409: 409, // FIBA World Cup
  445: 445, // F1
  497: 497, // Moto GP
  536: 536, // Saudi Arabia Football League
  9196: 9196, // Boxing
  9806: 9806, // UEFA League of Nations
  9821: 9821, // CONCACAF League of Nations
  9977: 9977, // CsGo
  9983: 9983, // Dota
  10138: 10138, // LOL
  10199: 10199, // World Cup Qualifications CONMBOL
  10216: 10216, // Europa Conference League
  10595: 10595, // Non-Title Boxing
};

const SPORT_ID_MAP_JSON_ODDS = {
  100021: 100021, // GOLF H2H
  100121: 100121, // GOLF Winners
};

module.exports = {
  ENETPULSE_SPORTS,
  JSON_ODDS_SPORTS,
  SPORTS_TAGS_MAP,
  SPORTS_MAP,
  GOLF_TOURNAMENT_WINNER_TAG,
  TWO_POSITIONAL_SPORTS,
  LIVE_SUPPORTED_LEAGUES,
  SPORTS_NO_FORMAL_HOME_AWAY,
  SPORT_ID_MAP_RUNDOWN,
  SPORT_ID_MAP_ENETPULSE,
  SPORT_ID_MAP_JSON_ODDS,
};
