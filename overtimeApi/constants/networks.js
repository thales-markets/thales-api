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

module.exports = {
  NETWORK,
  NETWORK_NAME,
};
