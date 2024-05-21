const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../constants/cacheKeys");
const cache = require("../services/cache");
const TTL = require("../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../utils/getters");

const lpPnl = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    if (!networkId) return res.status(400);

    const cachedLpPnls = cache.get(getCacheKey(PREFIX_KEYS.LiquidityPoolPnl, [networkId]));

    if (cachedLpPnls) return res.send(cachedLpPnls);

    const lpPnls = await thalesData.binaryOptions.liquidityPoolPnls({
      network: networkId,
    });

    cache.set(getCacheKey(PREFIX_KEYS.LiquidityPoolPnl, [networkId]), lpPnls, TTL.LP);

    if (!lpPnls) return res.status(204);

    return res.status(200).send(lpPnls);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const lpTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const account = getQueryProperty(req, "account");

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.LiquidityPoolTransactions, [networkId, account]));
    if (cachedResponse) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.liquidityPoolUserTransactions({
      network: networkId,
      account: account ? account : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.LiquidityPoolTransactions, [networkId, account]), transactions, TTL.LP);

    if (!transactions) return res.status(204);

    return res.status(200).send(transactions);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  lpPnl,
  lpTransactions,
};
