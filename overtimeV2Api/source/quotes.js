require("dotenv").config();
const { formatMarketOdds } = require("../utils/markets");
const { getProvider } = require("../utils/provider");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const sportsAMMV2Contract = require("../contracts/sportsAMMV2Contract");
const multiCollateralOnOffRampContract = require("../contracts/multiCollateralOnOffRampContract");
const priceFeedContract = require("../contracts/priceFeedContract");
const sportsAMMV2RiskManagerContract = require("../contracts/sportsAMMV2RiskManagerContract");
const { ethers } = require("ethers");
const { ZERO_ADDRESS, PARLAY_CONTRACT_ERROR_MESSAGE, OddsType } = require("../constants/markets");
const {
  getCollateralDecimals,
  getCollateralAddress,
  getCollateral,
  getDefaultCollateral,
  isLpSupported,
  isThales,
} = require("../utils/collaterals");
const { bigNumberFormatter, ceilNumberToDecimals, bigNumberParser, getPrecision } = require("../utils/formatters");
const KEYS = require("../../redis/redis-keys");
const { formatBytes32String } = require("ethers/lib/utils");

const MIN_COLLATERAL_MULTIPLIER = 1.01;

async function fetchMultiCollateralData(
  multiCollateralOnOffRamp,
  minBuyInAmountInDefaultCollateral,
  collateralAddress,
  collateralDecimals,
  defaultCollateralDecimals,
  collateralHasLp,
  isDefaultCollateral,
  collateralRate,
) {
  try {
    const [minimumNeededForMinBuyInAmountInDefaultCollateral] = await Promise.all([
      collateralHasLp
        ? minBuyInAmountInDefaultCollateral / (isDefaultCollateral ? 1 : collateralRate)
        : multiCollateralOnOffRamp.getMinimumNeeded(
            collateralAddress,
            bigNumberParser(minBuyInAmountInDefaultCollateral.toString(), defaultCollateralDecimals),
          ),
    ]);

    const minBuyInAmount =
      (collateralHasLp
        ? minimumNeededForMinBuyInAmountInDefaultCollateral
        : bigNumberFormatter(minimumNeededForMinBuyInAmountInDefaultCollateral, collateralDecimals)) *
      (isDefaultCollateral ? 1 : MIN_COLLATERAL_MULTIPLIER);

    return minBuyInAmount;
  } catch (e) {
    console.log("Error: could not get multi collateral data.", e);
    return { error: `Error: could not get multi collateral data. ${e}` };
  }
}

async function fetchTicketAmmQuote(
  sportsAmm,
  tradeData,
  buyInAmount,
  collateralAddress,
  collateralDecimals,
  isDefaultCollateral,
) {
  try {
    const parsedBuyInAmount = bigNumberParser(buyInAmount.toString(), collateralDecimals);
    const sportsAmmQuote = await sportsAmm.tradeQuote(
      tradeData,
      parsedBuyInAmount,
      isDefaultCollateral ? ZERO_ADDRESS : collateralAddress,
      false,
    );
    switch (sportsAmmQuote.riskStatus) {
      case 1:
        return { error: "Not enough liquidity for provided buy-in amount." };
      case 2:
        return { error: "Invalid combination on the ticket." };
      default:
        return sportsAmmQuote;
    }
  } catch (e) {
    console.log("Error: could not get trade quote data.", e);
    return { error: `Error: could not get trade quote data. ${e}` };
  }
}

function getRates(network, provider) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.TOKEN, async function (err, obj) {
      const tokenMap = new Map(JSON.parse(obj));
      const thalesRate = Number(tokenMap.get("price"));

      const priceFeed = new ethers.Contract(priceFeedContract.addresses[network], priceFeedContract.abi, provider);
      const ethRate = bigNumberFormatter(await priceFeed.rateForCurrency(formatBytes32String("ETH")));
      resolve({ thalesRate, ethRate });
    });
  });
}

