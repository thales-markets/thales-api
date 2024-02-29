const { ethers } = require("ethers");
const speedMarketsDataContract = require("../contracts/speedMarketsDataContract.js");
const { PYTH_CURRENCY_DECIMALS } = require("../constants/pyth");
const { getProvider } = require("../utils/provider");
const { bigNumberFormatter } = require("../utils/formatters");

const getSpeedMarketsData = async (network, markets) => {
  let marketsData = [];

  try {
    const provider = getProvider(network);
    const speedMarketsData = new ethers.Contract(
      speedMarketsDataContract.addresses[network],
      speedMarketsDataContract.abi,
      provider,
    );

    const marketData = await speedMarketsData.getMarketsData(markets);

    marketsData = markets.map((market, i) => ({
      address: market,
      asset: ethers.utils.parseBytes32String(marketData[i].asset),
      direction: marketData[i].direction == 0 ? "UP" : "DOWN",
      strikeTime: Number(marketData[i].strikeTime),
      strikePrice: bigNumberFormatter(marketData[i].strikePrice, PYTH_CURRENCY_DECIMALS),
    }));
  } catch (e) {
    console.log("Error: could not get speed markets data.", e);
  }

  return marketsData;
};

module.exports = { getSpeedMarketsData };
