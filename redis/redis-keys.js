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
  THALES_MARKETS_LAST_UPDATED_AT: {
    10: "thalesOpMarketsLastUpdate",
    137: "thalesPolygonMarketsLastUpdate",
    42161: "thalesArbMarketsLastUpdate",
    8453: "thalesBaseMarketsLastUpdate",
  },
  OVERTIME_V2_OPEN_MARKETS: {
    10: "overtimeV2OpOpenMarkets",
    11155420: "overtimeV2OpSepoliaOpenMarkets",
    42161: "overtimeV2ArbOpenMarkets",
    8453: "overtimeV2BaseOpenMarkets",
  },
  OVERTIME_V2_CLOSED_MARKETS: {
    10: "overtimeV2OpClosedMarkets",
    11155420: "overtimeV2OpSepoliaClosedMarkets",
    42161: "overtimeV2ArbClosedMarkets",
    8453: "overtimeV2BaseClosedMarkets",
  },
  OVERTIME_V2_GAMES_INFO: "overtimeV2GamesInfo",
  OVERTIME_V2_PLAYERS_INFO: "overtimeV2PlayersInfo",
  OVERTIME_V2_LIVE_MARKETS: {
    10: "overtimeV2OpLiveMarkets",
    11155420: "overtimeV2OpSepoliaLiveMarkets",
    42161: "overtimeV2ArbLiveMarkets",
    8453: "overtimeV2BaseLiveMarkets",
  },
  OVERTIME_V2_LIVE_SCORES: "overtimeV2LiveScores",
  OVERTIME_V2_LIVE_TRADE_ADAPTER_MESSAGES: {
    10: "overtimeV2OpLiveTradeAdapterMessages",
    11155420: "overtimeV2SepoliaLiveTradeAdapterMessages",
    42161: "overtimeV2ArbLiveTradeAdapterMessages",
    8453: "overtimeV2BaseLiveTradeAdapterMessages",
  },
};

module.exports = KEYS;
