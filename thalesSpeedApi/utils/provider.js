const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const PROVIDER_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.OptimismGoerli]: "https://optimism-goerli.chainnodes.org/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
  [NETWORK.Base]: "https://base-mainnet.chainnodes.org/",
  [NETWORK.Polygon]: "https://polygon-mainnet.chainnodes.org/", // TODO: check if it works or use Infura
  [NETWORK.ZkSync]: "https://mainnet.era.zksync.io",
  [NETWORK.ZkSyncSepolia]: "https://sepolia.era.zksync.dev",
  [NETWORK.BlastSepolia]: "https://sepolia.blast.io",
};

const getProvider = (network) =>
  new ethers.providers.JsonRpcProvider(
    `${PROVIDER_URL[network]}${PROVIDER_URL[network].includes("chainnodes") ? process.env.CHAINNODES_ID : ""}`,
  );

module.exports = {
  getProvider,
};
