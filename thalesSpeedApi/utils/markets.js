const {
  SUPPORTED_NETWORKS,
  SUPPORTED_ASSETS,
  SUPPORTED_COLLATERALS,
  ALTCOIN_CONVERSION_BUFFER_PERCENTAGE,
} = require("../constants/markets");
const { CRYPTO_CURRENCY_MAP, COLLATERALS, STABLE_COLLATERALS, COLLATERAL_DECIMALS } = require("../constants/currency");
const { roundNumberToDecimals } = require("./formatters");
const exchangeRatesData = require("../source/exchangeRates");

const getIsNetworkSupported = (network) => SUPPORTED_NETWORKS.includes(network);

const getIsAssetSupported = (asset) => SUPPORTED_ASSETS.includes(asset);

const getIsDefaultCollateral = (network, collateral) => SUPPORTED_COLLATERALS[network][0].includes(collateral);

const getIsStableCollateral = (collateral) => STABLE_COLLATERALS.includes(collateral);

const getIsEth = (collateral) => collateral == CRYPTO_CURRENCY_MAP.ETH;

const getCollateralAddress = (network, collateral) => COLLATERALS[network][collateral];

const getCollateralDecimals = (collateral) => COLLATERAL_DECIMALS[collateral];

// get dynamic LP fee based on time threshold and delta time to maturity
const getFeeByTimeThreshold = (
  deltaTimeSec,
  timeThresholds, // in minutes - ascending order
  fees,
  defaultFee,
) => {
  let index = -1;
  // iterate backwards and find index
  for (let i = timeThresholds.length - 1; i >= 0; i--) {
    if (Math.trunc(deltaTimeSec / 60) >= timeThresholds[i]) {
      index = i;
      break;
    }
  }
  return Number(index !== -1 ? fees[index] : defaultFee);
};

const getSkewImpact = (speedLimits, asset) => {
  const skewPerPosition = { ["UP"]: 0, ["DOWN"]: 0 };

  const riskPerUp = speedLimits.risksPerAssetAndDirection.filter(
    (data) => data.currency == asset && data.position == "UP",
  )[0];
  const riskPerDown = speedLimits.risksPerAssetAndDirection.filter(
    (data) => data.currency == asset && data.position == "DOWN",
  )[0];

  if (riskPerUp && riskPerDown) {
    skewPerPosition["UP"] = roundNumberToDecimals((riskPerUp.current / riskPerUp.max) * speedLimits.maxSkewImpact, 4);
    skewPerPosition["DOWN"] = roundNumberToDecimals(
      (riskPerDown.current / riskPerDown.max) * speedLimits.maxSkewImpact,
      4,
    );
  }

  return skewPerPosition;
};

const getConvertedFromStable = async (value, collateral, isMinBuyin, network) => {
  if (getIsStableCollateral(collateral)) {
    return value;
  }
  const exchangeRates = await exchangeRatesData.getExchangeRates(network);
  const rate = exchangeRates[collateral];
  const priceFeedBuffer = isMinBuyin ? 1 - ALTCOIN_CONVERSION_BUFFER_PERCENTAGE : 1;
  return rate
    ? Math.ceil((value / (rate * priceFeedBuffer)) * 10 ** COLLATERAL_DECIMALS[collateral]) /
        10 ** COLLATERAL_DECIMALS[collateral]
    : 0;
};

const getConvertedToStable = async (value, collateral, network) => {
  if (getIsStableCollateral(collateral)) {
    return value;
  }
  const exchangeRates = await exchangeRatesData.getExchangeRates(network);
  const rate = exchangeRates[collateral] || 0;
  return value * rate * (1 - ALTCOIN_CONVERSION_BUFFER_PERCENTAGE);
};

const getIsUserWon = (direction, strikePrice, finalPrice) =>
  (direction == "UP" && finalPrice > strikePrice) || (direction == "DOWN" && finalPrice < strikePrice);

module.exports = {
  getIsNetworkSupported,
  getIsAssetSupported,
  getIsDefaultCollateral,
  getIsStableCollateral,
  getIsEth,
  getCollateralAddress,
  getCollateralDecimals,
  getFeeByTimeThreshold,
  getSkewImpact,
  getConvertedFromStable,
  getConvertedToStable,
  getIsUserWon,
};
