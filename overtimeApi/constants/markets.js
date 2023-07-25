const NETWORK = {
  Optimism: 10,
  OptimismGoerli: 420,
  Arbitrum: 42161,
};

const STABLE_DECIMALS = {
  [NETWORK.Optimism]: 18,
  [NETWORK.OptimismGoerli]: 18,
  [NETWORK.Arbitrum]: 6,
};

const BET_TYPE = {
  Moneyline: 0,
  Spread: 10001,
  Total: 10002,
  DoubleChance: 10003,
};

const MARKET_TYPE = {
  [BET_TYPE.Winner]: "moneyline",
  [BET_TYPE.Spread]: "spread",
  [BET_TYPE.Total]: "total",
  [BET_TYPE.DoubleChance]: "doubleChance",
};

const ODDS_TYPE = {
  American: "american-odds",
  Decimal: "decimal-odds",
  AMM: "normalized-implied-odds",
};

module.exports = {
  NETWORK,
  STABLE_DECIMALS,
  BET_TYPE,
  MARKET_TYPE,
  ODDS_TYPE,
};
