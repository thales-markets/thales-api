const { ethers } = require("ethers");
const { NETWORK } = require("../constants/networks");
const { getProvider } = require("../utils/provider");
const { getCacheKey } = require("../utils/getters");
const { PREFIX_KEYS, BUFFER_PERIOD_FOR_INVALIDATION_IN_SECONDS } = require("../constants/cacheKeys");
const cache = require("./cache");
const { wait } = require("../utils/helpers");
const { sportsAMMLiquidityPoolContract } = require("../../abi/sportsAMMLiquidityPool");
const { parlayAMMLiquidityPoolContract } = require("../../abi/parlayAMMLiquidityPool");
const liquidityPoolContract = require("../../abi/thalesLPContract");
const liquidityPoolUSDCContract = require("../../abi/thalesLPUSDCContract");

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

const initThalesAMMEventListenerByNetwork = (networkId) => {
  try {
    console.log("initThalesAMMEventListenerByNetwork ", networkId);
    const provider = getProvider(networkId);

    const thalesAMMContractInstance = new ethers.Contract(
      liquidityPoolContract.addresses[networkId],
      liquidityPoolContract.abi,
      provider,
    );

    thalesAMMContractInstance.on("RoundClosed", async () => {
      console.log("Event thalesAMMContractInstance");

      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.DigitalOptions.LiquidityPoolPnl, [
          networkId,
          liquidityPoolContract.addresses[networkId],
        ]),
      ]);
    });
  } catch (e) {
    console.log("Error while trying to initialize thalesAMM contract listener -> ", e);
  }
};

const initThalesAMMUSDCEventListenerByNetwork = (networkId) => {
  try {
    console.log("initThalesAMMUSDCEventListenerByNetwork ", networkId);
    const provider = getProvider(networkId);

    const thalesAMMUSDCContractInstance = new ethers.Contract(
      liquidityPoolUSDCContract.addresses[networkId],
      liquidityPoolUSDCContract.abi,
      provider,
    );

    thalesAMMUSDCContractInstance.on("RoundClosed", async () => {
      console.log("Event thalesAMMUSDCContractInstance");

      await invalidationMechanism([
        getCacheKey(PREFIX_KEYS.DigitalOptions.LiquidityPoolPnl, [
          networkId,
          liquidityPoolUSDCContract.addresses[networkId],
        ]),
      ]);
    });
  } catch (e) {
    console.log("Error while trying to initialize thalesAMM USDC contract listener -> ", e);
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

const initializeThalesAMMLPListener = () => {
  initThalesAMMEventListenerByNetwork(NETWORK.Optimism);
  initThalesAMMEventListenerByNetwork(NETWORK.Arbitrum);
  initThalesAMMEventListenerByNetwork(NETWORK.Base);
  initThalesAMMUSDCEventListenerByNetwork(NETWORK.Optimism);
};

module.exports = {
  initializeSportsAMMLPListener,
  initializeParlayAMMLPListener,
  initializeThalesAMMLPListener,
};
