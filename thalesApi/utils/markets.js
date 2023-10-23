const { CRYPTO_CURRENCY, COMMODITY, RANGED_POSITION_NAME } = require("../constants/markets");

const getCurrencyPriority = (currency) => {
  const currencyPriority = CRYPTO_CURRENCY.indexOf(currency);
  const commodityPriority = CRYPTO_CURRENCY.length + COMMODITY.indexOf(currency);
  return currencyPriority !== -1 ? currencyPriority : commodityPriority;
};

const convertPriceImpactToBonus = (priceImpact) => (priceImpact < 0 ? -(priceImpact / (1 + priceImpact)) : 0);

const calculatRoi = (price) => (1 - price) / price;

const isRangedPosition = (position) => [RANGED_POSITION_NAME.In, RANGED_POSITION_NAME.Out].includes(position);

module.exports = {
  getCurrencyPriority,
  convertPriceImpactToBonus,
  calculatRoi,
  isRangedPosition,
};
