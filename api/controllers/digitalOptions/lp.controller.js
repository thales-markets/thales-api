const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");

const lpPnl = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");
    const liquidityPool = getQueryProperty(req, "liquidityPool");

    if (!networkId) return res.sendStatus(400);

    const cachedLpPnls = cache.get(getCacheKey(PREFIX_KEYS.DigitalOptions.LiquidityPoolPnl, [networkId]));

    if (cachedLpPnls !== undefined) return res.send(cachedLpPnls);

    const lpPnls = await thalesData.binaryOptions.liquidityPoolPnls({
      network: networkId,
      liquidityPool: liquidityPool ? liquidityPool : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.DigitalOptions.LiquidityPoolPnl, [networkId, liquidityPool]), lpPnls, TTL.LP_PNL);

    if (!lpPnls) return res.sendStatus(204);

    return res.send(lpPnls);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const lpTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");
    const liquidityPool = getQueryProperty(req, "liquidityPool");
    const account = getQueryProperty(req, "account");
    const round = getQueryProperty(req, "round");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.DigitalOptions.LiquidityPoolTransactions, [networkId, account, round]),
    );
    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.liquidityPoolUserTransactions({
      network: networkId,
      liquidityPool: liquidityPool ? liquidityPool : undefined,
      account: account ? account : undefined,
      round: round ? round : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.DigitalOptions.LiquidityPoolTransactions, [networkId, liquidityPool, account, round]),
      transactions,
      TTL.LP_TRANSACTIONS,
    );

    if (!transactions) return res.sendStatus(204);

    return res.send(transactions);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  lpPnl,
  lpTransactions,
};
