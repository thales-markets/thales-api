const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");

const CHAINNODES_URL = {
  [NETWORK.Optimism]: "https://optimism-mainnet.chainnodes.org/",
  [NETWORK.Arbitrum]: "https://arbitrum-one.chainnodes.org/",
  [NETWORK.Polygon]: "https://polygon-mainnet.chainnodes.org/",
};

const getProvider = (network) => {
  return new ethers.providers.JsonRpcProvider(
    Number(network) === NETWORK.Base
      ? process.env.ANKR_BASE_URL
      : Number(network) === NETWORK.Arbitrum
      ? "https://rpc.ankr.com/arbitrum/4b25751bb87329cad269f3489cb9f0205d1b272853d0f789a8020ed37c34b57f"
      : Number(network) === NETWORK.Optimism
      ? "https://rpc.ankr.com/optimism/4b25751bb87329cad269f3489cb9f0205d1b272853d0f789a8020ed37c34b57f"
      : `${CHAINNODES_URL[network]}${process.env.CHAINNODES_ID}`,
  );
};

module.exports = {
  getProvider,
};
