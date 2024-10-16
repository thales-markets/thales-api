const { redisClient } = require("../../redis/client");

require("dotenv").config();

const { ethers } = require("ethers");
const { uniq } = require("lodash");

const positionalMarketDataContract = require("../contracts/positionalMarketDataContract");
const positionalMarketDataUSDCContract = require("../contracts/positionalMarketDataUSDCContract");
const { getProvider } = require("../utils/provider");
const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { delay } = require("../utils/general");
const { parseBytes32String, formatBytes32String } = require("ethers/lib/utils");
const {
  ZERO_ADDRESS,
  POSITION_TYPE,
  RANGED_POSITION_TYPE,
  RANGED_POSITION_TYPE_NAME_MAP,
  POSITION_TYPE_NAME_MAP,
} = require("../constants/markets");
const { bigNumberFormatter } = require("../utils/formatters");
const { getDefaultCollateral } = require("../utils/collaterals");
const KEYS = require("../../redis/redis-keys");
const {
  getCurrencyPriority,
  convertPriceImpactToBonus,
  calculatRoi,
  getContractForInteraction,
  getIsDeprecatedCurrency,
} = require("../utils/markets");
const thalesData = require("thales-data");
const { LP_COLLATERALS } = require("../constants/collaterals");

async function processMarkets() {
  if (process.env.REDIS_URL) {
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          console.log("process markets on optimism");
          await processMarketsPerNetwork(NETWORK.Optimism, LP_COLLATERALS.USDC);
          await processMarketsPerNetwork(NETWORK.Optimism);
        } catch (error) {
          console.log("markets on optimism error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process markets on polygon");
          await processMarketsPerNetwork(NETWORK.Polygon);
        } catch (error) {
          console.log("markets on polygon error: ", error);
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

        await delay(2 * 60 * 1000);
      }
    }, 3000);
  }
}

const mapMarketsInfo = (marketsInfo, positionType, isRangedMarket, asset, maturityDate, network, isUsdc) => {
  const filteredMarketsInfo = marketsInfo.filter(
    (marketInfo) => bigNumberFormatter(marketInfo.liquidity) !== 0 && bigNumberFormatter(marketInfo.price) !== 0,
  );

  const mappedMarketsInfo = filteredMarketsInfo.map((marketInfo) => {
    const discount = bigNumberFormatter(marketInfo.priceImpact);

    const price = bigNumberFormatter(marketInfo.price, getDefaultCollateral(network, isUsdc).decimals);
    const priceWithoutDiscount = (1 - discount) * price;

    const roi = calculatRoi(price);
    const roiWithoutDiscount = calculatRoi(priceWithoutDiscount);

    let mappedMarketInfo = {
      address: marketInfo.market,
      asset: asset,
      maturityDate: maturityDate,
      position: isRangedMarket ? RANGED_POSITION_TYPE_NAME_MAP[positionType] : POSITION_TYPE_NAME_MAP[positionType],
    };

    if (isRangedMarket) {
      mappedMarketInfo.leftPrice = bigNumberFormatter(marketInfo.leftPrice);
      mappedMarketInfo.rightPrice = bigNumberFormatter(marketInfo.rightPrice);
    } else {
      mappedMarketInfo.strikePrice = bigNumberFormatter(marketInfo.strikePrice);
    }

    mappedMarketInfo = {
      ...mappedMarketInfo,
      price: price,
      bonus: convertPriceImpactToBonus(discount),
      roi: {
        baseRoi: discount < 0 ? roiWithoutDiscount : roi,
        bonusRoi: discount < 0 ? roi - roiWithoutDiscount : 0,
        totalRoi: roi,
      },
      liquidity: bigNumberFormatter(marketInfo.liquidity),
      skewImpact: discount,
    };

    return mappedMarketInfo;
  });

  let finalData = mappedMarketsInfo;

  if (isRangedMarket) {
    finalData = finalData.sort((a, b) => b.leftPrice - a.leftPrice);
  } else {
    const dataToFilter = mappedMarketsInfo.sort((a, b) =>
      positionType === POSITION_TYPE.Up ? a.strikePrice - b.strikePrice : b.strikePrice - a.strikePrice,
    );

    let filterFlag = false;
    finalData = dataToFilter
      .filter((marketInfo) => {
        if (!filterFlag) {
          if (marketInfo.price < 0.1) {
            filterFlag = true;
          }
          return marketInfo;
        }
      })
      .sort((a, b) => b.strikePrice - a.strikePrice);
  }
  return finalData;
};

