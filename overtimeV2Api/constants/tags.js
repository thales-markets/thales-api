const { League } = require("./sports");

const SPORTS_NO_FORMAL_HOME_AWAY = [League.CSGO, League.DOTA2, League.LOL, League.TENNIS_GS, League.TENNIS_MASTERS];

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
  320: 18, // Hockey Norway
  6: 24, // NHL
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

module.exports = {
  SPORTS_NO_FORMAL_HOME_AWAY,
  SPORT_ID_MAP_RUNDOWN,
  SPORT_ID_MAP_ENETPULSE,
};
