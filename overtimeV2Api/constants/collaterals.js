const collateralsOp = require("../assets/collaterals-op.json");
const { NETWORK } = require("./networks");

const DEFAULT_DECIMALS = 2;
const SHORT_DECIMALS = 4;
const LONG_DECIMALS = 8;

const COLLATERALS = {
  [NETWORK.Optimism]: collateralsOp,
};

module.exports = {
  DEFAULT_DECIMALS,
  SHORT_DECIMALS,
  LONG_DECIMALS,
  COLLATERALS,
};
