const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../constants/cacheKeys");
const cache = require("../services/cache");
const TTL = require("../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../utils/getters");

const referralTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const trader = getQueryProperty(req, "trader");
    const referrer = getQueryProperty(req, "referrer");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.ReferralTransactions, [networkId, trader, referrer]));

    if (cachedResponse) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.referralTransfers({
      network: networkId,
      trader: trader ? trader : undefined,
      referrer: referrer ? referrer : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.ReferralTransactions, [networkId, trader, referrer]), transactions, TTL.REFERRAL);

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

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.ReferredTraders, [networkId, referrer]));

    if (cachedResponse) return res.send(cachedResponse);

    const traders = await thalesData.binaryOptions.referredTraders({
      network: networkId,
      referrer: referrer ? referrer : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.ReferredTraders, [networkId, referrer]), traders, TTL.REFERRAL);

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

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.Referrers, [networkId, address]));

    if (cachedResponse) return res.send(cachedResponse);

    const referrers = await thalesData.binaryOptions.referrers({
      network: networkId,
      address: address ? address : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.Referrers, [networkId, address]), referrers, TTL.REFERRAL);

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
