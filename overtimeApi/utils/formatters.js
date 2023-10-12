const { ethers } = require("ethers");
const { DEFAULT_DECIMALS, SHORT_DECIMALS, LONG_DECIMALS } = require("../constants/collaterals");

const getPrecision = (amount) => {
  if (Number(amount) >= 1) {
    return DEFAULT_DECIMALS;
  }
  if (Number(amount) >= 0.01) {
    return SHORT_DECIMALS;
  }
  return LONG_DECIMALS;
};

const bigNumberFormatter = (value, decimals) => Number(ethers.utils.formatUnits(value, decimals ? decimals : 18));

const bigNumberParser = (value, decimals) => ethers.utils.parseUnits(value, decimals ? decimals : 18);

const ceilNumberToDecimals = (value, decimals = DEFAULT_DECIMALS) => {
  return Math.ceil(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const floorNumberToDecimals = (value, decimals = DEFAULT_DECIMALS) => {
  return Math.floor(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const roundNumberToDecimals = (value, decimals = DEFAULT_DECIMALS) => {
  return +(Math.round(Number(value + "e+" + decimals)) + "e-" + decimals);
};

module.exports = {
  getPrecision,
  bigNumberFormatter,
  bigNumberParser,
  ceilNumberToDecimals,
  floorNumberToDecimals,
  roundNumberToDecimals,
};
