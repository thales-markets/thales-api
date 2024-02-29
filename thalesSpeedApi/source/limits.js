const { ethers } = require("ethers");
const speedMarketsDataContract = require("../contracts/speedMarketsDataContract.js");
const { CRYPTO_CURRENCY_MAP } = require("../constants/currency");
const { ZERO_ADDRESS, MAX_BUYIN_COLLATERAL_CONVERSION_BUFFER } = require("../constants/markets");
const { getProvider } = require("../utils/provider");
const { coinFormatter, bigNumberFormatter } = require("../utils/formatters");

const getSpeedMarketsLimits = async (network) => {
  const ammSpeedMarketsLimits = {
    minBuyinAmount: 0,
    maxBuyinAmount: 0,
    minimalTimeToMaturity: 0,
    maximalTimeToMaturity: 0,
    risksPerAsset: [],
    risksPerAssetAndDirection: [],
    timeThresholdsForFees: [],
    lpFees: [],
    defaultLPFee: 0,
    maxSkewImpact: 0,
    safeBoxImpact: 0,
  };

  try {
    const provider = getProvider(network);
    const speedMarketsData = new ethers.Contract(
      speedMarketsDataContract.addresses[network],
      speedMarketsDataContract.abi,
      provider,
    );

    const [speedMarketsAMMParameters, riskForETH, riskForBTC, directionalRiskForETH, directionalRiskForBTC] =
      await Promise.all([
        speedMarketsData.getSpeedMarketsAMMParameters(ZERO_ADDRESS),
        speedMarketsData.getRiskPerAsset(ethers.utils.formatBytes32String(CRYPTO_CURRENCY_MAP.ETH)),
        speedMarketsData.getRiskPerAsset(ethers.utils.formatBytes32String(CRYPTO_CURRENCY_MAP.BTC)),
        speedMarketsData.getDirectionalRiskPerAsset(ethers.utils.formatBytes32String(CRYPTO_CURRENCY_MAP.ETH)),
        speedMarketsData.getDirectionalRiskPerAsset(ethers.utils.formatBytes32String(CRYPTO_CURRENCY_MAP.BTC)),
      ]);

    ammSpeedMarketsLimits.minBuyinAmount = Math.ceil(coinFormatter(speedMarketsAMMParameters.minBuyinAmount, network));
    ammSpeedMarketsLimits.maxBuyinAmount =
      coinFormatter(speedMarketsAMMParameters.maxBuyinAmount, network) - MAX_BUYIN_COLLATERAL_CONVERSION_BUFFER;
    ammSpeedMarketsLimits.minimalTimeToMaturity = Number(speedMarketsAMMParameters.minimalTimeToMaturity);
    ammSpeedMarketsLimits.maximalTimeToMaturity = Number(speedMarketsAMMParameters.maximalTimeToMaturity);

    ammSpeedMarketsLimits.risksPerAsset = [
      {
        currency: CRYPTO_CURRENCY_MAP.ETH,
        current: coinFormatter(riskForETH.current, network),
        max: coinFormatter(riskForETH.max, network),
      },
      {
        currency: CRYPTO_CURRENCY_MAP.BTC,
        current: coinFormatter(riskForBTC.current, network),
        max: coinFormatter(riskForBTC.max, network),
      },
    ];

    directionalRiskForETH.map((risk) => {
      ammSpeedMarketsLimits.risksPerAssetAndDirection.push({
        currency: CRYPTO_CURRENCY_MAP.ETH,
        position: risk.direction == 0 ? "UP" : "DOWN",
        current: coinFormatter(risk.current, network),
        max: coinFormatter(risk.max, network),
      });
    });
    directionalRiskForBTC.map((risk) => {
      ammSpeedMarketsLimits.risksPerAssetAndDirection.push({
        currency: CRYPTO_CURRENCY_MAP.BTC,
        position: risk.direction == 0 ? "UP" : "DOWN",
        current: coinFormatter(risk.current, network),
        max: coinFormatter(risk.max, network),
      });
    });

    ammSpeedMarketsLimits.timeThresholdsForFees = speedMarketsAMMParameters.timeThresholdsForFees.map((time) =>
      Number(time),
    );
    ammSpeedMarketsLimits.lpFees = speedMarketsAMMParameters.lpFees.map((lpFee) => bigNumberFormatter(lpFee));
    ammSpeedMarketsLimits.defaultLPFee = bigNumberFormatter(speedMarketsAMMParameters.lpFee);
    ammSpeedMarketsLimits.maxSkewImpact = bigNumberFormatter(speedMarketsAMMParameters.maxSkewImpact);
    ammSpeedMarketsLimits.safeBoxImpact = bigNumberFormatter(speedMarketsAMMParameters.safeBoxImpact);
  } catch (e) {
    console.log("Error: could not get speed markets limits.", e);
  }

  return ammSpeedMarketsLimits;
};

module.exports = { getSpeedMarketsLimits };
