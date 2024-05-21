const thalesData = require("thales-data");
const { PREFIX_KEYS } = require("../constants/cacheKeys");
const cache = require("../services/cache");
const TTL = require("../constants/ttl");
const { getCacheKey } = require("../utils/getters");

const userTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const vault = getQueryProperty(req, "vault");
    const account = getQueryProperty(req, "account");

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.VaultUserTransactions, [networkId, vault, account]));

    if (cachedResponse) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.vaultUserTransactions({
      network: networkId,
      vault: vault ? vault : undefined,
      account: account ? account : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.VaultUserTransactions, [networkId, vault, account]), transactions, TTL.VAULT);

    if (!transactions) return res.status(204);

    return res.status(200).send(transactions);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const vaultPnl = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const vault = getQueryProperty(req, "vault");

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.VaultPnl, [networkId, vault]));

    if (cachedResponse) return res.send(cachedResponse);

    const pnls = await thalesData.binaryOptions.vaultPnls({
      network: networkId,
      vault: vault ? vault : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.VaultPnl, [networkId, vault]), pnls, TTL.VAULT);

    if (!pnls) return res.status(204);

    return res.status(200).send(pnls);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const vaultTransactions = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const vault = getQueryProperty("vault");

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.VaultTransactions, [networkId, vault]));

    if (cachedResponse) return res.send(cachedResponse);

    const transactions = await thalesData.binaryOptions.vaultTransactions({
      network: networkId,
      vault: vault ? vault : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.VaultTransactions, [networkId, vault]), transactions, TTL.VAULT);

    if (!transactions) return res.status(204);

    return res.status(200).send(transactions);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  userTransactions,
  vaultPnl,
  vaultTransactions,
};
