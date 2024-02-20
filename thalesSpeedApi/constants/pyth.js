const { CRYPTO_CURRENCY_MAP } = require("./currency");

const PRICE_ID = {
  [CRYPTO_CURRENCY_MAP.ETH]: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD price id in mainnet
  [CRYPTO_CURRENCY_MAP.BTC]: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // BTC/USD price id in mainnet
};

const LATEST_PRICE_UPDATE_URL = "https://hermes.pyth.network/v2/updates/price/latest?ids[]=";

const PYTH_CURRENCY_DECIMALS = 8;

module.exports = {
  PRICE_ID,
  LATEST_PRICE_UPDATE_URL,
  PYTH_CURRENCY_DECIMALS,
};
