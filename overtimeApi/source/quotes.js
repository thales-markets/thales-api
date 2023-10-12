require("dotenv").config();
const { formatMarketOdds, packMarket, getIsDrawAvailable } = require("../utils/markets");
const { getProvider } = require("../utils/provider");
const sportPositionalMarketDataContract = require("../contracts/sportPositionalMarketDataContract");
const sportsAMMContract = require("../contracts/sportsAMMContract");
const sportsMarketContract = require("../contracts/sportsMarketContract");
const parlayMarketDataContract = require("../contracts/parlayMarketDataContract");
const parlayMarketsAMMContract = require("../contracts/parlayMarketsAMMContract");
const { ethers } = require("ethers");
const { fetchAmountOfTokensForXsUSDAmount } = require("../utils/skewCalculator");
const { ODDS_TYPE, ZERO_ADDRESS, PARLAY_CONTRACT_ERROR_MESSAGE } = require("../constants/markets");
const thalesData = require("thales-data");
const {
  getCollateralDecimals,
  getCollateralAddress,
  getCollateral,
  getDefaultCollateral,
} = require("../utils/collaterals");
const {
  bigNumberFormatter,
  floorNumberToDecimals,
  roundNumberToDecimals,
  ceilNumberToDecimals,
  bigNumberParser,
  getPrecision,
} = require("../utils/formatters");
const { getSportsAMMQuoteMethod, getParlayMarketsAMMQuoteMethod } = require("../utils/amm");
const { DEFAULT_NETWORK_DECIMALS } = require("../constants/collaterals");
const MIN_TOKEN_AMOUNT = 1;

async function fetchAmmQuote(
  sportsAMM,
  marketAddress,
  position,
  amountForQuote,
  collateralAddress,
  isDefaultCollateral,
) {
  const parsedAmount = bigNumberParser(roundNumberToDecimals(amountForQuote).toString());
  const ammQuote = await getSportsAMMQuoteMethod(
    sportsAMM,
    marketAddress,
    position,
    parsedAmount,
    collateralAddress,
    isDefaultCollateral,
  );
  return isDefaultCollateral ? ammQuote : ammQuote[0];
}

