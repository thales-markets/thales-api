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

const SUPPORTED_NETWORKS = [NETWORK.Optimism, NETWORK.Arbitrum, NETWORK.OptimismSepolia];

module.exports = {
  NETWORK,
  NETWORK_NAME,
  SUPPORTED_NETWORKS,
};
