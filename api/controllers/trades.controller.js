const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../constants/cacheKeys");
const cache = require("../services/cache");
const TTL = require("../constants/ttl");
const { getCacheKey } = require("../utils/getters");

const optionTransactions = async (req, res) => {
  try {
    const networkId = req?.params?.networkId;

    const market = req?.query?.["market"];
    const account = req?.query?.["account"];

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.OptionTransactions, [networkId, market, account]));

    if (cachedResponse) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.optionTransactions({
      max: 5000,
      network: networkId,
      market: market ? market : undefined,
      account: account ? account : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.OptionTransactions, [networkId, market, account]),
      transactions,
      TTL.OPTION_TRANSACTIONS,
    );

    if (!transactions) return res.status(204);

    return res.status(200).send(transactions);
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

const positionBalance = async (req, res) => {
  try {
    const networkId = req?.params?.networkId;

    const account = req?.query?.["account"];

    if (!networkId && !account) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.PositionBalance, [networkId, account]));

    if (cachedResponse) return res.send(cachedResponse);

    const positionBalances = await thalesData.binaryOptions.positionBalances({
      network: networkId,
      account: account ? account : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.PositionBalance, [networkId, account]), positionBalances, TTL.POSITION_BALANCE);

    if (!positionBalances) return res.status(204);

    return res.status(200).send(positionBalances);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const rangePositionBalance = async (req, res) => {
  try {
    const networkId = req?.params?.networkId;

    const account = req?.query?.["account"];

    if (!networkId && !account) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.RangePositionBalance, [networkId, account]));

    if (cachedResponse) return res.send(cachedResponse);

    const positionBalances = await thalesData.binaryOptions.rangedPositionBalances({
      network: networkId,
      account: account ? account : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.RangePositionBalance, [networkId, account]),
      positionBalances,
      TTL.POSITION_BALANCE,
    );

    if (!positionBalances) return res.status(204);

    return res.status(200).send(positionBalances);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  optionTransactions,
  trades,
  positionBalance,
  rangePositionBalance,
};
