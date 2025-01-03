const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const CHAINNODES_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.OptimismSepolia]: "",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
  [NETWORK.Base]: "https://base-mainnet.chainnodes.org/",
};

const ANKR_URL = {
  [NETWORK.Optimism]: "https://rpc.ankr.com/optimism/",
  [NETWORK.OptimismSepolia]: "https://rpc.ankr.com/optimism_sepolia/",
  [NETWORK.Arbitrum]: "https://rpc.ankr.com/arbitrum/",
  [NETWORK.Base]: "https://rpc.ankr.com/base/",
};

const BLAST_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.blastapi.io/",
  [NETWORK.OptimismSepolia]: "https://optimism-sepolia.blastapi.io/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.blastapi.io/",
  [NETWORK.Base]: "https://base-mainnet.blastapi.io/",
};

const LLAMA_URL = {
  [NETWORK.Optimism]: "https://optimism.llamarpc.com/sk_llama_",
  [NETWORK.Arbitrum]: "https://arbitrum.llamarpc.com/sk_llama_",
  [NETWORK.Base]: "https://base.llamarpc.com/sk_llama_",
};

const INFURA_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.infura.io/v3/",
  [NETWORK.OptimismSepolia]: "https://optimism-sepolia.infura.io/v3/",
  [NETWORK.Arbitrum]: "https://arbitrum-mainnet.infura.io/v3/",
  [NETWORK.Base]: "https://base-mainnet.infura.io/v3/",
};

const getProvider = (network) => {
  let rpcUrl = "";
  switch (process.env.RPC_PROVIDER) {
    case "infura":
      rpcUrl = `${INFURA_URL[network]}${process.env.INFURA_ID}`;
      break;
    case "llama":
      rpcUrl =
        Number(network) === NETWORK.OptimismSepolia
          ? `${BLAST_URL[network]}${process.env.BLAST_ID}`
          : `${LLAMA_URL[network]}${process.env.LLAMA_ID}`;
      break;
    case "ankr":
      rpcUrl = `${ANKR_URL[network]}${process.env.ANKR_ID}`;
      break;
    case "blast":
      rpcUrl = `${BLAST_URL[network]}${process.env.BLAST_ID}`;
      break;
    default:
      rpcUrl =
        Number(network) === NETWORK.OptimismSepolia
          ? `${BLAST_URL[network]}${process.env.BLAST_ID}`
          : `${CHAINNODES_URL[network]}${process.env.CHAINNODES_ID}`;
      break;
  }

  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

module.exports = {
  getProvider,
};
