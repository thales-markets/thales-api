const collateralsOp = require("../assets/collaterals-op.json");
const collateralsUsdcOp = require("../assets/collaterals-usdc-op.json");
const collateralsPolygon = require("../assets/collaterals-polygon.json");
const collateralsArb = require("../assets/collaterals-arb.json");
const collateralsBase = require("../assets/collaterals-base.json");
const { NETWORK } = require("./networks");

const DEFAULT_DECIMALS = 2;
const SHORT_DECIMALS = 4;
const LONG_DECIMALS = 8;

const COLLATERALS = {
  [NETWORK.Optimism]: collateralsOp,
  [NETWORK.Polygon]: collateralsPolygon,
  [NETWORK.Arbitrum]: collateralsArb,
  [NETWORK.Base]: collateralsBase,
};

const USDC_COLLATERALS = {
  [NETWORK.Optimism]: collateralsUsdcOp,
  [NETWORK.Polygon]: collateralsPolygon,
  [NETWORK.Arbitrum]: collateralsArb,
  [NETWORK.Base]: collateralsBase,
};

const LP_COLLATERALS = {
  USDC: "usdc",
  sUSD: "susd",
};

module.exports = {
  DEFAULT_DECIMALS,
  SHORT_DECIMALS,
  LONG_DECIMALS,
  COLLATERALS,
  LP_COLLATERALS,
  USDC_COLLATERALS,
};
