const { CRYPTO_CURRENCY_MAP } = require("./currency");

const PRICE_ID = {
  [CRYPTO_CURRENCY_MAP.ETH]: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD price id in mainnet
  [CRYPTO_CURRENCY_MAP.BTC]: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // BTC/USD price id in mainnet
};

const LATEST_VAAS_URL = "https://hermes.pyth.network/api/latest_vaas?ids[]=";

module.exports = {
  PRICE_ID,
  LATEST_VAAS_URL,
};
