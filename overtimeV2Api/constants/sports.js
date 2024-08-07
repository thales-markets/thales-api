const Sport = {
  SOCCER: "Soccer",
  FOOTBALL: "Football",
  BASKETBALL: "Basketball",
  BASEBALL: "Baseball",
  HOCKEY: "Hockey",
  FIGHTING: "Fighting",
  TENNIS: "Tennis",
  TABLE_TENNIS: "TableTennis",
  ESPORTS: "eSports",
  RUGBY: "Rugby",
  VOLLEYBALL: "Volleyball",
  HANDBALL: "Handball",
  WATERPOLO: "Waterpolo",
  CRICKET: "Cricket",
  MOTOSPORT: "Motosport",
  GOLF: "Golf",
  POLITICS: "Politics",
  EMPTY: "",
};

const League = {
  NCAAF: 1,
  NFL: 2,
  MLB: 3,
  NBA: 4,
  NCAAB: 5,
  NHL: 6,
  UFC: 7,
  WNBA: 8,
  MLS: 10,
  EPL: 11,
  LIGUE_ONE: 12,
  BUNDESLIGA: 13,
  LA_LIGA: 14,
  SERIE_A: 15,
  UEFA_CL: 16,
  UEFA_EL: 17,
  FIFA_WC: 18,
  J1_LEAGUE: 19,
  IPL: 20,
  T20_BLAST: 21,
  IIHF_WORLD_CHAMPIONSHIP: 33,
  COPA_AMERICA: 44,
  COPA_LIBERTADORES: 45,
  UEFA_EURO: 50,
  EREDIVISIE: 57,
  PRIMEIRA_LIGA: 61,
  SUMMER_OLYMPICS_SOCCER_WOMEN: 65,
  SUMMER_OLYMPICS_SOCCER: 66,
  FIFA_WC_WOMEN: 76,
  ENGLAND_CUP: 132,
  FRANCE_CUP: 134,
  SPAIN_CUP: 138,
  ITALY_CUP: 141,
  TENNIS_GS: 153,
  TENNIS_MASTERS: 156,
  SUMMER_OLYMPICS_TENNIS: 158,
  GERMANY_CUP: 209,
  LIGA_MX: 230,
  BRAZIL_1: 268,
  UEFA_EURO_U21: 288,
  FIFA_WORLD_CUP_U20: 296,
  SUMMER_OLYMPICS_HANDBALL_WOMEN: 380,
  SUMMER_OLYMPICS_HANDBALL: 381,
  EUROLEAGUE: 399,
  SUMMER_OLYMPICS_BASKETBALL: 406,
  SUMMER_OLYMPICS_BASKETBALL_WOMEN: 407,
  FIBA_WORLD_CUP: 409,
  FORMULA1: 445,
  SUMMER_OLYMPICS_BEACH_VOLEYBALL_WOMEN: 453,
  SUMMER_OLYMPICS_BEACH_VOLEYBALL: 454,
  MOTOGP: 497,
  SAUDI_PROFESSIONAL_LEAGUE: 536,
  SUMMER_OLYMPICS_WATERPOLO: 8881,
  SUMMER_OLYMPICS_VOLEYBALL_WOMEN: 8893,
  SUMMER_OLYMPICS_VOLEYBALL: 8894,
  SUMMER_OLYMPICS_TABLE_TENNIS: 8910,
  BOXING: 9196,
  SUMMER_OLYMPICS_RUGBY: 9578,
  SUMMER_OLYMPICS_RUGBY_WOMEN: 9588,
  SUMMER_OLYMPICS_HOCKEY_WOMEN: 9698,
  SUMMER_OLYMPICS_HOCKEY: 9699,
  UEFA_NATIONS_LEAGUE: 9806,
  CONCACAF_NATIONS_LEAGUE: 9821,
  CSGO: 9977,
  DOTA2: 9983,
  SUMMER_OLYMPICS_BASKETBALL_3X3: 10071,
  SUMMER_OLYMPICS_BASKETBALL_3X3_WOMEN: 10072,
  SUMMER_OLYMPICS_QUALIFICATION: 10502,
  LOL: 10138,
  CONMEBOL_WC_QUALIFICATIONS: 10199,
  UEFA_CONFERENCE_LEAGUE: 10216,
  NON_TITLE_BOXING: 10595,
  UEFA_CHAMPIONS_LEAGUE_QUALIFICATION: 10611,
  UEFA_EUROPA_LEAGUE_QUALIFICATION: 10613,
  UEFA_CONFERENCE_LEAGUE_QUALIFICATION: 10615,
  US_ELECTION: 20000,
  UEFA_SUPER_CUP: 20001,
  BRAZIL_CUP: 20002,
  ENGLAND_CHAMPIONSHIP: 20011,
  GOLF_H2H: 100021,
  GOLF_WINNER: 100121,
};

