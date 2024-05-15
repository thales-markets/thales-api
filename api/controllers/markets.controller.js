const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../constants/cacheKeys");
const cache = require("../services/cache");
const TTL = require("../constants/ttl");
const { getCacheKey } = require("../utils/getters");

const markets = async (req, res) => {
  try {
    const networkId = req?.params?.networkId;

    const minMaturity = req?.query?.["min-maturity"];
    const maxMaturity = req?.query?.["max-maturity"];

    if (!networkId) return res.status(400);
    if (!minMaturity) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.Markets, [networkId, minMaturity, maxMaturity]));

    if (cachedResponse) return res.send(cachedResponse);

    const markets = await thalesData.binaryOptions.markets({
      max: Infinity,
      network: networkId,
      minMaturity: minMaturity ? minMaturity : undefined,
      maxMaturity: maxMaturity ? maxMaturity : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.Markets, [networkId, minMaturity, maxMaturity]), markets, TTL.MARKETS);

    if (!markets) return res.status(204);

    return res.status(200).send(markets);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const trades = async (req, res) => {
  try {
    const networkId = req?.params?.networkId;

    const makerToken = req?.query?.["maker-token"];
    const takerToken = req?.query?.["taker-token"];

    const maker = req?.query?.["maker"];
    const taker = req?.query?.["taker"];

    if (!networkId && (!makerToken || !takerToken || !maker || !taker)) return res.status(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.Trades, [networkId, takerToken, makerToken, taker, maker]),
    );

    if (cachedResponse) return res.send(cachedResponse);

    const trades = await thalesData.binaryOptions.trades({
      network: networkId,
      makerToken: makerToken ? makerToken : undefined,
      takerToken: takerToken ? takerToken : undefined,
      maker: maker ? maker : undefined,
      taker: taker ? taker : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.Trades, [networkId, takerToken, makerToken, taker, maker]), trades, TTL.MARKETS);

    if (!trades) return res.status(204);

    return res.status(200).send(trades);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  markets,
  trades,
};