async function getAmmQuote(network, marketAddress, position, collateralAmount, collateral) {
  let payout = 0;
  let quote = 0;
  let realCollateralAmount = 0;
  let skew = 0;
  const collateralAddress = getCollateralAddress(network, collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);
  const defaultCollateral = getDefaultCollateral(network, collateral);
  const isDefaultCollateral = collateralAddress === defaultCollateral.address;

  try {
    const today = new Date();
    const todaysDate = Math.round(today.getTime() / 1000);
    let openMarkets = await thalesData.sportMarkets.markets({
      isOpen: true,
      isCanceled: false,
      isPaused: false,
      network,
      minMaturityDate: todaysDate,
      market: marketAddress,
    });
    if (openMarkets.length === 0) {
      return `Market with address ${marketAddress} not found or not open.`;
    }
    const market = packMarket(openMarkets[0]);
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

    const parsedMinAmount = bigNumberParser(MIN_TOKEN_AMOUNT.toString());
    let positionDetails = await sportPositionalMarketData.getPositionDetails(
      marketAddress,
      position,
      parsedMinAmount,
      isDefaultCollateral ? ZERO_ADDRESS : collateralAddress,
    );

    const collateralToSpendForMinAmount = bigNumberFormatter(
      isDefaultCollateral ? positionDetails.quote : positionDetails.quoteDifferentCollateral,
      collateralDecimals,
    );
    const usdToSpendForMinAmount = bigNumberFormatter(positionDetails.quote, defaultCollateral.decimals);

    const decimals = getPrecision(collateralToSpendForMinAmount);
    if (collateralToSpendForMinAmount > collateralAmount) {
      return `The minimum buy-in amount is ${ceilNumberToDecimals(collateralToSpendForMinAmount, decimals)} ${
        getCollateral(network, collateral).symbol
      } ${isDefaultCollateral ? "" : ` ($ ${ceilNumberToDecimals(usdToSpendForMinAmount, 2)})`}.`;
    }
    const liquidity = bigNumberFormatter(positionDetails.liquidity);

    const flooredMaxAmount = floorNumberToDecimals(liquidity);
    if (flooredMaxAmount) {
      const [collateralToSpendForMaxAmountQuote, ammBalances] = await Promise.all([
        fetchAmmQuote(sportsAMM, marketAddress, position, flooredMaxAmount, collateralAddress, isDefaultCollateral),
        marketContract.balancesOf(sportsAMM.address),
      ]);

      const collateralToSpendForMaxAmount = bigNumberFormatter(collateralToSpendForMaxAmountQuote, collateralDecimals);
      const ammBalanceForSelectedPosition = bigNumberFormatter(ammBalances[position], collateralDecimals);
      const amountOfTokens =
        fetchAmountOfTokensForXsUSDAmount(
          collateralAmount,
          collateralToSpendForMinAmount,
          collateralToSpendForMaxAmount,
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
        isDefaultCollateral,
      );
      const parsedRecalculatedQuote = bigNumberFormatter(recalculatedQuote, collateralDecimals);

      const recalculatedTokenAmount = roundNumberToDecimals(
        (amountOfTokens * collateralAmount) / parsedRecalculatedQuote,
      );

      const maxAvailableTokenAmount =
        recalculatedTokenAmount > flooredAmountOfTokens ? flooredAmountOfTokens : recalculatedTokenAmount;
      payout = maxAvailableTokenAmount;

      const parsedPayout = bigNumberParser(payout.toString());
      positionDetails = await sportPositionalMarketData.getPositionDetails(
        marketAddress,
        position,
        parsedPayout,
        isDefaultCollateral ? ZERO_ADDRESS : collateralAddress,
      );

      realCollateralAmount = bigNumberFormatter(
        isDefaultCollateral ? positionDetails.quote : positionDetails.quoteDifferentCollateral,
        collateralDecimals,
      );
      realUsdAmount = bigNumberFormatter(positionDetails.quote, defaultCollateral.decimals);
      skew = bigNumberFormatter(positionDetails.priceImpact);
      quote = payout / realUsdAmount;
    }
  } catch (e) {
    console.log("Error: could not get quote.", e);
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
    actualBuyInCollateralAmount: realCollateralAmount,
    actualBuyInUsdAmount: realUsdAmount,
    skew,
  };
}

async function fetchParlayAmmQuote(network, parlayAMM, markets, positions, usdAmountForQuote, collateralAddress) {
  try {
    const parsedAmount = bigNumberParser(
      roundNumberToDecimals(usdAmountForQuote).toString(),
      DEFAULT_NETWORK_DECIMALS[network],
    );
    const parlayAmmQuote = await getParlayMarketsAMMQuoteMethod(
      parlayAMM,
      markets,
      positions,
      parsedAmount,
      collateralAddress,
    );
    return parlayAmmQuote;
  } catch (e) {
    console.log(e);
    const errorMessage = e.reason;
    if (errorMessage) {
      if (errorMessage.includes(PARLAY_CONTRACT_ERROR_MESSAGE.RiskPerCombExceeded)) {
        return { error: "Risk per combination exceeded." };
      } else if (errorMessage.includes(PARLAY_CONTRACT_ERROR_MESSAGE.SameTeamOnParlay)) {
        return { error: "The same team can't be in a parlay more than once." };
      }
    }
    return { error: errorMessage };
  }
}

