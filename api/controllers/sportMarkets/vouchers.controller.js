const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");

const vouchers = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const address = getQueryProperty(req, "address");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.SportsMarkets.Vouchers, [networkId, address]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const vouchers = await thalesData.sportMarkets.overtimeVouchers({
      network: networkId,
      address,
    });

    cache.set(getCacheKey(PREFIX_KEYS.SportsMarkets.Vouchers, [networkId, address]), vouchers, TTL.MARKETS);

    if (!vouchers) return res.sendStatus(204);

    return res.send(vouchers);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  vouchers,
};
