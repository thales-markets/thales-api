const { redisClient } = require("../../redis/client");
require("dotenv").config();
const { formatMarketOdds } = require("../utils/markets");
const { getProvider } = require("../utils/provider");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const sportsAMMV2Contract = require("../contracts/sportsAMMV2Contract");
const multiCollateralOnOffRampContract = require("../contracts/multiCollateralOnOffRampContract");
const priceFeedContract = require("../contracts/priceFeedContract");
const sportsAMMV2RiskManagerContract = require("../contracts/sportsAMMV2RiskManagerContract");
const { ethers } = require("ethers");
const { ZERO_ADDRESS, OddsType, SYSTEM_BET_MINIMUM_MARKETS } = require("../constants/markets");
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
const { formatBytes32String, parseEther } = require("ethers/lib/utils");
const { getSystemBetData } = require("../utils/systemBets");

const MIN_COLLATERAL_MULTIPLIER = 1.01;

async function fetchMultiCollateralData(
  multiCollateralOnOffRamp,
  minBuyInAmountInDefaultCollateral,
  collateralAddress,
  collateralDecimals,
  defaultCollateralDecimals,
  collateralHasLp,
  isDefaultCollateral,
  collateral,
  network,
  provider,
) {
  try {
    const [minimumNeededForMinBuyInAmountInDefaultCollateral] = await Promise.all([
      collateralHasLp
        ? minBuyInAmountInDefaultCollateral /
          (isDefaultCollateral ? 1 : await getCollateralRate(network, provider, collateral))
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
  mappedTradeData,
  buyInAmount,
  collateralAddress,
  collateralDecimals,
  isDefaultCollateral,
  isSystemBet,
  systemBetDenominator,
) {
  try {
    const parsedBuyInAmount = bigNumberParser(buyInAmount.toString(), collateralDecimals);
    const sportsAmmQuote = isSystemBet
      ? await sportsAmm.tradeQuoteSystem(
          mappedTradeData,
          parsedBuyInAmount,
          isDefaultCollateral ? ZERO_ADDRESS : collateralAddress,
          false,
          systemBetDenominator,
        )
      : await sportsAmm.tradeQuote(
          mappedTradeData,
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

async function getCollateralRate(network, provider, collateral) {
  if (
    !collateral ||
    (collateral.toUpperCase() !== "ETH" && collateral.toUpperCase() !== "WETH" && !isThales(collateral))
  ) {
    return 1;
  } else if (collateral.toUpperCase() === "ETH" || collateral.toUpperCase() === "WETH") {
    const priceFeed = new ethers.Contract(priceFeedContract.addresses[network], priceFeedContract.abi, provider);
    const ethRate = bigNumberFormatter(await priceFeed.rateForCurrency(formatBytes32String("ETH")));
    return ethRate;
  } else if (collateral.toUpperCase() === "THALES-CONTRACT") {
    const priceFeed = new ethers.Contract(priceFeedContract.addresses[network], priceFeedContract.abi, provider);
    const thalesContractRate = bigNumberFormatter(await priceFeed.rateForCurrency(formatBytes32String("THALES")));
    return thalesContractRate;
  } else {
    const obj = await redisClient.get(KEYS.TOKEN);
    const tokenMap = new Map(JSON.parse(obj));
    const thalesRate = Number(tokenMap.get("price"));
    return thalesRate;
  }
}

async function getQuoteData(
  network,
  mappedTradeData,
  buyInAmount,
  collateral,
  provider,
  isSystemBet,
  systemBetDenominator,
  tradeData,
) {
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
    const maxAllowedSystemCombinations = Number(sportsAmmParameters.maxAllowedSystemCombinations);
    const maxSupportedOdds = bigNumberFormatter(sportsAmmParameters.maxSupportedOdds);

    if (maxTicketSize < mappedTradeData.length) {
      return { error: `The maximum number of positions on the ticket is ${maxTicketSize}.` };
    }

    let numberOfSystemBetCombinations = 1;
    let systemBetData = {};
    if (isSystemBet) {
      if (SYSTEM_BET_MINIMUM_MARKETS > mappedTradeData.length) {
        return { error: `System bet requires minimum ${SYSTEM_BET_MINIMUM_MARKETS} games.` };
      }

      for (let i = 0; i < systemBetDenominator; i++) {
        numberOfSystemBetCombinations = (numberOfSystemBetCombinations * (mappedTradeData.length - i)) / (i + 1);
      }

      if (numberOfSystemBetCombinations > maxAllowedSystemCombinations) {
        return { error: `Max allowed number of system combinations is ${maxAllowedSystemCombinations}` };
      }

      systemBetData = getSystemBetData(tradeData, systemBetDenominator, collateral, maxSupportedOdds);
    }

    const [minBuyInAmount, sportAmmQuote] = await Promise.all([
      fetchMultiCollateralData(
        multiCollateralOnOffRamp,
        minBuyInAmountInDefaultCollateral,
        collateralAddress,
        collateralDecimals,
        defaultCollateral.decimals,
        collateralHasLp,
        isDefaultCollateral,
        collateral,
        network,
        provider,
      ),
      fetchTicketAmmQuote(
        sportsAmm,
        mappedTradeData,
        buyInAmount,
        collateralAddress,
        collateralDecimals,
        isDefaultCollateral,
        isSystemBet,
        systemBetDenominator,
      ),
    ]);

    if (minBuyInAmount.error) {
      return minBuyInAmount;
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

    if (sportAmmQuote.error) {
      return sportAmmQuote;
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
      ? Number(buyInAmount) * (await getCollateralRate(network, provider, collateral))
      : bigNumberFormatter(sportAmmQuote.buyInAmountInDefaultCollateral, defaultCollateral.decimals);
    payoutInDefaultCollateral = buyInAmountInDefaultCollateral / totalQuote;

    if (payoutInDefaultCollateral - buyInAmountInDefaultCollateral > maxSupportedAmount) {
      return { error: `The maximum supported profit is ${maxSupportedAmount}.` };
    }

    return isSystemBet
      ? {
          system: `${systemBetDenominator}/${mappedTradeData.length}`,
          numberOfSystemBetCombination: numberOfSystemBetCombinations,
          minQuote: {
            american: formatMarketOdds(systemBetData.systemBetMinimumQuote, OddsType.AMERICAN),
            decimal: formatMarketOdds(systemBetData.systemBetMinimumQuote, OddsType.DECIMAL),
            normalizedImplied: formatMarketOdds(systemBetData.systemBetMinimumQuote, OddsType.AMM),
          },
          maxQuote: {
            american: formatMarketOdds(systemBetData.systemBetQuotePerCombination, OddsType.AMERICAN),
            decimal: formatMarketOdds(systemBetData.systemBetQuotePerCombination, OddsType.DECIMAL),
            normalizedImplied: formatMarketOdds(systemBetData.systemBetQuotePerCombination, OddsType.AMM),
          },
          buyInPerCombination: {
            [collateral]: buyInAmount / numberOfSystemBetCombinations,
            usd: buyInAmountInDefaultCollateral / numberOfSystemBetCombinations,
          },
          minPayout: {
            [collateral]:
              collateralHasLp && !isDefaultCollateral
                ? buyInAmount / numberOfSystemBetCombinations / systemBetData.systemBetMinimumQuote
                : undefined,
            usd: buyInAmountInDefaultCollateral / numberOfSystemBetCombinations / systemBetData.systemBetMinimumQuote,
            payoutCollateral: collateralHasLp ? collateral : defaultCollateral.symbol,
          },
          maxPayout: {
            [collateral]: collateralHasLp && !isDefaultCollateral ? payout : undefined,
            usd: payoutInDefaultCollateral,
            payoutCollateral: collateralHasLp ? collateral : defaultCollateral.symbol,
          },
          buyInAmountInUsd: buyInAmountInDefaultCollateral,
        }
      : {
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

async function getLiquidityData(network, mappedTradeData, provider) {
  const defaultCollateral = getDefaultCollateral(network);
  try {
    const sportsAMMV2RiskManager = new ethers.Contract(
      sportsAMMV2RiskManagerContract.addresses[network],
      sportsAMMV2RiskManagerContract.abi,
      provider,
    );

    const riskPromises = [];
    const capPromises = [];
    for (let i = 0; i < mappedTradeData.length; i++) {
      const market = mappedTradeData[i];
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
    for (let i = 0; i < mappedTradeData.length; i++) {
      const market = mappedTradeData[i];
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

async function getAmmQuote(network, tradeData, buyInAmount, collateral, isSystemBet, systemBetDenominator) {
  const provider = getProvider(network);

  const mappedTradeData = tradeData.map((data) => ({
    ...data,
    line: data.line * 100,
    odds: data.odds.map((odd) => parseEther(odd.toString()).toString()),
    combinedPositions: data.combinedPositions.map((combinedPositions) =>
      combinedPositions.map((combinedPosition) => ({
        ...combinedPosition,
        line: combinedPosition.line * 100,
      })),
    ),
  }));

  const [quoteDataResponse, liquidityDataResponse] = await Promise.all([
    getQuoteData(
      network,
      mappedTradeData,
      buyInAmount,
      collateral,
      provider,
      isSystemBet,
      systemBetDenominator,
      tradeData,
    ),
    getLiquidityData(network, mappedTradeData, provider),
  ]);

  if (!liquidityDataResponse.error && isThales(collateral)) {
    const [selectedCollateralCurrencyRate, thalesContractCurrencyRate] = await Promise.all([
      getCollateralRate(network, provider, collateral),
      getCollateralRate(network, provider, "THALES-CONTRACT"),
    ]);
    liquidityDataResponse.ticketLiquidityInUsd = Math.floor(
      (liquidityDataResponse.ticketLiquidityInUsd * selectedCollateralCurrencyRate) / thalesContractCurrencyRate,
    );
  }

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
