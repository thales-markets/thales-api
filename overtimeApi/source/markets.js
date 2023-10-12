require("dotenv").config();

const thalesData = require("thales-data");
const redis = require("redis");
const { ethers } = require("ethers");
const { orderBy, groupBy } = require("lodash");

const sportPositionalMarketDataContract = require("../contracts/sportPositionalMarketDataContract");
const sportPositionalMarketManagerContract = require("../contracts/sportPositionalMarketManagerContract");
const { BET_TYPE } = require("../constants/markets");
const { convertPriceImpactToBonus, packMarket } = require("../utils/markets");
const KEYS = require("../../redis/redis-keys");
const { getProvider } = require("../utils/provider");
const { NETWORK_NAME, NETWORK } = require("../constants/networks");
const { delay } = require("../utils/general");
const { bigNumberFormatter } = require("../utils/formatters");
const { getDefaultCollateral } = require("../utils/collaterals");

let marketsMap = new Map();

const BATCH_SIZE = 100;
const BASE_BATCH_SIZE = 50;

async function processMarkets() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          console.log("process markets on optimism");
          await processMarketsPerNetwork(NETWORK.Optimism);
        } catch (error) {
          console.log("markets on optimism error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process markets on arbitrum");
          await processMarketsPerNetwork(NETWORK.Arbitrum);
        } catch (error) {
          console.log("markets on arbitrum error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process markets on base");
          await processMarketsPerNetwork(NETWORK.Base);
        } catch (error) {
          console.log("markets on base error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process markets on op goerli");
          await processMarketsPerNetwork(NETWORK.OptimismGoerli);
        } catch (error) {
          console.log("markets on op goerli error: ", error);
        }

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

const childrenOf = (parentMarket, groupedMarkets) => {
  return (groupedMarkets[parentMarket] || []).map((market) => ({
    ...market,
    childMarkets: orderBy(childrenOf(market.address, groupedMarkets), ["betType"], ["asc"]),
  }));
};

const groupMarkets = (allMarkets) => {
  const groupedMarkets = groupBy(allMarkets, (market) => market.parentMarket);
  return childrenOf("null", groupedMarkets);
};

