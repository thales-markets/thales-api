const NETWORK = {
  Optimism: 10,
  OptimismGoerli: 420,
  Arbitrum: 42161,
};

const NETWORK_NAME = {
  [NETWORK.Optimism]: "optimisim",
  [NETWORK.OptimismGoerli]: "optimisim goerli",
  [NETWORK.Arbitrum]: "arbitrum",
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
  [BET_TYPE.Moneyline]: "moneyline",
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
  NETWORK_NAME,
  STABLE_DECIMALS,
  BET_TYPE,
  MARKET_TYPE,
  ODDS_TYPE,
};