const ScoringType = {
  POINTS: "points",
  GOALS: "goals",
  ROUNDS: "rounds",
  SETS: "sets",
  EMPTY: "",
};

const MatchResolveType = {
  OVERTIME: "overtime",
  REGULAR: "regular",
  EMPTY: "",
};

const PeriodType = {
  QUARTER: "quarter",
  HALF: "half",
  PERIOD: "period",
  ROUND: "round",
  INNING: "inning",
  SET: "set",
  EMPTY: "",
};

const Provider = {
  RUNDOWN: "rundown",
  ENETPULSE: "enetpulse",
  JSONODDS: "jsonOdds",
  OPTICODDS: "opticOdds",
  EMPTY: "",
};

const LeagueMap = {
  [League.NCAAF]: {
    sport: Sport.FOOTBALL,
    id: League.NCAAF,
    label: "NCAA Football",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.NFL]: {
    sport: Sport.FOOTBALL,
    id: League.NFL,
    label: "NFL",
    opticOddsName: "NFL",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.MLB]: {
    sport: Sport.BASEBALL,
    id: League.MLB,
    label: "MLB",
    opticOddsName: "MLB",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.INNING,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.NBA]: {
    sport: Sport.BASKETBALL,
    id: League.NBA,
    label: "NBA",
    opticOddsName: "NBA",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.NCAAB]: {
    sport: Sport.BASKETBALL,
    id: League.NCAAB,
    label: "NCAA Basketball",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.NHL]: {
    sport: Sport.HOCKEY,
    id: League.NHL,
    label: "NHL",
    opticOddsName: "NHL",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.PERIOD,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.UFC]: {
    sport: Sport.FIGHTING,
    id: League.UFC,
    label: "UFC",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.ROUNDS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.ROUND,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.WNBA]: {
    sport: Sport.BASKETBALL,
    id: League.WNBA,
    label: "WNBA",
    opticOddsName: "WNBA",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.MLS]: {
    sport: Sport.SOCCER,
    id: League.MLS,
    label: "MLS",
    opticOddsName: "USA - Major League Soccer",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.EPL]: {
    sport: Sport.SOCCER,
    id: League.EPL,
    label: "EPL",
    opticOddsName: "England - Premier League",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.LIGUE_ONE]: {
    sport: Sport.SOCCER,
    id: League.LIGUE_ONE,
    label: "Ligue 1",
    opticOddsName: "France - Ligue 1",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },

  [League.BUNDESLIGA]: {
    sport: Sport.SOCCER,
    id: League.BUNDESLIGA,
    label: "Bundesliga",
    opticOddsName: "Germany - Bundesliga",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.LA_LIGA]: {
    sport: Sport.SOCCER,
    id: League.LA_LIGA,
    label: "La Liga",
    opticOddsName: "Spain - La Liga",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.SERIE_A]: {
    sport: Sport.SOCCER,
    id: League.SERIE_A,
    label: "Serie A",
    opticOddsName: "Italy - Serie A",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.UEFA_CL]: {
    sport: Sport.SOCCER,
    id: League.UEFA_CL,
    label: "UEFA Champions League",
    opticOddsName: "UEFA - Champions League",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.UEFA_EL]: {
    sport: Sport.SOCCER,
    id: League.UEFA_EL,
    label: "UEFA Europa League",
    opticOddsName: "UEFA - Europa League",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.FIFA_WC]: {
    sport: Sport.SOCCER,
    id: League.FIFA_WC,
    label: "FIFA World Cup",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.J1_LEAGUE]: {
    sport: Sport.SOCCER,
    id: League.J1_LEAGUE,
    label: "J1 League",
    opticOddsName: "Japan - J1 League",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.IPL]: {
    sport: Sport.CRICKET,
    id: League.IPL,
    label: "Indian Premier League",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.INNING,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.T20_BLAST]: {
    sport: Sport.CRICKET,
    id: League.T20_BLAST,
    label: "T20 Blast",
    provider: Provider.RUNDOWN,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.INNING,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.IIHF_WORLD_CHAMPIONSHIP]: {
    sport: Sport.HOCKEY,
    id: League.IIHF_WORLD_CHAMPIONSHIP,
    label: "IIHF World Championship",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.PERIOD,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.COPA_AMERICA]: {
    sport: Sport.SOCCER,
    id: League.COPA_AMERICA,
    label: "Copa America",
    opticOddsName: "CONMEBOL - Copa America",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.COPA_LIBERTADORES]: {
    sport: Sport.SOCCER,
    id: League.COPA_LIBERTADORES,
    label: "Copa Libertadores",
    opticOddsName: "CONMEBOL - Copa Libertadores",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.UEFA_EURO]: {
    sport: Sport.SOCCER,
    id: League.UEFA_EURO,
    label: "UEFA EURO 2024",
    opticOddsName: "UEFA - European Championship",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.EREDIVISIE]: {
    sport: Sport.SOCCER,
    id: League.EREDIVISIE,
    label: "Eredivisie",
    opticOddsName: "Netherlands - Eredivisie",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.PRIMEIRA_LIGA]: {
    sport: Sport.SOCCER,
    id: League.PRIMEIRA_LIGA,
    label: "Primeira Liga",
    opticOddsName: "Portugal - Primeira Liga",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_SOCCER_WOMEN]: {
    sport: Sport.SOCCER,
    id: League.SUMMER_OLYMPICS_SOCCER_WOMEN,
    label: "Olympic Games Soccer Women",
    opticOddsName: "Olympics Soccer Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_SOCCER]: {
    sport: Sport.SOCCER,
    id: League.SUMMER_OLYMPICS_SOCCER,
    label: "Olympic Games Soccer",
    opticOddsName: "Olympics Soccer Men",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.FIFA_WC_WOMEN]: {
    sport: Sport.SOCCER,
    id: League.FIFA_WC_WOMEN,
    label: "FIFA World Cup Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.ENGLAND_CUP]: {
    sport: Sport.SOCCER,
    id: League.ENGLAND_CUP,
    label: "FA Cup",
    opticOddsName: "England - FA Cup",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.FRANCE_CUP]: {
    sport: Sport.SOCCER,
    id: League.FRANCE_CUP,
    label: "Coupe de France",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.SPAIN_CUP]: {
    sport: Sport.SOCCER,
    id: League.SPAIN_CUP,
    label: "Copa del Rey",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.ITALY_CUP]: {
    sport: Sport.SOCCER,
    id: League.ITALY_CUP,
    label: "Coppa Italia",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.TENNIS_GS]: {
    sport: Sport.TENNIS,
    id: League.TENNIS_GS,
    label: "Grand Slam",
    opticOddsName: "atp",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: true,
  },
  [League.TENNIS_MASTERS]: {
    sport: Sport.TENNIS,
    id: League.TENNIS_MASTERS,
    label: "ATP Events",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_TENNIS]: {
    sport: Sport.TENNIS,
    id: League.SUMMER_OLYMPICS_TENNIS,
    label: "Olympic Games Tennis",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.GERMANY_CUP]: {
    sport: Sport.SOCCER,
    id: League.GERMANY_CUP,
    label: "DFB Pokal",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.LIGA_MX]: {
    sport: Sport.SOCCER,
    id: League.LIGA_MX,
    label: "Liga MX",
    opticOddsName: "Mexico - Liga MX",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.BRAZIL_1]: {
    sport: Sport.SOCCER,
    id: League.BRAZIL_1,
    label: "Serie A",
    opticOddsName: "Brazil - Serie A",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.UEFA_EURO_U21]: {
    sport: Sport.SOCCER,
    id: League.UEFA_EURO_U21,
    label: "UEFA EURO U21",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
    tooltipKey: "common.football-tooltip",
  },
  [League.FIFA_WORLD_CUP_U20]: {
    sport: Sport.SOCCER,
    id: League.FIFA_WORLD_CUP_U20,
    label: "FIFA World Cup U20",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_HANDBALL_WOMEN]: {
    sport: Sport.HANDBALL,
    id: League.SUMMER_OLYMPICS_HANDBALL_WOMEN,
    label: "Olympic Games Handball Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_HANDBALL]: {
    sport: Sport.HANDBALL,
    id: League.SUMMER_OLYMPICS_HANDBALL,
    label: "Olympic Games Handball",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.EUROLEAGUE]: {
    sport: Sport.BASKETBALL,
    id: League.EUROLEAGUE,
    label: "Euroleague",
    opticOddsName: "Euroleague",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_BASKETBALL]: {
    sport: Sport.BASKETBALL,
    id: League.SUMMER_OLYMPICS_BASKETBALL,
    label: "Olympic Games Basketball",
    opticOddsName: "Olympics Basketball Men",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_BASKETBALL_WOMEN]: {
    sport: Sport.BASKETBALL,
    id: League.SUMMER_OLYMPICS_BASKETBALL_WOMEN,
    label: "Olympic Games Basketball Women",
    opticOddsName: "Olympics Basketball Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.FIBA_WORLD_CUP]: {
    sport: Sport.BASKETBALL,
    id: League.FIBA_WORLD_CUP,
    label: "FIBA World Cup",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.FORMULA1]: {
    sport: Sport.MOTOSPORT,
    id: League.FORMULA1,
    label: "Formula 1",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.EMPTY,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.EMPTY,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_BEACH_VOLEYBALL_WOMEN]: {
    sport: Sport.VOLLEYBALL,
    id: League.SUMMER_OLYMPICS_BEACH_VOLEYBALL_WOMEN,
    label: "Olympic Games Beach Voleyball Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_BEACH_VOLEYBALL]: {
    sport: Sport.VOLLEYBALL,
    id: League.SUMMER_OLYMPICS_BEACH_VOLEYBALL,
    label: "Olympic Games Beach Voleyball",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_TABLE_TENNIS]: {
    sport: Sport.TABLE_TENNIS,
    id: League.SUMMER_OLYMPICS_TABLE_TENNIS,
    label: "Olympic Games Table Tennis",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.MOTOGP]: {
    sport: Sport.MOTOSPORT,
    id: League.MOTOGP,
    label: "MotoGP",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.EMPTY,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.EMPTY,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SAUDI_PROFESSIONAL_LEAGUE]: {
    sport: Sport.SOCCER,
    id: League.SAUDI_PROFESSIONAL_LEAGUE,
    label: "Saudi Professional League",
    opticOddsName: "Saudi Arabia - Saudi League",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_WATERPOLO]: {
    sport: Sport.WATERPOLO,
    id: League.SUMMER_OLYMPICS_WATERPOLO,
    label: "Olympic Games Water Polo",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_VOLEYBALL_WOMEN]: {
    sport: Sport.VOLLEYBALL,
    id: League.SUMMER_OLYMPICS_VOLEYBALL_WOMEN,
    label: "Olympic Games Volleyball Women",
    opticOddsName: "Olympics Volleyball Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_VOLEYBALL]: {
    sport: Sport.VOLLEYBALL,
    id: League.SUMMER_OLYMPICS_VOLEYBALL,
    label: "Olympic Games Volleyball",
    opticOddsName: "Olympics Volleyball Men",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.SETS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.SET,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.BOXING]: {
    sport: Sport.FIGHTING,
    id: League.BOXING,
    label: "Boxing",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.ROUNDS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.ROUND,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_RUGBY]: {
    sport: Sport.RUGBY,
    id: League.SUMMER_OLYMPICS_RUGBY,
    label: "Olympic Games Rugby",
    opticOddsName: "Olympics Rugby 7s Men",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_RUGBY_WOMEN]: {
    sport: Sport.RUGBY,
    id: League.SUMMER_OLYMPICS_RUGBY_WOMEN,
    label: "Olympic Games Rugby Women",
    opticOddsName: "Olympics Rugby 7s Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.SUMMER_OLYMPICS_HOCKEY_WOMEN]: {
    sport: Sport.HOCKEY,
    id: League.SUMMER_OLYMPICS_HOCKEY_WOMEN,
    label: "Olympic Games Hockey Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.PERIOD,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_HOCKEY]: {
    sport: Sport.HOCKEY,
    id: League.SUMMER_OLYMPICS_HOCKEY,
    label: "Olympic Games Hockey",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.PERIOD,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.UEFA_NATIONS_LEAGUE]: {
    sport: Sport.SOCCER,
    id: League.UEFA_NATIONS_LEAGUE,
    label: "UEFA Nations League",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.CONCACAF_NATIONS_LEAGUE]: {
    sport: Sport.SOCCER,
    id: League.CONCACAF_NATIONS_LEAGUE,
    label: "CONCACAF Nations League",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.CSGO]: {
    sport: Sport.ESPORTS,
    id: League.CSGO,
    label: "CS GO",
    opticOddsName: "CS2",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.ROUNDS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.ROUND,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.DOTA2]: {
    sport: Sport.ESPORTS,
    id: League.DOTA2,
    label: "DOTA 2",
    opticOddsName: "Dota 2",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.ROUNDS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.ROUND,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_BASKETBALL_3X3]: {
    sport: Sport.BASKETBALL,
    id: League.SUMMER_OLYMPICS_BASKETBALL_3X3,
    label: "Olympic Games Basketball 3x3",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_BASKETBALL_3X3_WOMEN]: {
    sport: Sport.BASKETBALL,
    id: League.SUMMER_OLYMPICS_BASKETBALL_3X3_WOMEN,
    label: "Olympic Games Basketball 3x3 Women",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.SUMMER_OLYMPICS_QUALIFICATION]: {
    sport: Sport.BASKETBALL,
    id: League.SUMMER_OLYMPICS_QUALIFICATION,
    label: "Summer Olympics Basketball Qualification",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.POINTS,
    matchResolveType: MatchResolveType.OVERTIME,
    periodType: PeriodType.QUARTER,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.LOL]: {
    sport: Sport.ESPORTS,
    id: League.LOL,
    label: "LOL",
    opticOddsName: "League of Legends",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.ROUNDS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.ROUND,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.CONMEBOL_WC_QUALIFICATIONS]: {
    sport: Sport.SOCCER,
    id: League.CONMEBOL_WC_QUALIFICATIONS,
    label: "CONMEBOL WC Qualification",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.UEFA_CONFERENCE_LEAGUE]: {
    sport: Sport.SOCCER,
    id: League.UEFA_CONFERENCE_LEAGUE,
    label: "UEFA Conference League",
    opticOddsName: "UEFA - Europa Conference League",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.NON_TITLE_BOXING]: {
    sport: Sport.FIGHTING,
    id: League.NON_TITLE_BOXING,
    label: "Boxing",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.ROUNDS,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.ROUND,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.UEFA_CHAMPIONS_LEAGUE_QUALIFICATION]: {
    sport: Sport.SOCCER,
    id: League.UEFA_CHAMPIONS_LEAGUE_QUALIFICATION,
    label: "UEFA Champions League Qualification",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.UEFA_EUROPA_LEAGUE_QUALIFICATION]: {
    sport: Sport.SOCCER,
    id: League.UEFA_EUROPA_LEAGUE_QUALIFICATION,
    label: "UEFA Europa League Qualification",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.UEFA_CONFERENCE_LEAGUE_QUALIFICATION]: {
    sport: Sport.SOCCER,
    id: League.UEFA_CONFERENCE_LEAGUE_QUALIFICATION,
    label: "UEFA Conference League Qualification",
    provider: Provider.ENETPULSE,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: false,
    isLiveTestnet: false,
  },
  [League.US_ELECTION]: {
    sport: Sport.POLITICS,
    id: League.US_ELECTION,
    label: "US Election 2024",
    provider: Provider.EMPTY,
    scoringType: ScoringType.EMPTY,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.EMPTY,
    isDrawAvailable: false,
    live: true,
    isLiveTestnet: true,
  },
  [League.UEFA_SUPER_CUP]: {
    sport: Sport.SOCCER,
    id: League.UEFA_SUPER_CUP,
    label: "UEFA Super Cup",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.BRAZIL_CUP]: {
    sport: Sport.SOCCER,
    id: League.BRAZIL_CUP,
    label: "Copa do Brasil",
    opticOddsName: "Brazil - Copa do Brasil",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.ENGLAND_CHAMPIONSHIP]: {
    sport: Sport.SOCCER,
    id: League.ENGLAND_CHAMPIONSHIP,
    label: "EFL Championship",
    provider: Provider.OPTICODDS,
    scoringType: ScoringType.GOALS,
    matchResolveType: MatchResolveType.REGULAR,
    periodType: PeriodType.HALF,
    isDrawAvailable: true,
    live: true,
    isLiveTestnet: true,
  },
  [League.GOLF_H2H]: {
    sport: Sport.GOLF,
    id: League.GOLF_H2H,
    label: "Golf head-to-head",
    provider: Provider.JSONODDS,
    scoringType: ScoringType.EMPTY,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.EMPTY,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
  [League.GOLF_WINNER]: {
    sport: Sport.GOLF,
    id: League.GOLF_WINNER,
    label: "Golf Tournament Winner",
    provider: Provider.JSONODDS,
    scoringType: ScoringType.EMPTY,
    matchResolveType: MatchResolveType.EMPTY,
    periodType: PeriodType.EMPTY,
    isDrawAvailable: false,
    live: false,
    isLiveTestnet: false,
  },
};

const LEAGUES_NO_FORMAL_HOME_AWAY = [League.CSGO, League.DOTA2, League.LOL, League.TENNIS_GS, League.TENNIS_MASTERS];

const LEAGUES_NO_LIVE_CONSTRAINTS = [League.SUMMER_OLYMPICS_RUGBY, League.SUMMER_OLYMPICS_RUGBY_WOMEN];

const AMERICAN_LEAGUES = [
  League.NCAAF,
  League.NFL,
  League.MLB,
  League.NBA,
  League.NCAAB,
  League.NHL,
  League.WNBA,
  League.MLS,
  League.IPL,
  League.T20_BLAST,
];

const SportIdMapRundown = {
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

const SportIdMapEnetpulse = {
  320: 18, // Hockey Norway
  6: 24, // NHL
  33: 33, // Hockey World Championship
  16: 42, // Champions League
  44: 44, // Copa America
  45: 45, // Copa Libertadores
  11: 47, // EPL
  50: 50, // UEFA EURO
  12: 53, // France League 1
  13: 54, // Bundesliga
  15: 55, // Seria A
  57: 57, // Netherlands League 1
  61: 61, // Portugal League 1
  65: 65, // Summer Olympics Soccer Women
  66: 66, // Summer Olympics Soccer
  17: 73, // Europa League
  76: 76, // World Cup Woman
  14: 87, // La Liga
  153: 153, // Tennis GS
  156: 156, // Tennis Masters 1000
  158: 158, // Summer Olympics Tennnis
  132: 132, // FA Cup
  134: 134, // Coupe de France
  138: 138, // Copa del Rey
  141: 141, // Coppa Italia
  209: 209, // DFB Pokal
  230: 230, // LIGA MX
  268: 268, // Brazil Football League
  288: 288, // EURO U21
  296: 296, // FIFA WC U20
  310: 310, // Hockey Czech
  319: 319, // Hockey Finland
  322: 322, // Hockey Germany
  327: 327, // Hockey Switzerland
  380: 380, // Summer Olympics Handball Women
  381: 381, // Summer Olympics Handball
  399: 399, // EuroLeague
  406: 406, // Summer Olympics Basketball
  407: 407, // Summer Olympics Basketball Women
  409: 409, // FIBA World Cup
  445: 445, // F1
  453: 453, // Summer Olympics Beach Voleyball Women
  454: 454, // Summer Olympics Beach Voleyball
  497: 497, // Moto GP
  536: 536, // Saudi Arabia Football League
  8881: 8881, // Summer Olympics Water Polo
  8893: 8893, // Summer Olympics Voleyball Women
  8894: 8894, // Summer Olympics Voleyball
  8910: 8910, // Summer Olympics Table Tennnis
  9196: 9196, // Boxing
  9578: 9578, // Summer Olympics Rugby
  9588: 9588, // Summer Olympics Rugby Women
  9698: 9698, // Summer Olympics Hockey Women
  9699: 9699, // Summer Olympics Hockey
  9806: 9806, // UEFA League of Nations
  9821: 9821, // CONCACAF League of Nations
  9977: 9977, // CsGo
  9983: 9983, // Dota
  10071: 10071, // Summer Olympics Basketball 3x3
  10072: 10072, // Summer Olympics Basketball 3x3 Women
  10502: 10502, // Summer Olympics Basketball Qualification
  10138: 10138, // LOL
  10199: 10199, // World Cup Qualifications CONMBOL
  10216: 10216, // Europa Conference League
  10595: 10595, // Non-Title Boxing
  10611: 10611, // Champions League Qualification
  10613: 10613, // Europa League Qualification
  10615: 10615, // Conference League Qualification
};

const SportIdMapOpticOdds = {
  2: "NFL",
  3: "MLB",
  7: "UFC",
  8: "WNBA",
  10: "USA - MLS Pro",
  11: "England - Premier League",
  12: "France - Ligue 1",
  13: "Germany - Bundesliga",
  14: "Spain - La Liga",
  15: "Italy - Serie A",
  16: "UEFA - Champions League",
  17: "UEFA - Europa League",
  19: "Japan - J1 League",
  57: "Netherlands - Eredivisie",
  61: "Portugal - Primeira Liga",
  9977: "CS2",
  9983: "Dota 2",
  10138: "League of Legends",
  20001: "UEFA - Super Cup",
  20002: "Brazil - Copa do Brasil",
  20011: "England - Championship",
};

module.exports = {
  Sport,
  League,
  ScoringType,
  MatchResolveType,
  PeriodType,
  Provider,
  LeagueMap,
  LEAGUES_NO_FORMAL_HOME_AWAY,
  SportIdMapRundown,
  SportIdMapEnetpulse,
  AMERICAN_LEAGUES,
  SportIdMapOpticOdds,
  LEAGUES_NO_LIVE_CONSTRAINTS,
};
