const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../../constants/cacheKeys");
const cache = require("../../services/cache");
const TTL = require("../../constants/ttl");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../../utils/getters");
const { maxTime, minTime } = require("date-fns");

const transactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const market = getQueryProperty(req, "market");
    const parentMarket = getQueryProperty(req, "parent-market");
    const account = getQueryProperty(req, "account");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, market, parentMarket, account]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const transactions = await thalesData.sportMarkets.marketTransactions({
      network: networkId,
      market: market ? market : undefined,
      parentMarket: parentMarket ? parentMarket : undefined,
      account: account ? account : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.SportsMarkets.Transactions, [networkId, market, parentMarket, account]),
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

const positionBalance = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const account = getQueryProperty(req, "account");
    const filter = getQueryProperty(req, "filter");

    const filters = filter ? filter.split(",") : [];

    const filterIsClaimable = filters.find((item) => item.trim().toLowerCase() == "claimable");
    const filterIsClaimed = filters.find((item) => item.trim().toLowerCase() == "claimed");

    if (!networkId && !account) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.SportsMarkets.PositionBalance, [networkId, account]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const positionBalances = await thalesData.sportMarkets.positionBalances({
      network: networkId,
      account: account ? account : undefined,
      isClaimable: filterIsClaimable ? true : false,
      isClaimed: filterIsClaimed ? true : false,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.SportsMarkets.PositionBalance, [networkId, account]),
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

const parlays = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const account = getQueryProperty(req, "account");
    const maxTimestamp = getQueryProperty(req, "max-timestamp");
    const minTimestamp = getQueryProperty(req, "min-timestamp");
    const sportMarketsAddressesProperty = getQueryProperty(req, "sport-markets-addresses");

    const sportMarketsAddresses =
      sportMarketsAddressesProperty && sportMarketsAddressesProperty.split(",").map((item) => item.trim());

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.SportsMarkets.Parlay, [networkId, account]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const response = await thalesData.sportMarkets.parlayMarkets({
      network: networkId,
      account: account ? account : undefined,
      maxTimestamp: maxTimestamp ? maxTimestamp : undefined,
      minTImestamp: minTimestamp ? minTimestamp : undefined,
      sportMarketsAddresses: sportMarketsAddresses ? sportMarketsAddresses : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.SportsMarkets.Parlay, [networkId, account]), response, TTL.POSITION_BALANCE);

    if (!response) return res.sendStatus(204);

    return res.send(response);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const claimTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const market = getQueryProperty(req, "market");
    const parentMarket = getQueryProperty(req, "parent-market");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(
      getCacheKey(PREFIX_KEYS.SportsMarkets.ClaimTxs, [networkId, market, parentMarket]),
    );

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const response = await thalesData.sportMarkets.positionBalances({
      network: networkId,
      parentMarket: parentMarket ? parentMarket : undefined,
      market: market ? market : undefined,
    });

    cache.set(
      getCacheKey(PREFIX_KEYS.SportsMarkets.ClaimTxs, [networkId, market, parentMarket]),
      response,
      TTL.POSITION_BALANCE,
    );

    if (!response) return res.sendStatus(204);

    return res.send(response);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  transactions,
  trades,
  positionBalance,
  parlays,
  claimTransactions,
};