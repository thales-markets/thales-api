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
  Winner: 0,
  Spread: 10001,
  Total: 10002,
  DoubleChance: 10003,
};

module.exports = {
  NETWORK,
  STABLE_DECIMALS,
  BET_TYPE,
};
