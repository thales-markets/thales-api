const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");

const markets = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const minMaturity = getQueryProperty(req, "min-maturity");
    const maxMaturity = getQueryProperty(req, "max-maturity");

    const market = getQueryProperty(req, "market");
    const parentMarket = getQueryProperty(req, "parent-market");

    const includeMarkets = getQueryProperty(req, "include");
    const excludeMarkets = getQueryProperty(req, "exclude");

    const includeProperties = includeMarkets.split(",");
    const excludeProperties = excludeMarkets.split(",");

    const isOpen = includeProperties.find((item) => item == "open")
      ? true
      : excludeProperties.find((item) => item == "open")
      ? false
      : undefined;
    const isCanceled = includeProperties.find((item) => item == "canceled")
      ? true
      : excludeProperties.find((item) => item == "canceled")
      ? false
      : undefined;
    const isPaused = includeProperties.find((item) => item == "paused")
      ? true
      : excludeProperties.find((item) => item == "paused")
      ? false
      : undefined;

    if (!networkId) return res.sendStatus(400);
    if (!minMaturity) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.SportsMarkets.Markets, [networkId, market, parentMarket, minMaturity, maxMaturity]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const markets = await thalesData.sportMarkets.markets({
      max: Infinity,
      network: networkId,
      isOpen,
      isCanceled,
      isPaused,
      market,
      parentMarket,
      minMaturityDate: minMaturity ? minMaturity : undefined,
      maxMaturityDate: maxMaturity ? maxMaturity : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.SportsMarkets.Markets, [networkId, market, parentMarket, minMaturity, maxMaturity]),
      markets,
      TTL.MARKETS,
    );

    if (!markets) return res.sendStatus(204);

    return res.send(markets);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  markets,
};
