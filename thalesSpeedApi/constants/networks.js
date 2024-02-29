const NETWORK = {
  Optimism: 10,
  Polygon: 137,
  ZkSyncSepolia: 300,
  ZkSync: 324,
  OptimismGoerli: 420,
  Base: 8453,
  Arbitrum: 42161,
  BlastSepolia: 168587773,
};

const NETWORK_NAME = {
  [NETWORK.Optimism]: "optimisim",
  [NETWORK.Polygon]: "polygon",
  [NETWORK.ZkSyncSepolia]: "zksync sepolia",
  [NETWORK.ZkSync]: "zksync",
  [NETWORK.OptimismGoerli]: "optimisim goerli",
  [NETWORK.Base]: "base",
  [NETWORK.Arbitrum]: "arbitrum",
  [NETWORK.BlastSepolia]: "blast sepolia",
};

module.exports = {
  NETWORK,
  NETWORK_NAME,
};
