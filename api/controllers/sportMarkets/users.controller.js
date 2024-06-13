const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");

const userStats = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const address = getQueryProperty(req, "address");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.SportsMarkets.UserStats, [networkId, address]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const userStatsData = await thalesData.sportMarkets.usersStats({
      network: networkId,
      address,
    });

    cache.set(getCacheKey(PREFIX_KEYS.SportsMarkets.UserStats, [networkId, address]), userStatsData, TTL.MARKETS);

    if (!userStatsData) return res.sendStatus(204);

    return res.send(userStatsData);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  userStats,
};
