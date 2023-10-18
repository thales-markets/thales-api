const KEYS = {
  TOKEN: "tokenMap",
  GAME_FINISHERS: "gameFinishersMap",
  USER_REFFERER_IDS: "userReffererIDsMap",
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
};

module.exports = KEYS;
