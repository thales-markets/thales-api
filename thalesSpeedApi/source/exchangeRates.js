const { ethers } = require("ethers");
const priceFeedContract = require("../contracts/priceFeedContract.js");
const { CRYPTO_CURRENCY_MAP } = require("../constants/currency");
const { getProvider } = require("../utils/provider");
const { bigNumberFormatter } = require("../utils/formatters");

const getExchangeRates = async (network) => {
  const exchangeRates = {};

  try {
    const provider = getProvider(network);
    const priceFeed = priceFeedContract.addresses[network]
      ? new ethers.Contract(priceFeedContract.addresses[network], priceFeedContract.abi, provider)
      : undefined;

    if (priceFeed) {
      const [currencies, rates] = await Promise.all([priceFeed.getCurrencies(), priceFeed.getRates()]);

      currencies.forEach((currency, idx) => {
        const currencyName = ethers.utils.parseBytes32String(currency);
        exchangeRates[currencyName] = bigNumberFormatter(rates[idx]);
        if (currencyName === "SUSD") {
          exchangeRates[CRYPTO_CURRENCY_MAP.sUSD] = bigNumberFormatter(rates[idx]);
        } else {
          exchangeRates[`s${currencyName}`] = bigNumberFormatter(rates[idx]);
        }
        if (currencyName === CRYPTO_CURRENCY_MAP.ETH) {
          exchangeRates[`W${currencyName}`] = bigNumberFormatter(rates[idx]);
        }
      });
    }
  } catch (e) {
    console.log("Error: could not get exchange rates.", e);
  }

  return exchangeRates;
};

module.exports = { getExchangeRates };
