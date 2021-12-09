require("dotenv").config();
const redis = require("redis");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { getPhaseAndEndDate, delay } = require("./services/utils");

const mainnetOptionsMap = new Map();
const optimismOptionsMap = new Map();

const SYNTH_USD_ETH_MAINNET = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
const SYNTH_USD_OP_MAINNET = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";

const ONEINCH_URL_ETH_MAINNET = "https://limit-orders.1inch.io/v1.0/1/limit-order/";
const ONEINCH_URL_OP_MAINNET = "https://limit-orders.1inch.io/v1.0/10/limit-order/";

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("process orders on mainnet");
        await processOrders(1);
      } catch (error) {
        console.log("orders on mainnet error: ", error);
      }

      try {
        console.log("process orders on optimism");
        await processOrders(10);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(20 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const markets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network,
  });

  for (const market of markets) {
    if ("trading" == getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase) {
      try {
        const baseUrl = network === 1 ? ONEINCH_URL_ETH_MAINNET : ONEINCH_URL_OP_MAINNET;
        const token = network === 1 ? SYNTH_USD_ETH_MAINNET : SYNTH_USD_OP_MAINNET;
        const responses = await Promise.all([
          fetch(baseUrl + `all?limit=500&takerAsset=` + market.longAddress + `&makerAsset=` + token),
          fetch(baseUrl + `all?limit=500&takerAsset=` + market.shortAddress + `&makerAsset=` + token),
          fetch(baseUrl + `all?limit=500&takerAsset=` + token + `&makerAsset=` + market.longAddress),
          fetch(baseUrl + `all?limit=500&takerAsset=` + token + `&makerAsset=` + market.shortAddress),
        ]);

        const responseLongBuy = await responses[0].json();
        const totalLongBuy = responseLongBuy.length;

        const responseShortBuy = await responses[1].json();
        const totalShortBuy = responseShortBuy.length;

        const responseLongSell = await responses[2].json();
        const totalLongSell = responseLongSell.length;

        const responseShortSell = await responses[3].json();
        const totalShortSell = responseShortSell.length;

        const ordersCount = totalLongBuy + totalShortBuy + totalLongSell + totalShortSell;

        network === 1
          ? mainnetOptionsMap.set(market.address, ordersCount)
          : optimismOptionsMap.set(market.address, ordersCount);
        if (process.env.REDIS_URL) {
          redisClient.set(
            network === 1 ? KEYS.MAINNET_ORDERS : KEYS.OPTIMISM_ORDERS,
            JSON.stringify([...(network === 1 ? mainnetOptionsMap : optimismOptionsMap)]),
            function () {},
          );
        }
      } catch (e) {
        console.log("fail");
        network === 1 ? mainnetOptionsMap.set(market.address, 0) : optimismOptionsMap.set(market.address, 0);

        if (process.env.REDIS_URL) {
          redisClient.set(
            network === 1 ? KEYS.MAINNET_ORDERS : KEYS.OPTIMISM_ORDERS,
            JSON.stringify([...(network === 1 ? mainnetOptionsMap : optimismOptionsMap)]),
            function () {},
          );
        }
      }
    }
  }
}
