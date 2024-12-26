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

const getCollateralSymbolByAddress = (network, collateralAddress) => {
  const collateral = COLLATERALS[network].find(
    (collateral) => collateral.address.toLowerCase() === collateralAddress.toLowerCase(),
  );

  return collateral ? collateral.symbol : "";
};

const isLpSupported = (collateral) => {
  return (
    !collateral ||
    collateral.toUpperCase() === "USDC" ||
    collateral.toUpperCase() === "WETH" ||
    collateral.toUpperCase() === "ETH" ||
    collateral.toUpperCase() === "THALES"
  );
};

const isThales = (collateral) => {
  return !!collateral && (collateral.toUpperCase() === "THALES" || collateral.toUpperCase() === "THALES-CONTRACT");
};

module.exports = {
  getDefaultCollateral,
  getNonDefaultCollateralSymbols,
  getCollateral,
  getCollateralAddress,
  getCollateralDecimals,
  getCollateralSymbolByAddress,
  isLpSupported,
  isThales,
};
