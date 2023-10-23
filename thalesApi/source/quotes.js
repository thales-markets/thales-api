require("dotenv").config();
const { getProvider } = require("../utils/provider");
const positionalMarketDataContract = require("../contracts/positionalMarketDataContract");
const ammContract = require("../contracts/ammContract");
const rangedAmmContract = require("../contracts/rangedAmmContract");
const { ethers } = require("ethers");
const {
  RANGED_POSITION_TYPE,
  POSITION_TYPE,
  RANGED_POSITION_TYPE_NAME_MAP,
  POSITION_TYPE_NAME_MAP,
} = require("../constants/markets");
const {
  getCollateralDecimals,
  getCollateralAddress,
  getDefaultCollateral,
  getCollateral,
} = require("../utils/collaterals");
const {
  bigNumberFormatter,
  bigNumberParser,
  floorNumberToDecimals,
  roundNumberToDecimals,
} = require("../utils/formatters");
const { getRangedAmmQuoteAndPriceImpactMethods, getAmmQuoteAndPriceImpactMethods } = require("../utils/amm");
const { fetchAmountOfTokensForXsUSDAmount } = require("../../overtimeApi/utils/skewCalculator");

const MINIMUM_AMM_LIQUIDITY = 2;
const MIN_SCEW_IMPACT = 0.0;
const AMM_MAX_BUFFER_PERCENTAGE = 0.98;

