const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");

const referralTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const trader = getQueryProperty(req, "trader");
    const referrer = getQueryProperty(req, "referrer");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.SportsMarkets.ReferralTransactions, [networkId, trader, referrer]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const transactions = await thalesData.sportMarkets.referralTransactions({
      network: networkId,
      trader: trader ? trader : undefined,
      referrer: referrer ? referrer : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.SportsMarkets.ReferralTransactions, [networkId, trader, referrer]),
      transactions,
      TTL.REFERRAL,
    );

    if (!transactions) return res.sendStatus(204);

    return res.send(transactions);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const referredTraders = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const referrer = getQueryProperty(req, "referrer");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.SportsMarkets.ReferredTraders, [networkId, referrer]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const traders = await thalesData.sportMarkets.referredTraders({
      network: networkId,
      referrer: referrer ? referrer : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.SportsMarkets.ReferredTraders, [networkId, referrer]), traders, TTL.REFERRAL);

    if (!traders) return res.sendStatus(204);

    return res.send(traders);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const referrers = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const address = getQueryProperty(req, "address");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.SportsMarkets.Referrers, [networkId, address]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const referrers = await thalesData.sportMarkets.referrers({
      network: networkId,
      address: address ? address : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.SportsMarkets.Referrers, [networkId, address]), referrers, TTL.REFERRAL);

    if (!referrers) return res.sendStatus(204);

    return res.send(referrers);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  referralTransactions,
  referredTraders,
  referrers,
};
