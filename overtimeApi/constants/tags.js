const SPORTS_MAP = {
  9001: "Football",
  9002: "Football",
  9003: "Baseball",
  9004: "Basketball",
  9005: "Basketball",
  9006: "Hockey",
  9007: "MMA",
  9008: "Basketball",
  9010: "Soccer",
  9011: "Soccer",
  9012: "Soccer",
  9013: "Soccer",
  9014: "Soccer",
  9015: "Soccer",
  9016: "Soccer",
  9017: "Soccer",
  9018: "Soccer",
  9019: "Soccer",
  9445: "Motosport",
  9497: "Motosport",
  9153: "Tennis",
  9156: "Tennis",
  18977: "eSports",
  18983: "eSports",
  19138: "eSports",
  9020: "Cricket",
  9399: "Basketball",
  18196: "MMA",
  19595: "MMA",
  9057: "Soccer",
  9061: "Soccer",
  9045: "Soccer",
  9033: "Hockey",
  9296: "Soccer",
  9021: "Cricket",
  9050: "Soccer",
  109021: "Golf",
  109121: "Golf",
  18806: "Soccer",
  18821: "Soccer",
  9288: "Soccer",
  9042: "Soccer",
  19216: "Soccer",
  9076: "Soccer",
  9073: "Soccer",
  9409: "Basketball",
  9536: "Soccer",
  9268: "Soccer",
  19199: "Soccer",
  9132: "Soccer",
  9134: "Soccer",
  9138: "Soccer",
  9141: "Soccer",
  9209: "Soccer",
};

const TAGS_OF_MARKETS_WITHOUT_DRAW_ODDS = [
  9001, 9002, 9003, 9004, 9005, 9006, 9008, 9007, 9445, 9497, 9153, 9156, 18977, 18983, 19138, 9020, 9399, 18196, 19595,
  9021, 109021, 109121, 9409,
];

const SPORTS_TAGS_MAP = {
  Football: [9001, 9002],
  Baseball: [9003],
  Basketball: [9004, 9005, 9008, 9399, 9409],
  Hockey: [9006, 9033],
  Soccer: [
    9010, 9011, 9012, 9013, 9014, 9015, 9016, 9017, 9018, 9019, 9057, 9061, 9045, 9296, 9050, 18806, 18821, 9288, 9042,
    19216, 9076, 9073, 9536, 9268, 19199, 9132, 9134, 9138, 9141, 9209,
  ],
  MMA: [9007, 18196, 19595],
  Motosport: [9445, 9497],
  Tennis: [9153, 9156],
  eSports: [18977, 18983, 19138],
  Cricket: [9020, 9021],
  Golf: [109021, 109121],
};

ENETPULSE_SPORTS = [
  9153, 9156, 18977, 18983, 19138, 9399, 18196, 19595, 9057, 9061, 9045, 9445, 9033, 9296, 9050, 9497, 18806, 18821,
  9288, 9042, 19216, 9076, 9073, 9409, 9536, 9268, 19199, 9132, 9134, 9138, 9141, 9209,
];

JSON_ODDS_SPORTS = [109021, 109121];

const GOLF_TOURNAMENT_WINNER_TAG = 109121;

const TWO_POSITIONAL_SPORTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 20, 21, 153, 156, 399, 445, 409, 497, 9196, 9977, 9983, 10138, 10595, 100021, 100121,
];

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
  TAGS_OF_MARKETS_WITHOUT_DRAW_ODDS,
  GOLF_TOURNAMENT_WINNER_TAG,
  TWO_POSITIONAL_SPORTS,
  SPORT_ID_MAP_RUNDOWN,
  SPORT_ID_MAP_ENETPULSE,
  SPORT_ID_MAP_JSON_ODDS,
};