async function getAmmMarketData(
  positionalMarketData,
  amm,
  marketAddress,
  position,
  amount,
  isRangedMarket,
  isBuy,
  defaultCollateralDecimals,
) {
  let liquidity = 0;
  let liquidityPrice = 0;
  let basePrice = 0;
  let isAmmTradingDisabled = false;
  let outOfLiquidity = false;
  let insufficientLiquidity = false;

  if (isRangedMarket) {
    const rangedAmmMaxLimits = {
      in: {
        maxBuy: 0,
        maxSell: 0,
        buyPrice: 0,
        maxBuyPrice: 0,
        sellPrice: 0,
        priceImpact: 0,
      },
      out: {
        maxBuy: 0,
        maxSell: 0,
        buyPrice: 0,
        maxBuyPrice: 0,
        sellPrice: 0,
        priceImpact: 0,
      },
    };

    const rangedAmmMarketData = await positionalMarketData.getRangedAmmMarketData(marketAddress);

    const [maxBuyInPrice, maxBuyOutPrice] = await Promise.all([
      rangedAmmMarketData.inBuyLiquidity > 0
        ? amm.buyFromAmmQuote(
            marketAddress,
            RANGED_POSITION_TYPE.In,
            rangedAmmMarketData.inBuyLiquidity.mul(AMM_MAX_BUFFER_PERCENTAGE * 100).div(100),
          )
        : 0,
      rangedAmmMarketData.outBuyLiquidity > 0
        ? amm.buyFromAmmQuote(
            marketAddress,
            RANGED_POSITION_TYPE.Out,
            rangedAmmMarketData.outBuyLiquidity.mul(AMM_MAX_BUFFER_PERCENTAGE * 100).div(100),
          )
        : 0,
    ]);

    ammMaxLimits.in.buyPrice = bigNumberFormatter(rangedAmmMarketData.inBuyPrice, defaultCollateralDecimals);
    ammMaxLimits.out.buyPrice = bigNumberFormatter(rangedAmmMarketData.outBuyPrice, defaultCollateralDecimals);
    ammMaxLimits.in.maxBuyPrice = bigNumberFormatter(maxBuyInPrice, defaultCollateralDecimals);
    ammMaxLimits.out.maxBuyPrice = bigNumberFormatter(maxBuyOutPrice, defaultCollateralDecimals);
    ammMaxLimits.in.sellPrice = bigNumberFormatter(rangedAmmMarketData.inSellPrice, defaultCollateralDecimals);
    ammMaxLimits.out.sellPrice = bigNumberFormatter(rangedAmmMarketData.outSellPrice, defaultCollateralDecimals);
    ammMaxLimits.in.maxBuy =
      ammMaxLimits.in.buyPrice !== 0
        ? bigNumberFormatter(rangedAmmMarketData.inBuyLiquidity) * AMM_MAX_BUFFER_PERCENTAGE
        : 0;
    ammMaxLimits.in.maxSell =
      ammMaxLimits.in.sellPrice !== 0
        ? bigNumberFormatter(rangedAmmMarketData.inSellLiquidity) * AMM_MAX_BUFFER_PERCENTAGE
        : 0;
    ammMaxLimits.out.maxBuy =
      ammMaxLimits.out.buyPrice !== 0
        ? bigNumberFormatter(rangedAmmMarketData.outBuyLiquidity) * AMM_MAX_BUFFER_PERCENTAGE
        : 0;
    ammMaxLimits.out.maxSell =
      ammMaxLimits.out.sellPrice !== 0
        ? bigNumberFormatter(rangedAmmMarketData.outSellLiquidity) * AMM_MAX_BUFFER_PERCENTAGE
        : 0;
    ammMaxLimits.in.priceImpact = bigNumberFormatter(rangedAmmMarketData.inPriceImpact);
    ammMaxLimits.out.priceImpact = bigNumberFormatter(rangedAmmMarketData.outPriceImpact);

    if (position === RANGED_POSITION_TYPE.In) {
      liquidity = isBuy ? rangedAmmMaxLimits.in.maxBuy : rangedAmmMaxLimits.in.maxSell;
      liquidityPrice = isBuy ? rangedAmmMaxLimits.in.maxBuyPrice : 0;
      basePrice = isBuy ? rangedAmmMaxLimits.in.buyPrice : rangedAmmMaxLimits.in.sellPrice;
    } else {
      liquidity = isBuy ? rangedAmmMaxLimits.out.maxBuy : rangedAmmMaxLimits.out.maxSell;
      liquidityPrice = isBuy ? rangedAmmMaxLimits.out.maxBuyPrice : 0;
      basePrice = isBuy ? rangedAmmMaxLimits.out.buyPrice : rangedAmmMaxLimits.out.sellPrice;
    }
    isAmmTradingDisabled =
      !rangedAmmMaxLimits.in.maxBuy &&
      !rangedAmmMaxLimits.in.maxSell &&
      !rangedAmmMaxLimits.out.maxBuy &&
      !rangedAmmMaxLimits.out.maxSell;
  } else {
    const ammMaxLimits = {
      maxBuyLong: 0,
      maxSellLong: 0,
      maxBuyShort: 0,
      maxSellShort: 0,
      isMarketInAmmTrading: false,
      buyLongPrice: 0,
      buyShortPrice: 0,
      maxBuyLongPrice: 0,
      maxBuyShortPrice: 0,
      sellLongPrice: 0,
      sellShortPrice: 0,
      buyLongPriceImpact: 0,
      buyShortPriceImpact: 0,
      sellLongPriceImpact: 0,
      sellShortPriceImpact: 0,
      iv: 0,
    };

    const ammMarketData = await positionalMarketData.getAmmMarketData(marketAddress);

    const [maxBuyLongPrice, maxBuyShortPrice] = await Promise.all([
      ammMarketData.upBuyLiquidity > 0
        ? amm.buyFromAmmQuote(
            marketAddress,
            POSITION_TYPE.Up,
            ammMarketData.upBuyLiquidity.mul(AMM_MAX_BUFFER_PERCENTAGE * 100).div(100),
          )
        : 0,
      ammMarketData.downBuyLiquidity > 0
        ? amm.buyFromAmmQuote(
            marketAddress,
            POSITION_TYPE.Down,
            ammMarketData.downBuyLiquidity.mul(AMM_MAX_BUFFER_PERCENTAGE * 100).div(100),
          )
        : 0,
    ]);

    ammMaxLimits.maxBuyLong = bigNumberFormatter(ammMarketData.upBuyLiquidity) * AMM_MAX_BUFFER_PERCENTAGE;
    ammMaxLimits.maxSellLong = bigNumberFormatter(ammMarketData.upSellLiquidity) * AMM_MAX_BUFFER_PERCENTAGE;
    ammMaxLimits.maxBuyShort = bigNumberFormatter(ammMarketData.downBuyLiquidity) * AMM_MAX_BUFFER_PERCENTAGE;
    ammMaxLimits.maxSellShort = bigNumberFormatter(ammMarketData.downSellLiquidity) * AMM_MAX_BUFFER_PERCENTAGE;
    ammMaxLimits.buyLongPrice = bigNumberFormatter(ammMarketData.upBuyPrice, defaultCollateralDecimals);
    ammMaxLimits.buyShortPrice = bigNumberFormatter(ammMarketData.downBuyPrice, defaultCollateralDecimals);
    ammMaxLimits.maxBuyLongPrice = bigNumberFormatter(maxBuyLongPrice, defaultCollateralDecimals);
    ammMaxLimits.maxBuyShortPrice = bigNumberFormatter(maxBuyShortPrice, defaultCollateralDecimals);
    ammMaxLimits.sellLongPrice = bigNumberFormatter(ammMarketData.upSellPrice, defaultCollateralDecimals);
    ammMaxLimits.sellShortPrice = bigNumberFormatter(ammMarketData.downSellPrice, defaultCollateralDecimals);
    ammMaxLimits.buyLongPriceImpact = bigNumberFormatter(ammMarketData.upBuyPriceImpact) - MIN_SCEW_IMPACT;
    ammMaxLimits.buyShortPriceImpact = bigNumberFormatter(ammMarketData.downBuyPriceImpact) - MIN_SCEW_IMPACT;
    ammMaxLimits.sellLongPriceImpact = bigNumberFormatter(ammMarketData.upSellPriceImpact) - MIN_SCEW_IMPACT;
    ammMaxLimits.sellShortPriceImpact = bigNumberFormatter(ammMarketData.downSellPriceImpact) - MIN_SCEW_IMPACT;
    ammMaxLimits.iv = bigNumberFormatter(ammMarketData.iv);
    ammMaxLimits.isMarketInAmmTrading = ammMarketData.isMarketInAMMTrading;

    if (position === POSITION_TYPE.Up) {
      liquidity = isBuy ? ammMaxLimits.maxBuyLong : ammMaxLimits.maxSellLong;
      liquidityPrice = isBuy ? ammMaxLimits.maxBuyLongPrice : 0;
      basePrice = isBuy ? ammMaxLimits.buyLongPrice : ammMaxLimits.sellLongPrice;
    } else {
      liquidity = isBuy ? ammMaxLimits.maxBuyShort : ammMaxLimits.maxSellShort;
      liquidityPrice = isBuy ? ammMaxLimits.maxBuyShortPrice : 0;
      basePrice = isBuy ? ammMaxLimits.buyShortPrice : ammMaxLimits.sellShortPrice;
    }
    isAmmTradingDisabled = !ammMaxLimits.isMarketInAmmTrading;
  }
  outOfLiquidity = liquidity < MINIMUM_AMM_LIQUIDITY;
  insufficientLiquidity = isBuy ? liquidityPrice < amount : liquidity < amount;

  return { liquidity, liquidityPrice, basePrice, isAmmTradingDisabled, outOfLiquidity, insufficientLiquidity };
}

