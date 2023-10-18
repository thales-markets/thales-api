const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const CHAINNODES_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.Polygon]: "https://polygon-mainnet.chainnodes.org/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
};

const ANKR_URL = {
  [NETWORK.Optimism]: "https://rpc.ankr.com/optimism/",
  [NETWORK.Polygon]: "https://rpc.ankr.com/polygon/",
  [NETWORK.Arbitrum]: "https://rpc.ankr.com/arbitrum/",
  [NETWORK.Base]: "https://rpc.ankr.com/base/",
};

const BLAST_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.blastapi.io/",
  [NETWORK.Polygon]: "https://polygon-mainnet.blastapi.io/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.blastapi.io/",
  [NETWORK.Base]: "https://base-mainnet.blastapi.io/",
};

const getProvider = (network) => {
  let rpcUrl = "";
  switch (process.env.RPC_PROVIDER) {
    case "ankr":
      rpcUrl = `${ANKR_URL[network]}${process.env.ANKR_ID}`;
      break;
    case "blast":
      rpcUrl = `${BLAST_URL[network]}${process.env.BLAST_ID}`;
      break;
    default:
      rpcUrl =
        Number(network) === NETWORK.Base
          ? `${ANKR_URL[network]}${process.env.ANKR_ID}`
          : `${CHAINNODES_URL[network]}${process.env.CHAINNODES_ID}`;
      break;
  }

  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

module.exports = {
  getProvider,
};
