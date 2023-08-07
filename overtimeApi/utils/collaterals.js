const { SUPPORTED_COLLATERALS, COLLATERAL_DECIMALS, DEFAULT_NETWORK_DECIMALS } = require("../constants/collaterals");

const getCollateralAddress = (network, collateral) =>
  collateral ? SUPPORTED_COLLATERALS[network][collateral.toLowerCase()] : undefined;

const getCollateralDecimals = (network, collateral) =>
  collateral ? COLLATERAL_DECIMALS[collateral.toLowerCase()] : DEFAULT_NETWORK_DECIMALS[network];

module.exports = {
  getCollateralAddress,
  getCollateralDecimals,
};
