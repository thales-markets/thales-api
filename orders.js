require("dotenv").config();
const redis = require("redis");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { getPhaseAndEndDate, delay } = require("./services/utils");

const mainnetOptionsMap = new Map();
const ropstenOptionsMap = new Map();

const SYNTH_USD_MAINNET = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
const SYNTH_USD_ROPSTEN = "0x21718c0fbd10900565fa57c76e1862cd3f6a4d8e";

const Ox_URL_MAINNET = "https://api.0x.org/sra/v4/";
const Ox_URL_ROPSTEN = "https://ropsten.api.0x.org/sra/v4/";

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
        console.log("process orders on ropsten");
        await processOrders(3);
      } catch (error) {
        console.log("orders on ropsten error: ", error);
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
        const baseUrl = network === 1 ? Ox_URL_MAINNET : Ox_URL_ROPSTEN;
        const token = network === 1 ? SYNTH_USD_MAINNET : SYNTH_USD_ROPSTEN;
        const responses = await Promise.all([
          fetch(baseUrl + `orderbook?baseToken=` + market.longAddress + "&quoteToken=" + token),
          fetch(baseUrl + `orderbook?baseToken=` + market.shortAddress + "&quoteToken=" + token),
        ]);

        const responseLong = await responses[0].json();
        const totalLong = responseLong.bids.total + responseLong.asks.total;

        const responseShort = await responses[1].json();
        const totalShort = responseShort.bids.total + responseShort.asks.total;

        const ordersCount = totalLong + totalShort;

        network === 1
          ? mainnetOptionsMap.set(market.address, ordersCount)
          : ropstenOptionsMap.set(market.address, ordersCount);
        if (process.env.REDIS_URL) {
          redisClient.set(
            network === 1 ? KEYS.MAINNET_ORDERS : KEYS.ROPSTEN_ORDERS,
            JSON.stringify([...(network === 1 ? mainnetOptionsMap : ropstenOptionsMap)]),
            function () {},
          );
        }
      } catch (e) {
        console.log("fail");
        network === 1 ? mainnetOptionsMap.set(market.address, 0) : ropstenOptionsMap.set(market.address, 0);

        if (process.env.REDIS_URL) {
          redisClient.set(
            network === 1 ? KEYS.MAINNET_ORDERS : KEYS.ROPSTEN_ORDERS,
            JSON.stringify([...(network === 1 ? mainnetOptionsMap : ropstenOptionsMap)]),
            function () {},
          );
        }
      }
    }
  }
}