async function processMarketsPerNetwork(network, lpCollateral) {
  const isUsdc = lpCollateral === LP_COLLATERALS.USDC;
  const isDeprecatedCurrency = !isUsdc;
  const positionalMarketDataContractForInteraction = getContractForInteraction(
    network,
    isDeprecatedCurrency,
    positionalMarketDataContract,
    positionalMarketDataUSDCContract,
  );

  try {
    const provider = getProvider(network);
    const positionalMarketData = new ethers.Contract(
      positionalMarketDataContractForInteraction.addresses[network],
      positionalMarketDataContractForInteraction.abi,
      provider,
    );

    // 1 for getAvailableAssets
    let numberOfContractCalls = 1;

    console.log(`${NETWORK_NAME[network]}: Getting all available assets...`);
    const assetsBytes32 = await positionalMarketData.getAvailableAssets();

    const assets = uniq(assetsBytes32)
      .map((data) => parseBytes32String(data))
      .sort((a, b) => getCurrencyPriority(a) - getCurrencyPriority(b));

    const allMarkets = [];

    // getMaturityDates for each asset
    numberOfContractCalls += assets.length;

    console.log(`${NETWORK_NAME[network]}: Getting all available maturity dates...`);
    const maturityDatesPromises = [];
    for (let i = 0; i < assets.length; i++) {
      maturityDatesPromises.push(positionalMarketData.getMaturityDates(formatBytes32String(assets[i])));
    }
    const maturityDatesPromisesResult = await Promise.all(maturityDatesPromises);

    for (let i = 0; i < assets.length; i++) {
      const maturityDates = maturityDatesPromisesResult[i];

      // filter markets 24h before maturity
      const today = new Date();
      const tomorrow = Math.round(new Date(new Date().setDate(today.getDate() + 1)).getTime() / 1000);
      const filteredMaturityDates = uniq(
        maturityDates.map((date) => Number(date)).filter((date) => date > 0 && date > tomorrow),
      ).sort((a, b) => a - b);

      // getMarketsForAssetAndStrikeDate for each maturity date
      // getActiveMarketsInfoPerPosition UP for each maturity date
      // getActiveMarketsInfoPerPosition DOWN for each maturity date
      numberOfContractCalls += 3 * filteredMaturityDates.length;

      console.log(`${NETWORK_NAME[network]}: Getting all markets info for ${assets[i]}...`);
      const marketsAddressesPromises = [];
      const rangedMarketsPromises = [];
      for (let j = 0; j < filteredMaturityDates.length; j++) {
        // get markets
        marketsAddressesPromises.push(
          positionalMarketData.getMarketsForAssetAndStrikeDate(
            formatBytes32String(assets[i]),
            filteredMaturityDates[j],
          ),
        );
        // get ranged markets
        rangedMarketsPromises.push(
          thalesData.binaryOptions.rangedMarkets({
            max: Infinity,
            network,
            minMaturity: filteredMaturityDates[j],
            maxMaturity: filteredMaturityDates[j],
            currencyKey: formatBytes32String(assets[i]),
          }),
        );
      }
      const marketsAddressesPromisesResult = await Promise.all(marketsAddressesPromises);
      const rangedMarketsPromisesResult = await Promise.all(rangedMarketsPromises);

      const marketsInfoUpPromises = [];
      const marketsInfoDownPromises = [];
      const marketsInfoInPromises = [];
      const marketsInfoOutPromises = [];
      const numberOfRangedMarketsBatches = [];
      for (let j = 0; j < filteredMaturityDates.length; j++) {
        const marketsAddresses = marketsAddressesPromisesResult[j];
        const filteredMarketsAddresses = marketsAddresses.filter((value) => value !== ZERO_ADDRESS);

        marketsInfoUpPromises.push(
          positionalMarketData.getActiveMarketsInfoPerPosition(filteredMarketsAddresses, POSITION_TYPE.Up),
        );
        marketsInfoDownPromises.push(
          positionalMarketData.getActiveMarketsInfoPerPosition(filteredMarketsAddresses, POSITION_TYPE.Down),
        );

        const rangedMarketsAddresses = rangedMarketsPromisesResult[j]
          .filter((market) => {
            const isDeprecated = getIsDeprecatedCurrency(network, market.managerAddress);
            return (isDeprecatedCurrency && isDeprecated) || (!isDeprecatedCurrency && !isDeprecated);
          })
          .map((market) => market.address);

        // contract call fails for more than 50 markets on most RPCs (Ankr and Blast), create batches for ranged markets
        const batchSize = process.env.BATCH_SIZE;
        const numberOfBatches = Math.trunc(rangedMarketsAddresses.length / batchSize) + 1;
        numberOfRangedMarketsBatches[j] = numberOfBatches;

        // console.log(
        //   `${NETWORK_NAME[network]}: numberOfMarketsAddresses ${filteredMarketsAddresses.length}, numberOfRangedMarketsAddresses ${rangedMarketsAddresses.length}, batchSize: ${batchSize}, numberOfBatches: ${numberOfBatches}.`,
        // );

        for (let i = 0; i < numberOfBatches; i++) {
          marketsInfoInPromises.push(
            positionalMarketData.getRangedActiveMarketsInfoPerPosition(
              rangedMarketsAddresses.slice(i * batchSize, (i + 1) * batchSize),
              RANGED_POSITION_TYPE.In,
            ),
          );
          marketsInfoOutPromises.push(
            positionalMarketData.getRangedActiveMarketsInfoPerPosition(
              rangedMarketsAddresses.slice(i * batchSize, (i + 1) * batchSize),
              RANGED_POSITION_TYPE.Out,
            ),
          );
        }
      }

      // getRangedActiveMarketsInfoPerPosition IN for each maturity date
      numberOfContractCalls += marketsInfoInPromises.length;
      // getRangedActiveMarketsInfoPerPosition OUT for each maturity date
      numberOfContractCalls += marketsInfoOutPromises.length;

      const marketsInfoUpPromisesResult = await Promise.all(marketsInfoUpPromises);
      const marketsInfoDownPromisesResult = await Promise.all(marketsInfoDownPromises);
      const marketsInfoInPromisesResult = await Promise.all(marketsInfoInPromises);
      const marketsInfoOutPromisesResult = await Promise.all(marketsInfoOutPromises);

      for (let j = 0; j < filteredMaturityDates.length; j++) {
        const marketsInfoUp = marketsInfoUpPromisesResult[j];
        const marketsInfoDown = marketsInfoDownPromisesResult[j];

        // get startIndex in promises result for maturity date based on number of batches
        let startIndex = 0;
        for (let k = 0; k < j; k++) {
          startIndex += numberOfRangedMarketsBatches[k];
        }
        // console.log(`${NETWORK_NAME[network]}: startIndex ${startIndex} for j: ${j}.`);

        // get marketsInfo from promises result and flat (merge) arrays
        const marketsInfoIn = marketsInfoInPromisesResult
          .slice(startIndex, startIndex + numberOfRangedMarketsBatches[j])
          .flat(1);
        const marketsInfoOut = marketsInfoOutPromisesResult
          .slice(startIndex, startIndex + numberOfRangedMarketsBatches[j])
          .flat(1);

        const maturityDate = new Date(filteredMaturityDates[j] * 1000).toISOString();
        allMarkets.push(
          ...mapMarketsInfo(marketsInfoUp, POSITION_TYPE.Up, false, assets[i], maturityDate, network, isUsdc),
        );
        allMarkets.push(
          ...mapMarketsInfo(marketsInfoDown, POSITION_TYPE.Down, false, assets[i], maturityDate, network, isUsdc),
        );
        allMarkets.push(
          ...mapMarketsInfo(marketsInfoIn, RANGED_POSITION_TYPE.In, true, assets[i], maturityDate, network, isUsdc),
        );
        allMarkets.push(
          ...mapMarketsInfo(marketsInfoOut, RANGED_POSITION_TYPE.Out, true, assets[i], maturityDate, network, isUsdc),
        );
      }
    }

    console.log(
      `${NETWORK_NAME[network]}: Number of contract calls for ${
        lpCollateral || "default collateral"
      } is ${numberOfContractCalls}.`,
    );
    console.log(
      `${NETWORK_NAME[network]}: All Markets length for ${lpCollateral || "default collateral"} -> `,
      allMarkets.length,
    );

    redisClient.set(
      (isUsdc ? KEYS.THALES_USDC_MARKETS : KEYS.THALES_MARKETS)[network],
      JSON.stringify(allMarkets),
      function () {},
    );
    redisClient.set(
      (isUsdc ? KEYS.THALES_USDC_MARKETS_LAST_UPDATED_AT : KEYS.THALES_MARKETS_LAST_UPDATED_AT)[network],
      new Date().toISOString(),
      function () {},
    );
  } catch (e) {
    console.log("Error: could not process markets.", e);
  }
}

module.exports = {
  processMarkets,
  processMarketsPerNetwork,
};
