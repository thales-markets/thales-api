require("dotenv").config();
const {
  roundNumberToDecimals,
  getCollateralAddress,
  getSportsAMMQuoteMethod,
  floorNumberToDecimals,
  getCollateralDecimals,
  bigNumberFormatter,
  formatMarketOdds,
  packMarket,
  getIsDrawAvailable,
} = require("../utils/markets");
const { getProvider } = require("../utils/provider");
const sportPositionalMarketDataContract = require("../contracts/sportPositionalMarketDataContract");
const sportsAMMContract = require("../contracts/sportsAMMContract");
const sportsMarketContract = require("../contracts/sportsMarketContract");
const { ethers } = require("ethers");
const { fetchAmountOfTokensForXsUSDAmount } = require("../utils/skewCalculator");
const { ODDS_TYPE, ZERO_ADDRESS, SUPPORTED_COLLATERALS } = require("../constants/markets");
const thalesData = require("thales-data");

async function fetchAmmQuote(sportsAMM, marketAddress, position, amountForQuote, collateralAddress) {
  const parsedAmount = ethers.utils.parseEther(roundNumberToDecimals(amountForQuote).toString());
  const ammQuote = await getSportsAMMQuoteMethod(sportsAMM, marketAddress, position, parsedAmount, collateralAddress);
  return collateralAddress ? ammQuote[0] : ammQuote;
}

async function getAmmQuote(network, marketAddress, position, usdAmount, collateral) {
  let payout = 0;
  let quote = 0;
  let realUsdAmount = 0;
  let priceImpact = 0;
  const collateralAddress = getCollateralAddress(network, collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);

  try {
    const today = new Date();
    const todaysDate = Math.round(today.getTime() / 1000);
    let markets = await thalesData.sportMarkets.markets({
      isOpen: true,
      isCanceled: false,
      isPaused: false,
      network,
      minMaturityDate: todaysDate,
      market: marketAddress,
    });
    if (markets.length === 0) {
      return "Market not found or not open.";
    }
    const market = packMarket(markets[0]);
    const isDrawAvailable = getIsDrawAvailable(market);
    if (isDrawAvailable && ![0, 1, 2].includes(position)) {
      return `Unsupported position for sport "${market.sport}", league "${market.leagueName}" and type "${market.type}". Supported positions: 0 (home), 1 (away), 2 (draw).`;
    }
    if (!isDrawAvailable && ![0, 1].includes(position)) {
      return `Unsupported position for sport "${market.sport}", league "${market.leagueName}" and type "${market.type}". Supported positions: 0 (home) or 1 (away).`;
    }

    const provider = getProvider(network);
    const sportPositionalMarketData = new ethers.Contract(
      sportPositionalMarketDataContract.addresses[network],
      sportPositionalMarketDataContract.abi,
      provider,
    );
    const sportsAMM = new ethers.Contract(sportsAMMContract.addresses[network], sportsAMMContract.abi, provider);
    const marketContract = new ethers.Contract(marketAddress, sportsMarketContract.abi, provider);

    const parsedBaseAmount = ethers.utils.parseEther("1");
    let positionDetails = await sportPositionalMarketData.getPositionDetails(
      marketAddress,
      position,
      parsedBaseAmount,
      collateralAddress || ZERO_ADDRESS,
    );

    const baseOdds = bigNumberFormatter(
      collateralAddress ? positionDetails.quoteDifferentCollateral : positionDetails.quote,
      collateralDecimals,
    );
    if (baseOdds > usdAmount) {
      return `Minimal buy-in amount is ${baseOdds}.`;
    }
    const liquidity = bigNumberFormatter(positionDetails.liquidity);

    const flooredMaxAmount = floorNumberToDecimals(liquidity);
    if (flooredMaxAmount) {
      const [sUSDToSpendForMaxAmount, ammBalances] = await Promise.all([
        fetchAmmQuote(sportsAMM, marketAddress, position, flooredMaxAmount, collateralAddress),
        marketContract.balancesOf(sportsAMM.address),
      ]);

      const maxsUSDToSpend = bigNumberFormatter(sUSDToSpendForMaxAmount, collateralDecimals);
      const ammBalanceForSelectedPosition = bigNumberFormatter(ammBalances[position], collateralDecimals);
      const amountOfTokens =
        fetchAmountOfTokensForXsUSDAmount(
          usdAmount,
          baseOdds,
          maxsUSDToSpend,
          liquidity,
          ammBalanceForSelectedPosition,
        ) || 0;

      if (amountOfTokens > liquidity) {
        return "Amount exceeded the amount available on AMM.";
      }
      const flooredAmountOfTokens = floorNumberToDecimals(amountOfTokens);
      const recalculatedQuote = await fetchAmmQuote(
        sportsAMM,
        marketAddress,
        position,
        flooredAmountOfTokens,
        collateralAddress,
      );
      const parsedRecalculatedQuote = bigNumberFormatter(recalculatedQuote, collateralDecimals);

      const recalculatedTokenAmount = roundNumberToDecimals((amountOfTokens * usdAmount) / parsedRecalculatedQuote);

      const maxAvailableTokenAmount =
        recalculatedTokenAmount > flooredAmountOfTokens ? flooredAmountOfTokens : recalculatedTokenAmount;
      payout = maxAvailableTokenAmount;

      const parsedPayout = ethers.utils.parseEther(payout.toString());
      positionDetails = await sportPositionalMarketData.getPositionDetails(
        marketAddress,
        position,
        parsedPayout,
        collateralAddress || ZERO_ADDRESS,
      );

      realUsdAmount = bigNumberFormatter(
        collateralAddress ? positionDetails.quoteDifferentCollateral : positionDetails.quote,
        collateralDecimals,
      );
      priceImpact = bigNumberFormatter(positionDetails.priceImpact);
      quote = maxAvailableTokenAmount / realUsdAmount;
    }
  } catch (e) {
    return "Error: could not get quote.";
  }

  return {
    quote: {
      american: formatMarketOdds(quote, ODDS_TYPE.American),
      decimal: formatMarketOdds(quote, ODDS_TYPE.Decimal),
      normalizedImplied: formatMarketOdds(quote, ODDS_TYPE.AMM),
    },
    payout,
    potenitialProfit: {
      usd: payout - realUsdAmount,
      percentage: (payout - realUsdAmount) / realUsdAmount,
    },
    actualBuyInAmount: realUsdAmount,
    priceImpact,
  };
}

module.exports = {
  getAmmQuote,
};
