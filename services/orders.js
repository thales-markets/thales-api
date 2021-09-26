const KEYS = require("../redis/redis-keys");

const SYNTH_USD_MAINNET = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
const SYNTH_USD_ROPSTEN = "0x21718c0fbd10900565fa57c76e1862cd3f6a4d8e";

const Ox_URL_MAINNET = "https://api.0x.org/sra/v4/";
const Ox_URL_ROPSTEN = "https://ropsten.api.0x.org/sra/v4/";

const { getPhaseAndEndDate } = require("../services/utils");

async function processOrders(markets, network) {
  for (const market of markets) {
    if (
      "trading" ==
      getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
    ) {
      try {
        const baseUrl = network === 1 ? Ox_URL_MAINNET : Ox_URL_ROPSTEN;
        const token = network === 1 ? SYNTH_USD_MAINNET : SYNTH_USD_ROPSTEN;
        const responses = await Promise.all([
          fetch(
            baseUrl +
              `orderbook?baseToken=` +
              market.longAddress +
              "&quoteToken=" +
              token
          ),
          fetch(
            baseUrl +
              `orderbook?baseToken=` +
              market.shortAddress +
              "&quoteToken=" +
              token
          ),
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
            JSON.stringify([
              ...(network === 1 ? mainnetOptionsMap : ropstenOptionsMap),
            ]),
            function () {}
          );
        }
      } catch (e) {
        console.log("fail");
        network === 1
          ? mainnetOptionsMap.set(market.address, 0)
          : ropstenOptionsMap.set(market.address, 0);

        if (process.env.REDIS_URL) {
          redisClient.set(
            network === 1 ? KEYS.MAINNET_ORDERS : KEYS.ROPSTEN_ORDERS,
            JSON.stringify([
              ...(network === 1 ? mainnetOptionsMap : ropstenOptionsMap),
            ]),
            function () {}
          );
        }
      }
    }
  }
}

module.exports = processOrders;
