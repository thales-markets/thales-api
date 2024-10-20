const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Order is important, used for sorting
const CRYPTO_CURRENCY = [
  "BTC",
  "ETH",
  "SNX",
  "ARB",
  "OP",
  "GMX",
  "LINK",
  "MAGIC",
  "DPX",
  "MATIC",
  "KNC",
  "COMP",
  "REN",
  "LEND",
  "XRP",
  "BCH",
  "LTC",
  "EOS",
  "BNB",
  "XTZ",
  "XMR",
  "ADA",
  "TRX",
  "DASH",
  "ETC",
  "BAT",
  "DAI",
  "PHP",
  "REP",
  "USDCe",
  "USDC",
  "USDT",
  "VELO",
  "ZRX",
  "THALES",
  "SOL",
  "UNI",
  "CRV",
  "AAVE",
  "LYRA",
  "LUNA",
  "PERP",
  "APE",
  "CVX",
  "OHM",
  "LOOKS",
  "DYDX",
  "ETC",
  "BUSD",
  "CAKE",
  "PEPE",
  "WLD",
  "WETH",
];

// Order is important, used for sorting
const COMMODITY = ["XAU", "XAG"];

const POSITION_TYPE = {
  Up: 0,
  Down: 1,
};

const POSITION_NAME = {
  Up: "UP",
  Down: "DOWN",
};

const RANGED_POSITION_TYPE = {
  In: 0,
  Out: 1,
};

const RANGED_POSITION_NAME = {
  In: "IN",
  Out: "OUT",
};

const POSITION_TYPE_NAME_MAP = {
  [POSITION_TYPE.Up]: POSITION_NAME.Up,
  [POSITION_TYPE.Down]: POSITION_NAME.Down,
};

const RANGED_POSITION_TYPE_NAME_MAP = {
  [RANGED_POSITION_TYPE.In]: RANGED_POSITION_NAME.In,
  [RANGED_POSITION_TYPE.Out]: RANGED_POSITION_NAME.Out,
};

const ACTION_TYPE = {
  Buy: "BUY",
  Sell: "SELL",
};

const TRANSACTION_POSITION_MAP = {
  long: POSITION_NAME.Up,
  short: POSITION_NAME.Down,
  in: RANGED_POSITION_NAME.In,
  out: RANGED_POSITION_NAME.Out,
};

const TRANSACTION_POSITION_RESULT_MAP = {
  long: POSITION_TYPE.Up,
  short: POSITION_TYPE.Down,
  in: RANGED_POSITION_TYPE.In,
  out: RANGED_POSITION_TYPE.Out,
};

const POSITION_BALANCE_THRESHOLD = 0.01;

const MARKET_DURATION_IN_DAYS = 90;
const TODAY = new Date();
const MIN_MATURITY = Math.round(
  new Date(new Date().setDate(TODAY.getDate() - MARKET_DURATION_IN_DAYS)).getTime() / 1000,
); // show history for 90 days in the past
const MAX_MATURITY = Math.round(Number(TODAY.getTime() / 1000)); // show history until today

const DEPRECATED_CONTRACT_ADDRESSES = [
  // PositionalMarketManager
  "0x9227334352a890e51e980beb7a56bbdd01499b54",
  // ThalesAMM
  "0x278b5a44397c9d8e52743fedec263c4760dc1a1a",
  // RangedAMM
  "0x2d356b114cbca8deff2d8783eac2a5a5324fe1df",
];

module.exports = {
  ZERO_ADDRESS,
  CRYPTO_CURRENCY,
  COMMODITY,
  POSITION_TYPE,
  POSITION_NAME,
  RANGED_POSITION_TYPE,
  RANGED_POSITION_NAME,
  POSITION_TYPE_NAME_MAP,
  RANGED_POSITION_TYPE_NAME_MAP,
  ACTION_TYPE,
  TRANSACTION_POSITION_MAP,
  POSITION_BALANCE_THRESHOLD,
  MIN_MATURITY,
  MAX_MATURITY,
  DEPRECATED_CONTRACT_ADDRESSES,
  TRANSACTION_POSITION_RESULT_MAP,
};
