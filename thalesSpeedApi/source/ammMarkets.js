const { ethers } = require("ethers");
const ammSpeedMarketsContract = require("../contracts/ammSpeedMarketsContract.js");
const { getProvider } = require("../utils/provider.js");

const getUserActiveMarkets = async (network, user) => {
  let markets = [];

  try {
    const provider = getProvider(network);
    const ammSpeedMarkets = new ethers.Contract(
      ammSpeedMarketsContract.addresses[network],
      ammSpeedMarketsContract.abi,
      provider,
    );

    const marketsLength = await ammSpeedMarkets.getLengths(user);
    markets = await ammSpeedMarkets.activeMarketsPerUser(0, marketsLength[2], user);
  } catch (e) {
    console.log("Error: could not get user active markets.", e);
  }

  return markets;
};

module.exports = { getUserActiveMarkets };
