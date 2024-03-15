const KEYS = {
  TOKEN: "tokenMap",
  GAME_FINISHERS: "gameFinishersMap",
  USER_REFFERER_IDS: "userReffererIDsMap",
  THALES_IO_DAILY_STATS: "thalesIOStats",
  THALES_IO_WEEKLY_STATS: "thalesIOWeeklyStats",
  OP_REWARDS: {
    10: "opRewards",
  },
  OP_REWARDS_V2: {
    10: "opRewardsV2",
  },
  OVERTIME_REWARDS: {
    10: "overtimeOpRewards",
  },
  PARLAY_LEADERBOARD: {
    10: "overtimeOpParlayLeaderboard",
    420: "overtimeGoerliParlayLeaderboard",
    42161: "overtimeArbitrumParlayLeaderboard",
    8453: "overtimeBaseParlayLeaderboard",
  },
  TWAP_FOR_PERIOD: "twapMap",
  OVERTIME_MARKETS: {
    10: "overtimeOpMarkets",
    420: "overtimeOpGoerliMarkets",
    42161: "overtimeArbMarkets",
    8453: "overtimeBaseMarkets",
  },
  THALES_MARKETS: {
    10: "thalesOpMarkets",
    137: "thalesPolygonMarkets",
    42161: "thalesArbMarkets",
    8453: "thalesBaseMarkets",
  },
  OVERTIME_V2_MARKETS: "overtimeV2Markets",
  OVERTIME_V2_TEAM_NAMES: "overtimeV2TeamNames",
  MARCH_MADNESS: {
    BY_VOLUME: {
      10: "mmOPVolume",
      420: "mmOPGoerliVolume",
      42161: "mmArbVolume",
    },
    BY_NUMBER_OF_CORRECT_PREDICTIONS: {
      10: "mmOPNOCP",
      420: "mmOPGoerliNOCP",
      42161: "mmArbNOCP",
    },
    GENERAL_STATS: {
      10: "mmOPGeneralStats",
      420: "mmOPGoerliGeneralStats",
      42161: "mmArbGeneralStats",   
    },
    FINAL_DATA: {
      10: "mmOPFinalData",
      420: "mmOPFinalData",
      42161: "mmArbFinalData",   
    }
  },
};

module.exports = KEYS;
