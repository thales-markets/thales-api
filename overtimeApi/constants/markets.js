const NETWORK = {
  Optimism: 10,
  OptimismGoerli: 420,
  Arbitrum: 42161,
};

const NETWORK_NAME = {
  [NETWORK.Optimism]: "optimisim",
  [NETWORK.OptimismGoerli]: "optimisim goerli",
  [NETWORK.Arbitrum]: "arbitrum",
};

const BET_TYPE = {
  Moneyline: 0,
  Spread: 10001,
  Total: 10002,
  DoubleChance: 10003,
};

const MARKET_TYPE = {
  [BET_TYPE.Moneyline]: "moneyline",
  [BET_TYPE.Spread]: "spread",
  [BET_TYPE.Total]: "total",
  [BET_TYPE.DoubleChance]: "doubleChance",
};

const ODDS_TYPE = {
  American: "american-odds",
  Decimal: "decimal-odds",
  AMM: "normalized-implied-odds",
};

const POSITION_NAME = {
  Home: "home",
  Away: "away",
  Draw: "draw",
};

const POSITION_TYPE = {
  Home: 0,
  Away: 1,
  Draw: 2,
};

const FINAL_RESULT_TYPE = {
  Canceled: 0,
  Home: 1,
  Away: 2,
  Draw: 3,
};

const POSITION_NAME_TYPE_MAP = {
  [POSITION_NAME.Home]: POSITION_TYPE.Home,
  [POSITION_NAME.Away]: POSITION_TYPE.Away,
  [POSITION_NAME.Draw]: POSITION_TYPE.Draw,
};

const FINAL_RESULT_TYPE_POSITION_TYPE_MAP = {
  [FINAL_RESULT_TYPE.Home]: POSITION_TYPE.Home,
  [FINAL_RESULT_TYPE.Away]: POSITION_TYPE.Away,
  [FINAL_RESULT_TYPE.Draw]: POSITION_TYPE.Draw,
};

const MARKET_DURATION_IN_DAYS = 90;
const PARLAY_MAXIMUM_QUOTE = 0.01449275;

const DEFAULT_CURRENCY_DECIMALS = 2;

const COLLATERAL_KEY = {
  sUSD: "susd",
  DAI: "dai",
  USDC: "usdc",
  USDT: "usdt",
};

const SUPPORTED_COLLATERALS = {
  [NETWORK.Optimism]: {
    [COLLATERAL_KEY.sUSD]: "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9",
    [COLLATERAL_KEY.DAI]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    [COLLATERAL_KEY.USDC]: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    [COLLATERAL_KEY.USDT]: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  },
  [NETWORK.OptimismGoerli]: {
    [COLLATERAL_KEY.sUSD]: "0xE1ceaa829525a08C1d39A5CEBe4b42aF58d77198",
  },
  [NETWORK.Arbitrum]: {
    [COLLATERAL_KEY.USDC]: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
  },
};

const DEAFULT_DECIMALS = {
  [NETWORK.Optimism]: 18,
  [NETWORK.OptimismGoerli]: 18,
  [NETWORK.Arbitrum]: 6,
};

const COLLATERAL_DECIMALS = {
  [COLLATERAL_KEY.sUSD]: 18,
  [COLLATERAL_KEY.DAI]: 18,
  [COLLATERAL_KEY.USDC]: 6,
  [COLLATERAL_KEY.USDT]: 6,
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = {
  NETWORK,
  NETWORK_NAME,
  DEAFULT_DECIMALS,
  BET_TYPE,
  MARKET_TYPE,
  ODDS_TYPE,
  MARKET_DURATION_IN_DAYS,
  POSITION_NAME,
  POSITION_TYPE,
  POSITION_NAME_TYPE_MAP,
  PARLAY_MAXIMUM_QUOTE,
  FINAL_RESULT_TYPE_POSITION_TYPE_MAP,
  DEFAULT_CURRENCY_DECIMALS,
  SUPPORTED_COLLATERALS,
  COLLATERAL_DECIMALS,
  ZERO_ADDRESS,
};