async function getQuoteData(network, tradeData, buyInAmount, collateral, provider) {
  let totalQuote = 0;
  let payout = 0;
  let buyInAmountInDefaultCollateral = 0;
  let payoutInDefaultCollateral = 0;

  const collateralAddress = getCollateralAddress(network, collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);
  const defaultCollateral = getDefaultCollateral(network);
  const isDefaultCollateral = collateralAddress === defaultCollateral.address;
  const collateralHasLp = isLpSupported(collateral);

  try {
    const rates = await getRates(network, provider);
    const collateralRate =
      collateral === "WETH" || collateral === "ETH" ? rates.ethRate : collateral === "THALES" ? rates.thalesRate : 1;

    const sportsAmmData = new ethers.Contract(
      sportsAMMV2DataContract.addresses[network],
      sportsAMMV2DataContract.abi,
      provider,
    );
    const sportsAmm = new ethers.Contract(sportsAMMV2Contract.addresses[network], sportsAMMV2Contract.abi, provider);
    const multiCollateralOnOffRamp = new ethers.Contract(
      multiCollateralOnOffRampContract.addresses[network],
      multiCollateralOnOffRampContract.abi,
      provider,
    );

    const sportsAmmParameters = await sportsAmmData.getSportsAMMParameters();
    const minBuyInAmountInDefaultCollateral = bigNumberFormatter(
      sportsAmmParameters.minBuyInAmount,
      defaultCollateral.decimals,
    );
    const maxSupportedAmount = bigNumberFormatter(sportsAmmParameters.maxSupportedAmount, defaultCollateral.decimals);
    const maxTicketSize = Number(sportsAmmParameters.maxTicketSize);

    const minBuyInAmount = await fetchMultiCollateralData(
      multiCollateralOnOffRamp,
      minBuyInAmountInDefaultCollateral,
      collateralAddress,
      collateralDecimals,
      defaultCollateral.decimals,
      collateralHasLp,
      isDefaultCollateral,
      collateralRate,
    );

    if (minBuyInAmount.error) {
      return { error: minBuyInAmount.error };
    }

    if (maxTicketSize < tradeData.length) {
      return { error: `The maximum number of positions on the ticket is ${maxTicketSize}.` };
    }
    const decimals = getPrecision(minBuyInAmount);
    if (minBuyInAmount > buyInAmount) {
      return {
        error: `The minimum buy-in amount for ticket is ${ceilNumberToDecimals(minBuyInAmount, decimals)} ${
          getCollateral(network, collateral).symbol
        } ${
          isDefaultCollateral
            ? ""
            : ` ($ ${ceilNumberToDecimals(minBuyInAmountInDefaultCollateral * MIN_COLLATERAL_MULTIPLIER, 2)})`
        }.`,
      };
    }

    const sportAmmQuote = await fetchTicketAmmQuote(
      sportsAmm,
      tradeData,
      buyInAmount,
      collateralAddress,
      collateralDecimals,
      isDefaultCollateral,
    );

    if (sportAmmQuote.error) {
      return { error: sportAmmQuote.error };
    }
    const amountsToBuy = (sportAmmQuote.amountsToBuy || []).map((quote) =>
      bigNumberFormatter(quote, collateralHasLp ? collateralDecimals : defaultCollateral.decimals),
    );
    const isSomeMarketOutOfLiquidity = amountsToBuy.some((quote) => quote === 0);
    if (isSomeMarketOutOfLiquidity) {
      return { error: "Not enough liquidity for provided buy-in amount." };
    }

    totalQuote = bigNumberFormatter(sportAmmQuote.totalQuote);
    payout = bigNumberFormatter(
      sportAmmQuote.payout,
      collateralHasLp ? collateralDecimals : defaultCollateral.decimals,
    );
    buyInAmountInDefaultCollateral = isThales(collateral)
      ? Number(buyInAmount) * collateralRate
      : bigNumberFormatter(sportAmmQuote.buyInAmountInDefaultCollateral, defaultCollateral.decimals);
    payoutInDefaultCollateral = buyInAmountInDefaultCollateral / totalQuote;

    if (payoutInDefaultCollateral - buyInAmountInDefaultCollateral > maxSupportedAmount) {
      return { error: `The maximum supported profit is ${maxSupportedAmount}.` };
    }

    return {
      totalQuote: {
        american: formatMarketOdds(totalQuote, OddsType.AMERICAN),
        decimal: formatMarketOdds(totalQuote, OddsType.DECIMAL),
        normalizedImplied: formatMarketOdds(totalQuote, OddsType.AMM),
      },
      payout: {
        [collateral]: collateralHasLp && !isDefaultCollateral ? payout : undefined,
        usd: payoutInDefaultCollateral,
        payoutCollateral: collateralHasLp ? collateral : defaultCollateral.symbol,
      },
      potentialProfit: {
        [collateral]: collateralHasLp && !isDefaultCollateral ? payout - buyInAmount : undefined,
        usd: payoutInDefaultCollateral - buyInAmountInDefaultCollateral,
        percentage: (payoutInDefaultCollateral - buyInAmountInDefaultCollateral) / buyInAmountInDefaultCollateral,
      },
      buyInAmountInUsd: buyInAmountInDefaultCollateral,
    };
  } catch (e) {
    console.log("Error: could not get quote.", e);
    return { error: `Error: could not get quote. ${e}` };
  }
}

