const thalesData = require("thales-data");
const cache = require("../services/cache");
const { getCacheKey } = require("../utils/getters");
const TTL = require("../constants/ttl");
const { PREFIX_KEYS } = require("../constants/cacheKeys");

const stakers = async (req, res) => {
  try {
    const networkId = req.params.networkParam;

    if (!networkId) return res.status(400);

    const cachedStakers = cache.get(getCacheKey(PREFIX_KEYS.Stakers, [networkId]));

    if (cachedStakers) return res.send(cachedStakers);

    const stakersData = await thalesData.binaryOptions.stakers({
      network: networkId,
    });

    cache.set(getCacheKey(PREFIX_KEYS.Stakers, [networkId]), stakersData, TTL.Stakers);

    if (!stakersData) return res.status(204);

    return res.status(200).send(stakersData);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const claimOnBehalfItems = async (req, res) => {
  try {
    const networkId = req.params.networkParam;

    const sender = req?.query?.["sender"];

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.ClaimOnBehalfItems, [networkId, sender]));

    if (cachedResponse) return res.send(cachedResponse);

    const canClaimOnBehalfItems = await thalesData.binaryOptions.canClaimOnBehalfItems({
      network: networkId,
      sender: sender ? sender : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.ClaimOnBehalfItems, [networkId, sender]), canClaimOnBehalfItems, TTL.Stakers);

    if (!canClaimOnBehalfItems) return res.status(204);

    return res.status(200).send(canClaimOnBehalfItems);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

const tokenTransaction = async (req, res) => {
  try {
    const networkId = req.params.networkParam;

    const account = req?.query?.["account"];
    const typeIn = req?.query?.["type_in"];

    if (!networkId) return res.status(400);

    const cachedResponse = cache.get(getCacheKey(PREFIX_KEYS.TokenTransactions, [networkId, account, typeIn]));

    if (cachedResponse) return res.send(cachedResponse);

    const tokenTransactions = await thalesData.binaryOptions.tokenTransactions({
      network: networkId,
      account: account ? account : undefined,
      typeIn: typeIn ? typeIn : undefined,
    });

    cache.set(getCacheKey(PREFIX_KEYS.TokenTransactions, [networkId, account, typeIn]), tokenTransactions, TTL.Stakers);

    if (!tokenTransactions) return res.status(204);

    return res.status(200).send(tokenTransactions);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  stakers,
  claimOnBehalfItems,
};
