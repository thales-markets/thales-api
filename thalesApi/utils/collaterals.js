const { NETWORK } = require("../constants/networks");

const getDefaultDecimalsForNetwork = (network) => {
  if ([NETWORK.Arbitrum, NETWORK.Polygon, NETWORK.Base].includes(network)) return 6;
  return 18;
};

module.exports = {
  getDefaultDecimalsForNetwork,
};
