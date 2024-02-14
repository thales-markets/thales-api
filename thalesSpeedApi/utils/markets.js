const { SUPPORTED_NETWORKS, SUPPORTED_ASSETS } = require("../constants/markets");

const getIsNetworkSupported = (network) => SUPPORTED_NETWORKS.includes(network);

const getIsAssetSupported = (asset) => SUPPORTED_ASSETS.includes(asset);

module.exports = { getIsNetworkSupported, getIsAssetSupported };
