const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");

const optionTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const market = getQueryProperty(req, "market");
    const account = getQueryProperty(req, "account");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.DigitalOptions.OptionTransactions, [networkId, market, account]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.optionTransactions({
      max: 5000,
      network: networkId,
      market: market ? market : undefined,
      account: account ? account : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.DigitalOptions.OptionTransactions, [networkId, market, account]),
      transactions,
      TTL.OPTION_TRANSACTIONS,
    );

    if (!transactions) return res.sendStatus(204);

    return res.send(transactions);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const trades = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const makerToken = getQueryProperty(req, "maker-token");
    const takerToken = getQueryProperty(req, "taker-token");

    const maker = getQueryProperty(req, "maker");
    const taker = getQueryProperty(req, "taker");

    if (!networkId && (!makerToken || !takerToken || !maker || !taker)) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.DigitalOptions.Trades, [networkId, takerToken, makerToken, taker, maker]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const trades = await thalesData.binaryOptions.trades({
      network: networkId,
      makerToken: makerToken ? makerToken : undefined,
      takerToken: takerToken ? takerToken : undefined,
      maker: maker ? maker : undefined,
      taker: taker ? taker : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.DigitalOptions.Trades, [networkId, takerToken, makerToken, taker, maker]),
      trades,
      TTL.MARKETS,
    );

    if (!trades) return res.sendStatus(204);

    return res.send(trades);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const positionBalance = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const account = getQueryProperty(req, "account");

    if (!networkId && !account) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.DigitalOptions.PositionBalance, [networkId, account]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const positionBalances = await thalesData.binaryOptions.positionBalances({
      network: networkId,
      account: account ? account : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.DigitalOptions.PositionBalance, [networkId, account]),
      positionBalances,
      TTL.POSITION_BALANCE,
    );

    if (!positionBalances) return res.sendStatus(204);

    return res.send(positionBalances);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const rangePositionBalance = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const account = getQueryProperty(req, "account");

    if (!networkId && !account) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.DigitalOptions.RangePositionBalance, [networkId, account]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const positionBalances = await thalesData.binaryOptions.rangedPositionBalances({
      network: networkId,
      account: account ? account : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.DigitalOptions.RangePositionBalance, [networkId, account]),
      positionBalances,
      TTL.POSITION_BALANCE,
    );

    if (!positionBalances) return res.sendStatus(204);

    return res.send(positionBalances);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  optionTransactions,
  trades,
  positionBalance,
  rangePositionBalance,
};
