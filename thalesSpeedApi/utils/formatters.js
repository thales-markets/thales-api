const { ethers } = require("ethers");
const { getDefaultDecimalsForNetwork } = require("../utils/networks");

const coinFormatter = (value, network, currency) => {
  const decimals = currency ? COLLATERAL_DECIMALS[currency] : getDefaultDecimalsForNetwork(network);

  return Number(ethers.utils.formatUnits(value, decimals));
};

module.exports = {
  coinFormatter,
};