async function getParlayAmmQuote(network, markets, positions, usdAmount, collateral) {
  let payout = 0;
  let quote = 0;
  let realUsdAmount = 0;
  let skew = 0;
  const collateralAddress = getCollateralAddress(network, collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);

  try {
    const today = new Date();
    const todaysDate = Math.round(today.getTime() / 1000);
    let openMarkets = await thalesData.sportMarkets.markets({
      isOpen: true,
      isCanceled: false,
      isPaused: false,
      network,
      minMaturityDate: todaysDate,
    });
    const parlayMarkets = openMarkets
      .filter((market) => markets.includes(market.address))
      .map((market) => packMarket(market));

    let marketError;
    markets.every((marketAddress, index) => {
      const market = parlayMarkets.find((parlayMarket) => parlayMarket.address === marketAddress);
      if (!market) {
        marketError = `Market with address ${marketAddress} not found or not open.`;
        return false;
      }
      const isDrawAvailable = getIsDrawAvailable(market);
      if (isDrawAvailable && ![0, 1, 2].includes(positions[index])) {
        marketError = `Unsupported position for sport "${market.sport}", league "${market.leagueName}" and type "${market.type}" (market address: ${market.address}). Supported positions: 0 (home), 1 (away), 2 (draw).`;
        return false;
      }
      if (!isDrawAvailable && ![0, 1].includes(positions[index])) {
        marketError = `Unsupported position for sport "${market.sport}", league "${market.leagueName}" and type "${market.type}" (market address: ${market.address}). Supported positions: 0 (home) or 1 (away).`;
        return false;
      }
      return true;
    });
    if (marketError) {
      return marketError;
    }

    const provider = getProvider(network);
    const parlayMarketData = new ethers.Contract(
      parlayMarketDataContract.addresses[network],
      parlayMarketDataContract.abi,
      provider,
    );
    const parlayAMM = new ethers.Contract(
      parlayMarketsAMMContract.addresses[network],
      parlayMarketsAMMContract.abi,
      provider,
    );

    const parlayAMMParameters = await parlayMarketData.getParlayAMMParameters();
    const minUsdAmount = bigNumberFormatter(parlayAMMParameters.minUSDAmount, DEFAULT_NETWORK_DECIMALS[network]);
    const maxSupportedAmount = bigNumberFormatter(parlayAMMParameters.maxSupportedAmount);
    // const maxSupportedOdds = bigNumberFormatter(parlayAMMParameters.maxSupportedOdds);
    // const parlayAmmFee = bigNumberFormatter(parlayAMMParameters.parlayAmmFee);
    // const safeBoxImpact = bigNumberFormatter(parlayAMMParameters.safeBoxImpact);
    const parlaySize = Number(parlayAMMParameters.parlaySize);

    if (markets.length !== positions.length) {
      return `Market addresses array and market positions array should be the same size.`;
    }
    if (parlaySize < positions.length) {
      return `The maximum number of markets in parlay is ${parlaySize}.`;
    }
    if (minUsdAmount > usdAmount) {
      return `The minimum buy-in amount for parlay is ${minUsdAmount}.`;
    }

    const parlayAmmQuote = await fetchParlayAmmQuote(
      network,
      parlayAMM,
      markets,
      positions,
      usdAmount,
      collateralAddress,
    );

    if (parlayAmmQuote.error) {
      return parlayAmmQuote.error;
    }
    const finalQuotes = (parlayAmmQuote["finalQuotes"] || []).map((quote) => bigNumberFormatter(quote));
    const isSomeMarketOutOfLiquidity = finalQuotes.some((quote) => quote === 0);
    if (isSomeMarketOutOfLiquidity) {
      return "Not enough liquidity for provided buy-in amount.";
    }

    quote = bigNumberFormatter(parlayAmmQuote["totalQuote"]);
    payout = bigNumberFormatter(parlayAmmQuote["totalBuyAmount"]);
    realUsdAmount = collateralAddress
      ? bigNumberFormatter(parlayAmmQuote["collateralQuote"], collateralDecimals)
      : usdAmount;
    skew = bigNumberFormatter(parlayAmmQuote["skewImpact"]);

    if (payout - realUsdAmount > maxSupportedAmount) {
      return `The maximum supported profit is ${maxSupportedAmount}.`;
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
    skew,
  };
}

module.exports = {
  getAmmQuote,
  getParlayAmmQuote,
};
