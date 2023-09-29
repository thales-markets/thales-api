const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const CHAINNODES_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.OptimismGoerli]: "https://optimism-goerli.chainnodes.org/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
};

const getProvider = (network) => {
  return new ethers.providers.JsonRpcProvider(
    Number(network) === NETWORK.Base
      ? process.env.ANKR_BASE_URL
      : `${CHAINNODES_URL[network]}${process.env.CHAINNODES_ID}`,
  );
};

module.exports = {
  getProvider,
};
