const { ethers } = require("ethers");
const speedMarketsDataContract = require("../contracts/speedMarketsDataContract.js");
const { ZERO_ADDRESS, MAX_BUYIN_COLLATERAL_CONVERSION_BUFFER } = require("../constants/markets");
const { getProvider } = require("../utils/provider");
const { coinFormatter } = require("../utils/formatters");

const getSpeedMarketsLimits = async (network) => {
  const ammSpeedMarketsLimits = {
    minBuyinAmount: 0,
    maxBuyinAmount: 0,
  };

  try {
    const provider = getProvider(network);
    const speedMarketsData = new ethers.Contract(
      speedMarketsDataContract.addresses[network],
      speedMarketsDataContract.abi,
      provider,
    );

    const speedMarketsAMMParameters = await speedMarketsData.getSpeedMarketsAMMParameters(ZERO_ADDRESS);

    ammSpeedMarketsLimits.minBuyinAmount = Math.ceil(coinFormatter(speedMarketsAMMParameters.minBuyinAmount, network));
    ammSpeedMarketsLimits.maxBuyinAmount =
      coinFormatter(speedMarketsAMMParameters.maxBuyinAmount, network) - MAX_BUYIN_COLLATERAL_CONVERSION_BUFFER;
  } catch (e) {
    console.log("Error: could not get speed markets limits.", e);
  }

  return ammSpeedMarketsLimits;
};

module.exports = { getSpeedMarketsLimits };
