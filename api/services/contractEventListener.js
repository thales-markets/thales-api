const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");
const { getWSProvider } = require("../utils/provider");
const sportsAMMContract = require("../../abi/sportsAMMContract");
const { getCacheKey } = require("../utils/getters");
const { PREFIX_KEYS, BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS } = require("../constants/cacheKeys");
const cache = require("./cache");
const { wait } = require("../utils/helpers");
const { parlayMarketsAMMContract } = require("../../abi/parlayMarketsAMMContract");

const initSportsAMMEventListenerByNetwork = (networkId) => {
  try {
    const provider = getWSProvider(networkId);

    const sportsAMMContractInstance = new ethers.Contract(
      sportsAMMContract.addresses[networkId],
      sportsAMMContract.abi,
      provider,
    );

    sportsAMMContractInstance.on("BoughtFromAmm", async (buyer, market) => {
      await wait(BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS);

      const deletedKeysCount = cache.del([
        getCacheKey(PREFIX_KEYS.SportsMarkets.PositionBalance, [networkId, buyer]),
        getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, buyer]),
      ]);
      console.log("Successfully deleted cache keys -> ", deletedKeysCount);
    });
  } catch (e) {
    console.log("Error while trying to initialize sportsAMM contract listener");
  }
};

const initParlayAMMEventListenerByNetwork = (networkId) => {
  try {
    const provider = getWSProvider(networkId);

    const parlayAMMContractInstance = new ethers.Contract(
      parlayMarketsAMMContract.addresses[networkId],
      parlayMarketsAMMContract.abi,
      provider,
    );

    parlayAMMContractInstance.on("ParlayMarketCreated", async (parlayAddress, buyer) => {
      await wait(BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS);

      const deletedKeysCount = cache.del([
        getCacheKey(PREFIX_KEYS.SportsMarkets.Parlay, [networkId, buyer]),
        getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, buyer]),
      ]);
      console.log("Successfully deleted cache keys -> ", deletedKeysCount);
    });
  } catch (e) {
    console.log("Error while trying to initialize sportsAMM contract listener");
  }
};

const initializeSportsAMMBuyListener = () => {
  initSportsAMMEventListenerByNetwork(NETWORK.Optimism);
  initSportsAMMEventListenerByNetwork(NETWORK.Arbitrum);
  initSportsAMMEventListenerByNetwork(NETWORK.Base);
};

const initializeParlayAMMBuyListener = () => {
  initParlayAMMEventListenerByNetwork(NETWORK.Optimism);
  initParlayAMMEventListenerByNetwork(NETWORK.Arbitrum);
  initParlayAMMEventListenerByNetwork(NETWORK.Base);
};

module.exports = {
  initSportsAMMEventListenerByNetwork,
  initializeSportsAMMBuyListener,
  initParlayAMMEventListenerByNetwork,
  initializeParlayAMMBuyListener,
};
