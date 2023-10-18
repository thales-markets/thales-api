const NETWORK = {
  Optimism: 10,
  Polygon: 137,
  Arbitrum: 42161,
  Base: 8453,
};

const NETWORK_NAME = {
  [NETWORK.Optimism]: "optimisim",
  [NETWORK.Polygon]: "polygon",
  [NETWORK.Arbitrum]: "arbitrum",
  [NETWORK.Base]: "base",
};

module.exports = {
  NETWORK,
  NETWORK_NAME,
};
