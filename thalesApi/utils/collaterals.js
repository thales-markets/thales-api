const { COLLATERALS } = require("../constants/collaterals");

const getDefaultCollateral = (network) => COLLATERALS[network].find((collateral) => collateral.default);

const getNonDefaultCollateralSymbols = (network) =>
  COLLATERALS[network].filter((collateral) => !collateral.default).map((collateral) => collateral.symbol);

const getCollateral = (network, collateral) =>
  collateral
    ? COLLATERALS[network].find((c) => c.symbol.toLowerCase() === collateral.toLowerCase())
    : getDefaultCollateral(network);

const getCollateralAddress = (network, collateral) => getCollateral(network, collateral).address;

const getCollateralDecimals = (network, collateral) => getCollateral(network, collateral).decimals;

module.exports = {
  getDefaultCollateral,
  getNonDefaultCollateralSymbols,
  getCollateral,
  getCollateralAddress,
  getCollateralDecimals,
};
