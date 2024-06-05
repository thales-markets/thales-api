const collateralsOp = require("../assets/collaterals-op.json");
const collateralsArb = require("../assets/collaterals-arb.json");
const collateralsBase = require("../assets/collaterals-base.json");
const { NETWORK } = require("./networks");

const DEFAULT_DECIMALS = 2;
const SHORT_DECIMALS = 4;
const LONG_DECIMALS = 8;

const COLLATERALS = {
  [NETWORK.Optimism]: collateralsOp,
  [NETWORK.Arbitrum]: collateralsArb,
  [NETWORK.Base]: collateralsBase,
};

module.exports = {
  DEFAULT_DECIMALS,
  SHORT_DECIMALS,
  LONG_DECIMALS,
  COLLATERALS,
};
