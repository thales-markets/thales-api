const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");
const { getProvider } = require("../utils/provider");
const sportsAMMContract = require("../../abi/sportsAMMContract");
const { getCacheKey } = require("../utils/getters");
const { PREFIX_KEYS, BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS } = require("../constants/cacheKeys");
const cache = require("./cache");
const { wait } = require("../utils/helpers");
const { parlayMarketsAMMContract } = require("../../abi/parlayMarketsAMMContract");
const { sportsAMMLiquidityPoolContract } = require("../../abi/sportsAMMLiquidityPool");
const { parlayAMMLiquidityPoolContract } = require("../../abi/parlayAMMLiquidityPool");

const invalidationMechanism = async (cacheKeys) => {
  try {
    await wait(BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS);

    const deletedKeysCount = cache.del(cacheKeys);
    console.log("Cache Keys -> ", cacheKeys);
    console.log("Successfully deleted cache keys -> ", deletedKeysCount);

    await wait(BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS);

    const retryDeletion = cache.del(cacheKeys);
    console.log("Repeat deletion ", retryDeletion);
  } catch (e) {
    console.log("Error ", e);
  }
};

const initSportsAMMEventListenerByNetwork = (networkId) => {
  try {
    console.log("initSportsAMMEventListenerByNetwork ", networkId);
    const provider = getProvider(networkId);

    const sportsAMMContractInstance = new ethers.Contract(
      sportsAMMContract.addresses[networkId],
      sportsAMMContract.abi,
      provider,
    );

    sportsAMMContractInstance.on("BoughtFromAmm", async (buyer) => {
      console.log("Event sportsAMMContractInstance");

      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.PositionBalance, [networkId, buyer]),
        getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, buyer]),
      ]);
    });
  } catch {
    console.log("Error while trying to initialize sportsAMM contract listener");
  }
};

const initParlayAMMEventListenerByNetwork = (networkId) => {
  try {
    console.log("initParlayAMMEventListenerByNetwork ", networkId);

    const provider = getProvider(networkId);

    const parlayAMMContractInstance = new ethers.Contract(
      parlayMarketsAMMContract.addresses[networkId],
      parlayMarketsAMMContract.abi,
      provider,
    );

    // ParlayMarketCreated event listener - When user buys parlay
    parlayAMMContractInstance.on("ParlayMarketCreated", async (_parlayAddress, buyer) => {
      console.log("Event ParlayMarketCreated ");

      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.Parlay, [networkId, buyer]),
        getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, buyer]),
      ]);
    });

    // ParlayResolved event listener - When user exercise parlay
    parlayAMMContractInstance.on("ParlayResolved", async (_parlayAddress, buyer) => {
      console.log("Event ParlayResolved");
      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.Parlay, [networkId, buyer]),
        getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, buyer]),
      ]);
    });
  } catch {
    console.log("Error while trying to initialize sportsAMM contract listener");
  }
};

const initSportAMMLPListeners = (networkId) => {
  try {
    console.log("InitSportsAMMLPListeners ", networkId);

    const provider = getProvider(networkId);

    const sportsAMMLPContractInstance = new ethers.Contract(
      sportsAMMLiquidityPoolContract.addresses[networkId],
      sportsAMMLiquidityPoolContract.abi,
      provider,
    );

    // Deposited event
    sportsAMMLPContractInstance.on("Deposited", async (user) => {
      console.log("Event SportsAMMLP Deposited ");

      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.LiquidityPoolTransactions, [networkId, user]),
      ]);
    });

    // WithdrawalRequested event
    sportsAMMLPContractInstance.on("WithdrawalRequested", async (user) => {
      console.log("Event SportsAMMLP WithdrawalRequested");
      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.LiquidityPoolTransactions, [networkId, user]),
      ]);
    });

    // WithdrawalRequested event
    sportsAMMLPContractInstance.on("RoundClosed", async () => {
      console.log("Event SportsAMMLP RoundClosed");
      await invalidationMechanism([getCacheKey(PREFIX_KEYS.SportsMarkets.LiquidityPoolPnl, [networkId, "single"])]);
    });
  } catch {
    console.log("Error while trying to initialize lp contract listeners");
  }
};

const initParlayAMMLPListeners = (networkId) => {
  try {
    console.log("initParlayAMMLPListeners ", networkId);

    const provider = getProvider(networkId);

    const parlayAMMLPContractInstance = new ethers.Contract(
      parlayAMMLiquidityPoolContract.addresses[networkId],
      parlayAMMLiquidityPoolContract.abi,
      provider,
    );

    // Deposited event
    parlayAMMLPContractInstance.on("Deposited", async (user) => {
      console.log("Event ParlayAMMLP Deposited ");

      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.LiquidityPoolTransactions, [networkId, user]),
      ]);
    });

    // WithdrawalRequested event
    parlayAMMLPContractInstance.on("WithdrawalRequested", async (user) => {
      console.log("Event ParlayAMMLP WithdrawalRequested");
      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.SportsMarkets.LiquidityPoolTransactions, [networkId, user]),
      ]);
    });

    // WithdrawalRequested event
    parlayAMMLPContractInstance.on("RoundClosed", async () => {
      console.log("Event ParlayAMMLP RoundClosed");
      await invalidationMechanism([getCacheKey(PREFIX_KEYS.SportsMarkets.LiquidityPoolPnl, [networkId, "parlay"])]);
    });
  } catch {
    console.log("Error while trying to initialize parlay lp contract listeners");
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

const initializeSportsAMMLPListener = () => {
  initSportAMMLPListeners(NETWORK.Optimism);
  initSportAMMLPListeners(NETWORK.Arbitrum);
  initSportAMMLPListeners(NETWORK.Base);
};

const initializeParlayAMMLPListener = () => {
  initParlayAMMLPListeners(NETWORK.Optimism);
  initParlayAMMLPListeners(NETWORK.Arbitrum);
  initParlayAMMLPListeners(NETWORK.Base);
};

module.exports = {
  initSportsAMMEventListenerByNetwork,
  initializeSportsAMMBuyListener,
  initParlayAMMEventListenerByNetwork,
  initializeParlayAMMBuyListener,
  initializeSportsAMMLPListener,
  initializeParlayAMMLPListener,
};