const mapMarkets = async (allMarkets, mapOnlyOpenedMarkets, network) => {
  const mappedMarkets = [];

  let oddsFromContract;
  let priceImpactFromContract;
  let liquidityFromContract;
  if (mapOnlyOpenedMarkets) {
    try {
      const provider = getProvider(network);
      const sportPositionalMarketData = new ethers.Contract(
        sportPositionalMarketDataContract.addresses[network],
        sportPositionalMarketDataContract.abi,
        provider,
      );
      const sportPositionalMarketManager = new ethers.Contract(
        sportPositionalMarketManagerContract.addresses[network],
        sportPositionalMarketManagerContract.abi,
        provider,
      );

      const batchSize = network === NETWORK.Base ? BASE_BATCH_SIZE : BATCH_SIZE;

      const numberOfActiveMarkets = await sportPositionalMarketManager.numActiveMarkets();
      const numberOfBatches = Math.trunc(numberOfActiveMarkets / batchSize) + 1;

      const promises = [];
      for (let i = 0; i < numberOfBatches; i++) {
        promises.push(sportPositionalMarketData.getOddsForAllActiveMarketsInBatches(i, batchSize));
      }
      for (let i = 0; i < numberOfBatches; i++) {
        promises.push(sportPositionalMarketData.getPriceImpactForAllActiveMarketsInBatches(i, batchSize));
      }
      for (let i = 0; i < numberOfBatches; i++) {
        promises.push(sportPositionalMarketData.getLiquidityForAllActiveMarketsInBatches(i, batchSize));
      }

      const promisesResult = await Promise.all(promises);

      oddsFromContract = promisesResult.slice(0, numberOfBatches).flat(1);
      priceImpactFromContract = promisesResult.slice(numberOfBatches, 2 * numberOfBatches).flat(1);
      liquidityFromContract = promisesResult.slice(2 * numberOfBatches, 3 * numberOfBatches).flat(1);
    } catch (e) {
      console.log("Could not get oods from chain", e);
    }
  }

  allMarkets.forEach((market) => {
    if (mapOnlyOpenedMarkets) {
      if (oddsFromContract) {
        const oddsItem = oddsFromContract.find(
          (obj) => obj[0].toString().toLowerCase() === market.address.toLowerCase(),
        );
        if (oddsItem) {
          const defaultCollateralDecimals = getDefaultCollateral(network, collateral).decimals;
          market.homeOdds = bigNumberFormatter(oddsItem.odds[0], defaultCollateralDecimals);
          market.awayOdds = bigNumberFormatter(oddsItem.odds[1], defaultCollateralDecimals);
          market.drawOdds = oddsItem.odds[2]
            ? bigNumberFormatter(oddsItem.odds[2], defaultCollateralDecimals)
            : undefined;
        }
      }
      if (priceImpactFromContract) {
        const priceImpactItem = priceImpactFromContract.find(
          (obj) => obj[0].toString().toLowerCase() === market.address.toLowerCase(),
        );
        if (priceImpactItem) {
          market.homePriceImpact = bigNumberFormatter(priceImpactItem.priceImpact[0]);
          market.awayPriceImpact = bigNumberFormatter(priceImpactItem.priceImpact[1]);
          market.drawPriceImpact = priceImpactItem.priceImpact[2]
            ? bigNumberFormatter(priceImpactItem.priceImpact[2])
            : undefined;
          market.homeBonus = convertPriceImpactToBonus(market.homePriceImpact);
          market.awayBonus = convertPriceImpactToBonus(market.awayPriceImpact);
          market.drawBonus = market.drawPriceImpact ? convertPriceImpactToBonus(market.drawPriceImpact) : undefined;
        }
      }
      if (liquidityFromContract) {
        const liquidityItem = liquidityFromContract.find(
          (obj) => obj[0].toString().toLowerCase() === market.address.toLowerCase(),
        );
        if (liquidityItem) {
          market.homeLiquidity = bigNumberFormatter(liquidityItem.liquidity[0]);
          market.awayLiquidity = bigNumberFormatter(liquidityItem.liquidity[1]);
          market.drawLiquidity = liquidityItem.liquidity[2]
            ? bigNumberFormatter(liquidityItem.liquidity[2])
            : undefined;
          market.homeLiquidityUsd = bigNumberFormatter(liquidityItem.liquidityUsd[0]);
          market.awayLiquidityUsd = bigNumberFormatter(liquidityItem.liquidityUsd[1]);
          market.drawLiquidityUsd = liquidityItem.liquidity[2]
            ? bigNumberFormatter(liquidityItem.liquidityUsd[2])
            : undefined;
        }
      }

      if (
        market.homeOdds !== 0 ||
        market.awayOdds !== 0 ||
        (market.drawOdds || 0) !== 0 ||
        market.betType === BET_TYPE.DoubleChance
      ) {
        mappedMarkets.push(market);
      }
    } else {
      mappedMarkets.push(market);
    }
  });

  let packedMarkets = mappedMarkets.map((market) => packMarket(market));

  let finalMarkets = groupMarkets(packedMarkets);
  // if (mapOnlyOpenedMarkets && mappedMarkets.length > 0) {
  //   try {
  //     const { sportPositionalMarketDataContract } = networkConnector;

  //     const tmpOpenMarkets = groupMarkets(mappedMarkets);
  //     const sgpFees: SGPItem[] | undefined = localStore.get(LOCAL_STORAGE_KEYS.SGP_FEES);
  //     const tmpTags: number[] = [];

  //     if (sgpFees) sgpFees.forEach((sgpItem) => tmpTags.push(...sgpItem.tags));

  //     const marketsFilteredByTags = filterMarketsByTagsArray(tmpOpenMarkets, tmpTags);
  //     const marketAddresses = getMarketAddressesFromSportMarketArray(marketsFilteredByTags);

  //     if (marketAddresses) {
  //       const promises: CombinedMarketsContractData[] = [];
  //       const numberOfBatches = Math.trunc(marketAddresses.length / BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY) + 1;

  //       for (let i = 0; i < numberOfBatches; i++) {
  //         const arraySlice = marketAddresses.slice(
  //           i * BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY,
  //           i * BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY + BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY,
  //         );
  //         promises.push(sportPositionalMarketDataContract?.getCombinedOddsForBatchOfMarkets(arraySlice));
  //       }

  //       const promisesResult = await Promise.all(promises);

  //       const combinedMarketsData: CombinedMarketsContractData = [];

  //       promisesResult.forEach((promiseData) => {
  //         promiseData.forEach((_combinedMarketData: any) => {
  //           combinedMarketsData.push(_combinedMarketData);
  //         });
  //       });

  //       if (combinedMarketsData) {
  //         const newMarkets = insertCombinedMarketsIntoArrayOFMarkets(tmpOpenMarkets, combinedMarketsData);
  //         finalMarkets = newMarkets;
  //       }
  //     }
  //   } catch (e) {
  //     console.log("Error ", e);
  //   }
  // }

  return finalMarkets;
};

async function processMarketsPerNetwork(network) {
  const today = new Date();
  // thales-data takes timestamp argument in seconds
  const minMaturityDate = Math.round(new Date(new Date().setDate(today.getDate() - 7)).getTime() / 1000); // show history for 7 days in the past
  const todaysDate = Math.round(today.getTime() / 1000);

  console.log(`${NETWORK_NAME[network]}: process open markets`);
  let markets = await thalesData.sportMarkets.markets({
    isOpen: true,
    isCanceled: false,
    isPaused: false,
    network,
    minMaturityDate: todaysDate,
  });
  let mappedMarkets = await mapMarkets(markets, true, network);
  marketsMap.set("open", mappedMarkets);

  console.log(`${NETWORK_NAME[network]}: process resolved markets`);
  markets = await thalesData.sportMarkets.markets({
    isOpen: false,
    isCanceled: false,
    network,
    minMaturityDate,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("resolved", mappedMarkets);

  console.log(`${NETWORK_NAME[network]}: process canceled markets`);
  markets = await thalesData.sportMarkets.markets({
    isOpen: false,
    isCanceled: true,
    network,
    minMaturityDate,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("canceled", mappedMarkets);

  console.log(`${NETWORK_NAME[network]}: process paused markets`);
  markets = await await thalesData.sportMarkets.markets({
    isPaused: true,
    network,
    minMaturityDate,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("paused", mappedMarkets);

  console.log(`${NETWORK_NAME[network]}: process ongoing markets`);
  markets = await thalesData.sportMarkets.markets({
    isOpen: true,
    isCanceled: false,
    minMaturityDate,
    maxMaturityDate: todaysDate,
    network,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("ongoing", mappedMarkets);

  // console.log(marketsMap);

  redisClient.set(KEYS.OVERTIME_MARKETS[network], JSON.stringify([...marketsMap]), function () {});
}

module.exports = {
  processMarkets,
};
