const { COLLATERALS } = require("../constants/collaterals");

const getDefaultCollateral = (network) => COLLATERALS[network].find((collateral) => collateral.default);

module.exports = {
  getDefaultCollateral,
};
