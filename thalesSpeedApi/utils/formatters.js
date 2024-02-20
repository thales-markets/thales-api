const { ethers } = require("ethers");
const { COLLATERAL_DECIMALS } = require("../constants/currency");
const { getDefaultDecimalsForNetwork } = require("../utils/networks");

const bigNumberFormatter = (value, decimals) =>
  Number(ethers.utils.formatUnits(value, decimals !== undefined ? decimals : 18));

const coinFormatter = (value, network, currency) => {
  const decimals = currency ? COLLATERAL_DECIMALS[currency] : getDefaultDecimalsForNetwork(network);
  return Number(ethers.utils.formatUnits(value, decimals));
};

const coinParser = (value, networkId, currency) => {
  const decimals = currency ? COLLATERAL_DECIMALS[currency] : getDefaultDecimalsForNetwork(networkId);
  return ethers.utils.parseUnits(floorNumberToDecimals(value, decimals).toString(), decimals);
};

const skewParser = (value) => ethers.utils.parseUnits(value.toString(), 18);

const assetFormatter = (asset) => ethers.utils.formatBytes32String(asset);

const floorNumberToDecimals = (value, decimals = 2) =>
  Math.floor(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

const truncToDecimals = (value, decimals = 2) => {
  const matchedValue = value.toString().match(`^-?\\\d+(?:\\\.\\\d{0,${decimals}})?`);
  return matchedValue !== null ? matchedValue[0] : "0";
};

const roundNumberToDecimals = (value, decimals = 2) => {
  return +(Math.round(Number(value + "e+" + decimals)) + "e-" + decimals);
};

module.exports = {
  coinFormatter,
  assetFormatter,
  coinParser,
  truncToDecimals,
  bigNumberFormatter,
  skewParser,
  roundNumberToDecimals,
};
