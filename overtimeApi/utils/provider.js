const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const CHAINNODES_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.OptimismGoerli]: "https://optimism-goerli.chainnodes.org/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
  [NETWORK.Base]: "https://base-mainnet.chainnodes.org/",
};

const ANKR_URL = {
  [NETWORK.Optimism]: "https://rpc.ankr.com/optimism/",
  [NETWORK.Arbitrum]: "https://rpc.ankr.com/arbitrum/",
  [NETWORK.Base]: "https://rpc.ankr.com/base/",
};

const BLAST_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.blastapi.io/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.blastapi.io/",
  [NETWORK.Base]: "https://base-mainnet.blastapi.io/",
};

const LLAMA_URL = {
  [NETWORK.Optimism]: "https://optimism.llamarpc.com/sk_llama_",
  [NETWORK.Arbitrum]: "https://arbitrum.llamarpc.com/sk_llama_",
  [NETWORK.Base]: "https://base.llamarpc.com/sk_llama_",
};

const getProvider = (network) => {
  let rpcUrl = "";
  switch (process.env.RPC_PROVIDER) {
    case "llama":
      rpcUrl = `${LLAMA_URL[network]}${process.env.LLAMA_ID}`;
      break;
    case "ankr":
      rpcUrl = `${ANKR_URL[network]}${process.env.ANKR_ID}`;
      break;
    case "blast":
      rpcUrl = `${BLAST_URL[network]}${process.env.BLAST_ID}`;
      break;
    default:
      `${CHAINNODES_URL[network]}${process.env.CHAINNODES_ID}`;
      break;
  }

  return new ethers.providers.JsonRpcProvider(rpcUrl);
};
module.exports = {
  getProvider,
};
