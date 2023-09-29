const NETWORK = {
  Optimism: 10,
  OptimismGoerli: 420,
  Arbitrum: 42161,
  Base: 8453,
};

const NETWORK_NAME = {
  [NETWORK.Optimism]: "optimisim",
  [NETWORK.OptimismGoerli]: "optimisim goerli",
  [NETWORK.Arbitrum]: "arbitrum",
  [NETWORK.Base]: "base",
};

module.exports = {
  NETWORK,
  NETWORK_NAME,
};
