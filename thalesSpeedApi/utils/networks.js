const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { SUPPORTED_NETWORKS } = require("../constants/markets");

const getSupportedNetworks = () =>
  SUPPORTED_NETWORKS.map((network) => network + " (" + NETWORK_NAME[network] + ")").join(", ");

const getDefaultDecimalsForNetwork = (network) => {
  if ([NETWORK.Arbitrum, NETWORK.Base, NETWORK.PolygonMainnet, NETWORK.ZkSync].includes(network)) return 6;
  return 18;
};

module.exports = { getSupportedNetworks, getDefaultDecimalsForNetwork };
