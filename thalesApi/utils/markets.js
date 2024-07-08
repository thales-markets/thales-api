const { parseBytes32String } = require("ethers/lib/utils");
const {
  CRYPTO_CURRENCY,
  COMMODITY,
  RANGED_POSITION_NAME,
  ACTION_TYPE,
  TRANSACTION_POSITION_MAP,
  RANGED_POSITION_TYPE_NAME_MAP,
  POSITION_TYPE_NAME_MAP,
} = require("../constants/markets");
const { getDefaultCollateral } = require("./collaterals");
const { bigNumberFormatter } = require("./formatters");

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

const getPositionStatus = (position) =>
  position.isOpen ? "OPEN" : position.isClaimable || position.isClaimed ? "WON" : "LOSS";

const getTradeStatus = (trade, isBuy) =>
  isBuy
    ? isMarketResolved(trade.marketItem.result)
      ? trade.marketItem.result === trade.optionSide
        ? "WON"
        : "LOSS"
      : "OPEN"
    : "SOLD";

const packPosition = (position, network) => {
  const isRangedMarket = isRangedPosition(position.position.side);
  const defaultCollateralDecimals = getDefaultCollateral(network).decimals;
  const packedMarket = packPositionMarket(position.position.market, isRangedMarket);

  const packedPosition = {
    account: position.account,
    amount: bigNumberFormatter(position.amount),
    paid: bigNumberFormatter(position.paid, defaultCollateralDecimals),
    position: TRANSACTION_POSITION_MAP[position.position.side],
  };

  packedPosition.isOpen = packedMarket.isOpen;
  packedPosition.isClaimable =
    packedMarket.isResolved && position.position === packedMarket.result && !position.isClaimed;
  packedPosition.isClaimed = !!position.isClaimed;
  packedPosition.status = getPositionStatus(packedPosition);
  packedPosition.market = packedMarket;

  return packedPosition;
};

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
    market: packTradeMarket(trade.marketItem, isRangedMarket),
  };

  return packedTrade;
};

const packPositionMarket = (market, isRangedMarket) => {
  let packedMarket = {
    address: market.id,
    asset: parseBytes32String(market.currencyKey),
    maturityDate: new Date(Number(market.maturityDate) * 1000).toISOString(),
    expiryDate: new Date(Number(market.expiryDate) * 1000).toISOString(),
  };

  if (isRangedMarket) {
    packedMarket.leftPrice = bigNumberFormatter(market.leftPrice);
    packedMarket.rightPrice = bigNumberFormatter(market.rightPrice);
  } else {
    packedMarket.strikePrice = bigNumberFormatter(market.strikePrice);
  }

  packedMarket = {
    ...packedMarket,
    isOpen: !isMarketResolved(market.result),
    isResolved: isMarketResolved(market.result),
    isExpired: isMarketExpired(Number(market.expiryDate) * 1000),
    result: isMarketResolved(market.result)
      ? isRangedMarket
        ? RANGED_POSITION_TYPE_NAME_MAP[market.result]
        : POSITION_TYPE_NAME_MAP[market.result]
      : null,
    finalPrice: isMarketResolved(market.result) ? bigNumberFormatter(market.finalPrice) : 0,
  };

  return packedMarket;
};

const packTradeMarket = (market, isRangedMarket) => {
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
  isMarketExpired,
  packPosition,
  packTrade,
};
