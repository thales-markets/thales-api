const collateralsOp = require("../assets/collaterals-op.json");
const collateralsOpGoerli = require("../assets/collaterals-op-goerli.json");
const collateralsArb = require("../assets/collaterals-arb.json");
const collateralsBase = require("../assets/collaterals-base.json");
const { NETWORK } = require("./networks");

const DEFAULT_DECIMALS = 2;
const SHORT_DECIMALS = 4;
const LONG_DECIMALS = 8;

const COLLATERAL_KEY = {
  sUSD: "susd",
  DAI: "dai",
  USDC: "usdc",
  USDT: "usdt",
};

const COLLATERALS = {
  [NETWORK.Optimism]: collateralsOp,
  [NETWORK.OptimismGoerli]: collateralsOpGoerli,
  [NETWORK.Arbitrum]: collateralsArb,
  [NETWORK.Base]: collateralsBase,
};

const DEFAULT_NETWORK_DECIMALS = {
  [NETWORK.Optimism]: 18,
  [NETWORK.OptimismGoerli]: 18,
  [NETWORK.Arbitrum]: 6,
  [NETWORK.Base]: 6,
};

const COLLATERAL_DECIMALS = {
  [COLLATERAL_KEY.sUSD]: 18,
  [COLLATERAL_KEY.DAI]: 18,
  [COLLATERAL_KEY.USDC]: 6,
  [COLLATERAL_KEY.USDT]: 6,
};

module.exports = {
  DEFAULT_DECIMALS,
  SHORT_DECIMALS,
  LONG_DECIMALS,
  DEFAULT_NETWORK_DECIMALS,
  COLLATERALS,
  COLLATERAL_DECIMALS,
};
