require("dotenv").config();

const redis = require("redis");
const { ethers } = require("ethers");
const { uniq } = require("lodash");

const positionalMarketDataContract = require("../contracts/positionalMarketDataContract");
const { getProvider } = require("../utils/provider");
const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { delay } = require("../utils/general");
const { parseBytes32String, formatBytes32String } = require("ethers/lib/utils");
const {
  ZERO_ADDRESS,
  POSITION_TYPE,
  POSITION_NAME,
  RANGED_POSITION_TYPE,
  RANGED_POSITION_NAME,
} = require("../constants/markets");
const { bigNumberFormatter } = require("../utils/formatters");
const { getDefaultDecimalsForNetwork } = require("../utils/collaterals");
const KEYS = require("../../redis/redis-keys");
const { getCurrencyPriority, convertPriceImpactToBonus, calculatRoi } = require("../utils/markets");
const thalesData = require("thales-data");

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

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

const mapMarketsInfo = (marketsInfo, positionType, isRanged, asset, network) => {
  const filteredMarketsInfo = marketsInfo.filter(
    (marketInfo) => bigNumberFormatter(marketInfo.liquidity) !== 0 && bigNumberFormatter(marketInfo.price) !== 0,
  );

  const mappedMarketsInfo = filteredMarketsInfo.map((marketInfo) => {
    const discount = bigNumberFormatter(marketInfo.priceImpact);

    const price = bigNumberFormatter(marketInfo.price, getDefaultDecimalsForNetwork(network));
    const priceWithoutDiscount = (1 - discount) * price;

    const roi = calculatRoi(price);
    const roiWithoutDiscount = calculatRoi(priceWithoutDiscount);

    const mappedMarketInfo = {
      address: marketInfo.market,
      asset: asset,
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

    if (isRanged) {
      mappedMarketInfo.leftPrice = bigNumberFormatter(marketInfo.leftPrice);
      mappedMarketInfo.rightPrice = bigNumberFormatter(marketInfo.rightPrice);
    } else {
      mappedMarketInfo.strikePrice = bigNumberFormatter(marketInfo.strikePrice);
    }

    return mappedMarketInfo;
  });

  let finalData = mappedMarketsInfo;

  if (isRanged) {
    finalData = finalData.sort((a, b) => b.leftPrice - a.leftPrice);
  } else {
    const dataToFilter = mappedMarketsInfo.sort((a, b) =>
      positionType === POSITION_TYPE.Up ? a.strikePrice - b.strikePrice : b.strikePrice - a.strikePrice,
    );

    let filterFlag = false;
    finalData = dataToFilter
      .filter((marketInfo) => {
        if (filterFlag) {
          return;
        } else {
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

async function processMarketsPerNetwork(network) {
  try {
    const provider = getProvider(network);
    const positionalMarketData = new ethers.Contract(
      positionalMarketDataContract.addresses[network],
      positionalMarketDataContract.abi,
      provider,
    );

    let numberOfContractCalls = 1;

    console.log(`${NETWORK_NAME[network]}: Getting all available assets...`);
    const assetsBytes32 = await positionalMarketData.getAvailableAssets();

    const assets = uniq(assetsBytes32)
      .map((data) => parseBytes32String(data))
      .sort((a, b) => getCurrencyPriority(a) - getCurrencyPriority(b));

    const marketsMap = {};
    numberOfContractCalls += assets.length;

    console.log(`${NETWORK_NAME[network]}: Getting all available maturity dates...`);
    const maturityDatesPromises = [];
    for (let i = 0; i < assets.length; i++) {
      maturityDatesPromises.push(positionalMarketData.getMaturityDates(formatBytes32String(assets[i])));
    }
    const maturityDatesPromisesResult = await Promise.all(maturityDatesPromises);

    for (let i = 0; i < assets.length; i++) {
      const maturityDates = maturityDatesPromisesResult[i];

      const today = new Date();
      const tomorrow = Math.round(new Date(new Date().setDate(today.getDate() + 1)).getTime() / 1000);
      const filteredMaturityDates = uniq(
        maturityDates.map((date) => Number(date)).filter((date) => date > 0 && date > tomorrow),
      ).sort((a, b) => a - b);

      const maturityDatesMap = {};
      numberOfContractCalls += 5 * filteredMaturityDates.length;

      console.log(`${NETWORK_NAME[network]}: Getting all markets info for ${assets[i]}...`);
      const marketsAddressesPromises = [];
      const rangedMarketsPromises = [];
      for (let j = 0; j < filteredMaturityDates.length; j++) {
        marketsAddressesPromises.push(
          positionalMarketData.getMarketsForAssetAndStrikeDate(
            formatBytes32String(assets[i]),
            filteredMaturityDates[j],
          ),
        );
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
      for (let j = 0; j < filteredMaturityDates.length; j++) {
        const marketsAddresses = marketsAddressesPromisesResult[j];
        const filteredMarketsAddresses = marketsAddresses.filter((value) => value !== ZERO_ADDRESS);
        const rangedMarketsAddresses = rangedMarketsPromisesResult[j].map((market) => market.address);

        marketsInfoUpPromises.push(
          positionalMarketData.getActiveMarketsInfoPerPosition(filteredMarketsAddresses, POSITION_TYPE.Up),
        );
        marketsInfoDownPromises.push(
          positionalMarketData.getActiveMarketsInfoPerPosition(filteredMarketsAddresses, POSITION_TYPE.Down),
        );
        marketsInfoInPromises.push(
          positionalMarketData.getRangedActiveMarketsInfoPerPosition(rangedMarketsAddresses, RANGED_POSITION_TYPE.In),
        );
        marketsInfoOutPromises.push(
          positionalMarketData.getRangedActiveMarketsInfoPerPosition(rangedMarketsAddresses, RANGED_POSITION_TYPE.Out),
        );
      }

      const marketsInfoUpPromisesResult = await Promise.all(marketsInfoUpPromises);
      const marketsInfoDownPromisesResult = await Promise.all(marketsInfoDownPromises);
      const marketsInfoInPromisesResult = await Promise.all(marketsInfoInPromises);
      const marketsInfoOutPromisesResult = await Promise.all(marketsInfoOutPromises);

      for (let j = 0; j < filteredMaturityDates.length; j++) {
        const marketsInfoUp = marketsInfoUpPromisesResult[j];
        const marketsInfoDown = marketsInfoDownPromisesResult[j];
        const marketsInfoIn = marketsInfoInPromisesResult[j];
        const marketsInfoOut = marketsInfoOutPromisesResult[j];

        const maturityDate = new Date(filteredMaturityDates[j] * 1000).toISOString();
        maturityDatesMap[maturityDate] = {
          [POSITION_NAME.Up]: mapMarketsInfo(marketsInfoUp, POSITION_TYPE.Up, false, assets[i], network),
          [POSITION_NAME.Down]: mapMarketsInfo(marketsInfoDown, POSITION_TYPE.Down, false, assets[i], network),
          [RANGED_POSITION_NAME.In]: mapMarketsInfo(marketsInfoIn, RANGED_POSITION_TYPE.In, true, assets[i], network),
          [RANGED_POSITION_NAME.Out]: mapMarketsInfo(
            marketsInfoOut,
            RANGED_POSITION_TYPE.Out,
            true,
            assets[i],
            network,
          ),
        };
      }

      marketsMap[assets[i]] = maturityDatesMap;
    }

    console.log(`${NETWORK_NAME[network]}: Number of contract calls is ${numberOfContractCalls}.`);

    redisClient.set(KEYS.THALES_MARKETS[network], JSON.stringify(marketsMap), function () {});
  } catch (e) {
    console.log("Error: could not process markets.", e);
  }
}

module.exports = {
  processMarkets,
  processMarketsPerNetwork,
};
