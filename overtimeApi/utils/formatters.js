const { ethers } = require("ethers");
const { DEFAULT_DECIMALS } = require("../constants/collaterals");

const bigNumberFormatter = (value, decimals) => Number(ethers.utils.formatUnits(value, decimals ? decimals : 18));

const bigNumberParser = (value, decimals) => ethers.utils.parseUnits(value, decimals ? decimals : 18);

const floorNumberToDecimals = (value, decimals = DEFAULT_DECIMALS) => {
  return Math.floor(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const roundNumberToDecimals = (value, decimals = DEFAULT_DECIMALS) => {
  return +(Math.round(Number(value + "e+" + decimals)) + "e-" + decimals);
};

module.exports = {
  bigNumberFormatter,
  bigNumberParser,
  floorNumberToDecimals,
  roundNumberToDecimals,
};
