const NETWORK = {
  Optimism: 10,
  OptimismSepolia: 11155420,
  Arbitrum: 42161,
  Base: 8453,
};

const NETWORK_NAME = {
  [NETWORK.Optimism]: "optimisim",
  [NETWORK.OptimismSepolia]: "optimisim sepolia",
  [NETWORK.Arbitrum]: "arbitrum",
  [NETWORK.Base]: "base",
};

module.exports = {
  NETWORK,
  NETWORK_NAME,
};
