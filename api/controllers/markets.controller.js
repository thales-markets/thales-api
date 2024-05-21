const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../constants/cacheKeys");
const cache = require("../services/cache");
const TTL = require("../constants/ttl");
const { getCacheKey, getQueryProperty } = require("../utils/getters");
const { ethers } = require("ethers");

const markets = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const minMaturity = getQueryProperty(req, "min-maturity");
    const maxMaturity = getQueryProperty(req, "max-maturity");

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

const rangedMarkets = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const minMaturity = getQueryProperty(req, "min-maturity");
    const maxMaturity = getQueryProperty(req, "max-maturity");

    const currencyKey = getQueryProperty(req, "currency-key");
    const marketIds = getQueryProperty(req, "markets-ids");

    const marketsIdsArr = [];

    if (marketIds && marketIds.includes(",")) {
      marketsIdsArr.push(
        ...marketIds
          .split(",")
          .filter((item) => item)
          .map((item) => item.trim()),
      );
    }

    if (!networkId) return res.status(400);
    if (!minMaturity) return res.status(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.RangedMarkets, [
        networkId,
        minMaturity,
        maxMaturity,
        marketsIdsArr.length ? marketsIdsArr.join("-") : undefined,
        currencyKey,
      ]),
    );

    if (cachedResponse) return res.send(cachedResponse);

    const markets = await thalesData.binaryOptions.rangedMarkets({
      max: Infinity,
      network: networkId,
      minMaturity: minMaturity ? minMaturity : undefined,
      maxMaturity: maxMaturity ? maxMaturity : undefined,
      currencyKey: currencyKey ? ethers.utils.formatBytes32String(currencyKey) : undefined,
      marketIds: marketsIdsArr.length ? marketsIdsArr : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.RangedMarkets, [
        networkId,
        minMaturity,
        maxMaturity,
        marketsIdsArr.length ? marketsIdsArr.join("-") : undefined,
        currencyKey,
      ]),
      markets,
      TTL.MARKETS,
    );

    if (!markets) return res.status(204);

    return res.status(200).send(markets);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  markets,
  rangedMarkets,
};
