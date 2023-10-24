const {
  CRYPTO_CURRENCY,
  COMMODITY,
  RANGED_POSITION_NAME,
  ACTION_TYPE,
  TRANSACTION_POSITION_MAP,
} = require("../constants/markets");

const getCurrencyPriority = (currency) => {
  const currencyPriority = CRYPTO_CURRENCY.indexOf(currency);
  const commodityPriority = CRYPTO_CURRENCY.length + COMMODITY.indexOf(currency);
  return currencyPriority !== -1 ? currencyPriority : commodityPriority;
};

const convertPriceImpactToBonus = (priceImpact) => (priceImpact < 0 ? -(priceImpact / (1 + priceImpact)) : 0);

const calculatRoi = (price) => (1 - price) / price;

const isRangedPosition = (position) =>
  [RANGED_POSITION_NAME.In, RANGED_POSITION_NAME.Out].includes(position.toUpperCase());

const isMarketResolved = (result) => result !== null;

const isMarketExpired = (expiryDate) => expiryDate < new Date().getTime();

const getTradeStatus = (trade, isBuy) =>
  isBuy
    ? isMarketResolved(trade.marketItem.result)
      ? trade.marketItem.result === trade.optionSide
        ? "WON"
        : "LOST"
      : "OPEN"
    : "SOLD";

const packTrade = (trade) => {
  const isBuy = trade.orderSide == ACTION_TYPE.Buy.toLowerCase();
  const isRangedMarket = isRangedPosition(trade.optionSide);

  let packedTrade = {
    hash: trade.transactionHash,
    timestamp: trade.timestamp,
    account: trade.taker,
    price: isBuy ? trade.takerAmount / trade.makerAmount : trade.makerAmount / trade.takerAmount,
    amount: isBuy ? trade.makerAmount : trade.takerAmount,
  };

  if (isBuy) {
    packedTrade.paid = trade.takerAmount;
  } else {
    packedTrade.received = trade.makerAmount;
  }

  packedTrade = {
    ...packedTrade,
    position: TRANSACTION_POSITION_MAP[trade.optionSide],
    status: getTradeStatus(trade, isBuy),
    market: packMarket(trade.marketItem, isRangedMarket),
  };

  return packedTrade;
};

const packMarket = (market, isRangedMarket) => {
  let packedMarket = {
    address: market.address,
    asset: market.currencyKey,
    maturityDate: new Date(market.maturityDate).toISOString(),
    expiryDate: new Date(market.expiryDate).toISOString(),
  };

  if (isRangedMarket) {
    packedMarket.leftPrice = market.leftPrice;
    packedMarket.rightPrice = market.rightPrice;
  } else {
    packedMarket.strikePrice = market.strikePrice;
  }

  packedMarket = {
    ...packedMarket,
    isOpen: !isMarketResolved(market.result),
    isResolved: isMarketResolved(market.result),
    isExpired: isMarketExpired(market.expiryDate),
    result: isMarketResolved(market.result) ? TRANSACTION_POSITION_MAP[market.result] : null,
    finalPrice: market.finalPrice,
  };

  return packedMarket;
};

module.exports = {
  getCurrencyPriority,
  convertPriceImpactToBonus,
  calculatRoi,
  isRangedPosition,
  packTrade,
  packMarket,
};
