require("dotenv").config();

const redis = require("redis");
const { ethers } = require("ethers");
const { uniq } = require("lodash");

const positionalMarketDataContract = require("../contracts/positionalMarketDataContract");
const { getProvider } = require("../utils/provider");
const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { delay } = require("../utils/general");
const { parseBytes32String, formatBytes32String } = require("ethers/lib/utils");
const { ZERO_ADDRESS } = require("../constants/markets");
const { bigNumberFormatter } = require("../utils/formatters");
const { getDefaultDecimalsForNetwork } = require("../utils/collaterals");
const KEYS = require("../../redis/redis-keys");
const { getCurrencyPriority, convertPriceImpactToBonus, calculatRoi } = require("../utils/markets");

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
          console.log("process markets on base");
          await processMarketsPerNetwork(NETWORK.Base);
        } catch (error) {
          console.log("markets on base error: ", error);
        }

        await delay(10 * 1000);

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

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

const mapMarketsInfo = (marketsInfo, asset, network) => {
  const filteredMarketsInfo = marketsInfo.filter((marketInfo) => Number(marketInfo.liquidity) !== 0);

  const mappedMarketsInfo = filteredMarketsInfo.map((market) => {
    const discount = bigNumberFormatter(market.priceImpact);

    const price = bigNumberFormatter(market.price, getDefaultDecimalsForNetwork(network));
    const priceWithoutDiscount = (1 - discount) * price;

    const roi = calculatRoi(price);
    const roiWithoutDiscount = calculatRoi(priceWithoutDiscount);

    return {
      address: market.market,
      asset: asset,
      strikePrice: bigNumberFormatter(market.strikePrice),
      price: price,
      bonus: convertPriceImpactToBonus(discount),
      roi: {
        baseRoi: discount < 0 ? roiWithoutDiscount : roi,
        bonusRoi: discount < 0 ? roi - roiWithoutDiscount : 0,
        totalRoi: roi,
      },
      liquidity: bigNumberFormatter(market.liquidity),
      skewImpact: discount,
    };
  });

  return mappedMarketsInfo;
};

async function processMarketsPerNetwork(network) {
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
  for (let i = 0; i < assets.length; i++) {
    console.log(`${NETWORK_NAME[network]}: Getting all available maturity dates for ${assets[i]}...`);
    const maturityDates = await positionalMarketData.getMaturityDates(formatBytes32String(assets[i]));

    const today = new Date();
    const tomorrow = Math.round(new Date(new Date().setDate(today.getDate() + 1)).getTime() / 1000);
    const filteredMaturityDates = uniq(
      maturityDates.map((date) => Number(date)).filter((date) => date > 0 && date > tomorrow),
    ).sort((a, b) => a - b);

    const maturityDatesMap = {};
    numberOfContractCalls += 3 * filteredMaturityDates.length;
    console.log(`${NETWORK_NAME[network]}: Getting all markets info for ${assets[i]}...`);
    for (let j = 0; j < filteredMaturityDates.length; j++) {
      const marketsAddresses = await positionalMarketData.getMarketsForAssetAndStrikeDate(
        formatBytes32String(assets[i]),
        filteredMaturityDates[j],
      );
      const filteredMarketsAddresses = marketsAddresses.filter((value) => value !== ZERO_ADDRESS);

      const marketsInfoUp = await positionalMarketData.getActiveMarketsInfoPerPosition(filteredMarketsAddresses, 0);
      const marketsInfoDown = await positionalMarketData.getActiveMarketsInfoPerPosition(filteredMarketsAddresses, 1);

      const maturityDate = new Date(filteredMaturityDates[j] * 1000).toISOString();
      maturityDatesMap[maturityDate] = {
        UP: mapMarketsInfo(marketsInfoUp, assets[i], network),
        DOWN: mapMarketsInfo(marketsInfoDown, assets[i], network),
      };
    }
    marketsMap[assets[i]] = maturityDatesMap;
  }

  console.log(`${NETWORK_NAME[network]}: Number of contract calls is ${numberOfContractCalls}.`);

  redisClient.set(KEYS.THALES_MARKETS[network], JSON.stringify(marketsMap), function () {});
}

module.exports = {
  processMarkets,
  processMarketsPerNetwork,
};
