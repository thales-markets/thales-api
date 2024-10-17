const { COLLATERALS, USDC_COLLATERALS } = require("../constants/collaterals");

const getDefaultCollateral = (network, isUsdc) =>
  (isUsdc ? USDC_COLLATERALS : COLLATERALS)[network].find((collateral) => collateral.default);

const getNonDefaultCollateralSymbols = (network, isUsdc) =>
  (isUsdc ? USDC_COLLATERALS : COLLATERALS)[network]
    .filter((collateral) => !collateral.default)
    .map((collateral) => collateral.symbol);

const getCollateral = (network, isUsdc, collateral) =>
  collateral
    ? (isUsdc ? USDC_COLLATERALS : COLLATERALS)[network].find(
        (c) => c.symbol.toLowerCase() === collateral.toLowerCase(),
      )
    : getDefaultCollateral(network, isUsdc);

const getCollateralAddress = (network, isUsdc, collateral) => getCollateral(network, isUsdc, collateral).address;

const getCollateralDecimals = (network, isUsdc, collateral) => getCollateral(network, isUsdc, collateral).decimals;

module.exports = {
  getDefaultCollateral,
  getNonDefaultCollateralSymbols,
  getCollateral,
  getCollateralAddress,
  getCollateralDecimals,
};