async function fetchAmmQuote(
  amm,
  marketAddress,
  position,
  amountForQuote,
  collateralAddress,
  isDefaultCollateral,
  isRangedMarket,
  isBuy,
) {
  const parsedAmount = bigNumberParser(amountForQuote.toString());
  const promises = isRangedMarket
    ? getRangedAmmQuoteAndPriceImpactMethods(
        amm,
        marketAddress,
        position,
        parsedAmount,
        collateralAddress,
        isDefaultCollateral,
        isBuy,
      )
    : getAmmQuoteAndPriceImpactMethods(
        amm,
        marketAddress,
        position,
        parsedAmount,
        collateralAddress,
        isDefaultCollateral,
        isBuy,
      );

  const [ammQuotes, ammPriceImpact] = await Promise.all(promises);
  return { ammQuotes, ammPriceImpact };
}

// for BUY: amount = collateralAmount
// for SELL: amount = positionAmount (amountOfTokens)
async function getAmmQuote(network, marketAddress, position, amount, collateral, isRangedMarket, isBuy) {
  let payout = 0;
  let price = 0;
  let realCollateralAmount = 0;
  let realUsdAmount = 0;
  let skew = 0;

  // for SELL use always default collateral
  const defaultCollateral = getDefaultCollateral(network);
  if (!isBuy && collateral) {
    collateral = defaultCollateral.symbol;
  }
  const collateralAddress = getCollateralAddress(network, collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);
  const isDefaultCollateral = collateralAddress === defaultCollateral.address;
  const defaultCollateralDecimals = getDefaultCollateral(network).decimals;

  try {
    // const today = new Date();
    // const todaysDate = Math.round(today.getTime() / 1000);
    // let openMarkets = await thalesData.sportMarkets.markets({
    //   isOpen: true,
    //   isCanceled: false,
    //   isPaused: false,
    //   network,
    //   minMaturityDate: todaysDate,
    //   market: marketAddress,
    // });
    // if (openMarkets.length === 0) {
    //   return `Market with address ${marketAddress} not found or not open.`;
    // }
    // const market = packMarket(openMarkets[0]);
    // const isDrawAvailable = getIsDrawAvailable(market);
    // if (isDrawAvailable && ![0, 1, 2].includes(position)) {
    //   return `Unsupported position for sport "${market.sport}", league "${market.leagueName}" and type "${market.type}". Supported positions: 0 (home), 1 (away), 2 (draw).`;
    // }
    // if (!isDrawAvailable && ![0, 1].includes(position)) {
    //   return `Unsupported position for sport "${market.sport}", league "${market.leagueName}" and type "${market.type}". Supported positions: 0 (home) or 1 (away).`;
    // }

    const provider = getProvider(network);
    const positionalMarketData = new ethers.Contract(
      positionalMarketDataContract.addresses[network],
      positionalMarketDataContract.abi,
      provider,
    );
    const amm = new ethers.Contract(ammContract.addresses[network], ammContract.abi, provider);
    const rangedAmm = new ethers.Contract(rangedAmmContract.addresses[network], rangedAmmContract.abi, provider);
    const contract = isRangedMarket ? rangedAmm : amm;

    const { liquidity, liquidityPrice, basePrice, isAmmTradingDisabled, outOfLiquidity, insufficientLiquidity } =
      await getAmmMarketData(
        positionalMarketData,
        contract,
        marketAddress,
        position,
        amount,
        isRangedMarket,
        isBuy,
        defaultCollateralDecimals,
      );

    if (isAmmTradingDisabled) {
      return `AMM trading is disabled for this market.`;
    }
    if (outOfLiquidity) {
      return `Market is out of liquidity`;
    }
    if (insufficientLiquidity) {
      return `Amount exceeded the amount available on AMM. Max amount ${isBuy ? liquidityPrice : liquidity} ${
        isBuy
          ? getCollateral(network, collateral).symbol
          : isRangedMarket
          ? RANGED_POSITION_TYPE_NAME_MAP[position]
          : POSITION_TYPE_NAME_MAP[position]
      }`;
    }

    // for SELL: payout is amount (amountOfTokens)
    payout = amount;

    // for BUY: calculate payout (amountOfTokens)
    if (isBuy) {
      const amountOfTokens = fetchAmountOfTokensForXsUSDAmount(amount, basePrice, liquidityPrice, liquidity, 0) || 0;

      const flooredAmountOfTokens = floorNumberToDecimals(amountOfTokens);
      const recalculatedQuoteResponse = await fetchAmmQuote(
        contract,
        marketAddress,
        position,
        flooredAmountOfTokens,
        collateralAddress,
        isDefaultCollateral,
        isRangedMarket,
        isBuy,
      );
      const recalculatedQuote = isDefaultCollateral
        ? recalculatedQuoteResponse.ammQuotes
        : recalculatedQuoteResponse.ammQuotes[0];
      const parsedRecalculatedQuote = bigNumberFormatter(recalculatedQuote, collateralDecimals);

      const recalculatedTokenAmount = roundNumberToDecimals((amountOfTokens * amount) / parsedRecalculatedQuote);
      const maxAvailableTokenAmount =
        recalculatedTokenAmount > flooredAmountOfTokens ? flooredAmountOfTokens : recalculatedTokenAmount;
      payout = maxAvailableTokenAmount;
    }

    const finalQuoteResponse = await fetchAmmQuote(
      contract,
      marketAddress,
      position,
      payout,
      collateralAddress,
      isDefaultCollateral,
      isRangedMarket,
      isBuy,
    );

    const finalQuote = isDefaultCollateral ? finalQuoteResponse.ammQuotes : finalQuoteResponse.ammQuotes[0];
    const parsedFinalQuote = bigNumberFormatter(finalQuote, collateralDecimals);
    const parsedFinalUsdQuote = isDefaultCollateral
      ? parsedFinalQuote
      : bigNumberFormatter(finalQuoteResponse.ammQuotes[1], defaultCollateralDecimals);

    price = parsedFinalQuote / payout;
    skew = price > 0 ? bigNumberFormatter(finalQuoteResponse.ammPriceImpact) - MIN_SCEW_IMPACT : 0;
    realUsdAmount = parsedFinalUsdQuote;
    realCollateralAmount = parsedFinalQuote;
  } catch (e) {
    console.log("Error: could not get quote.", e);
    return "Error: could not get quote.";
  }

  const finalQuote = isBuy
    ? {
        pricePerPosition: price,
        payout,
        potenitialProfit: {
          usd: payout - realUsdAmount,
          percentage: (payout - realUsdAmount) / realUsdAmount,
        },
        actualBuyInCollateralAmount: realCollateralAmount,
        actualBuyInUsdAmount: realUsdAmount,
        skew,
      }
    : {
        pricePerPosition: price,
        tokenAmountToSell: payout,
        usdAmountToRecieve: realCollateralAmount,
        skew,
      };

  return finalQuote;
}

module.exports = {
  getAmmQuote,
};