async function getLiquidityData(network, tradeData, provider) {
  const defaultCollateral = getDefaultCollateral(network);
  try {
    const sportsAMMV2RiskManager = new ethers.Contract(
      sportsAMMV2RiskManagerContract.addresses[network],
      sportsAMMV2RiskManagerContract.abi,
      provider,
    );

    const riskPromises = [];
    const capPromises = [];
    for (let i = 0; i < tradeData.length; i++) {
      const market = tradeData[i];
      riskPromises.push(
        sportsAMMV2RiskManager.riskPerMarketTypeAndPosition(
          market.gameId,
          market.typeId,
          market.playerId,
          market.position,
        ),
      );
      capPromises.push(
        sportsAMMV2RiskManager.calculateCapToBeUsed(
          market.gameId,
          market.sportId,
          market.typeId,
          market.playerId,
          market.line,
          market.live ? Math.round(new Date().getTime() / 1000) + 60 : market.maturity,
          !!market.live,
        ),
      );
    }

    const risks = await Promise.all(riskPromises);
    const caps = await Promise.all(capPromises);

    let ticketLiquidity = 0;
    for (let i = 0; i < tradeData.length; i++) {
      const market = tradeData[i];
      const formattedRisk = bigNumberFormatter(risks[i], defaultCollateral.decimals);
      const formattedCap = bigNumberFormatter(caps[i], defaultCollateral.decimals);
      const marketLiquidity = Math.floor(
        (formattedCap - formattedRisk) / (1 / bigNumberFormatter(market.odds[market.position]) - 1),
      );
      ticketLiquidity = i === 0 || marketLiquidity < ticketLiquidity ? marketLiquidity : ticketLiquidity;
    }

    return { ticketLiquidityInUsd: ticketLiquidity };
  } catch (e) {
    console.log("Error: could not get liqidity data.", e);
    return { error: `Error: could not liqidity data. ${e}` };
  }
}

async function getAmmQuote(network, tradeData, buyInAmount, collateral) {
  const provider = getProvider(network);
  const [quoteDataResponse, liquidityDataResponse] = await Promise.all([
    getQuoteData(network, tradeData, buyInAmount, collateral, provider),
    getLiquidityData(network, tradeData, provider),
  ]);

  const quoteData = quoteDataResponse.error
    ? {
        error: quoteDataResponse.error,
      }
    : quoteDataResponse;

  const liquidityData = liquidityDataResponse.error
    ? {
        error: liquidityDataResponse.error,
      }
    : liquidityDataResponse;

  return {
    quoteData,
    liquidityData,
  };
}

module.exports = {
  getAmmQuote,
};
