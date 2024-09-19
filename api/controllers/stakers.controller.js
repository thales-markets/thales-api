const thalesData = require("thales-data");
const cache = require("../services/cache");
const { getCacheKey, getQueryProperty, getQueryParam } = require("../utils/getters");
const TTL = require("../constants/ttl");
const { PREFIX_KEYS } = require("../constants/cacheKeys");

const stakers = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    if (!networkId) return res.sendStatus(400);

    const cachedStakers = cache.get(getCacheKey(PREFIX_KEYS.Stakers, [networkId]));

    if (cachedStakers !== undefined) return res.send(cachedStakers);

    const stakersData = await thalesData.binaryOptions.stakers({
      network: networkId,
    });

    cache.set(getCacheKey(PREFIX_KEYS.Stakers, [networkId]), stakersData, TTL.STAKERS);

    if (!stakersData) return res.sendStatus(204);

    return res.send(stakersData);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const claimOnBehalfItems = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const sender = getQueryProperty(req, "seller");

    if (!networkId) return res.sendStatus(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.ClaimOnBehalfItems, [networkId, sender]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const canClaimOnBehalfItems = await thalesData.binaryOptions.canClaimOnBehalfItems({
      network: networkId,
      sender: sender ? sender : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.ClaimOnBehalfItems, [networkId, sender]), canClaimOnBehalfItems, TTL.STAKERS);

    if (!canClaimOnBehalfItems) return res.sendStatus(204);

    return res.send(canClaimOnBehalfItems);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const tokenTransaction = async (req, res) => {
  try {
    const networkId = getQueryParam(req, "networkId");

    const account = getQueryProperty(req, "account");
    const typeIn = getQueryProperty(req, "type_in");

    if (!networkId) return res.sendStatus(400);

    const splittedTypeIn = typeIn ? typeIn.split(",") : undefined;

    const typeInGraphFormat = splittedTypeIn && splittedTypeIn.length ? `[${splittedTypeIn.join(",")}]` : undefined;

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.TokenTransactions, [networkId, account, typeIn]));

    if (cachedResponse !== undefined) return res.send(cachedResponse);

    const tokenTransactions = await thalesData.binaryOptions.tokenTransactions({
      network: networkId,
      account: account ? account : undefined,
      type_in: typeInGraphFormat,
    });

    cache.set(getCacheKey(PREFIX_KEYS.TokenTransactions, [networkId, account, typeIn]), tokenTransactions, TTL.STAKERS);

    if (!tokenTransactions) return res.sendStatus(204);

    return res.send(tokenTransactions);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  stakers,
  claimOnBehalfItems,
  tokenTransaction,
};
