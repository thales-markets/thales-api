const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const PROVIDER_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.OptimismGoerli]: "https://optimism-goerli.chainnodes.org/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
};

const getProvider = (network) =>
  new ethers.providers.JsonRpcProvider(`${PROVIDER_URL[network]}${process.env.CHAINNODES_ID}`);

module.exports = {
  getProvider,
};
