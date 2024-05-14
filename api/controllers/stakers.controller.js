const thalesData = require("thales-data");
const cache = require("../services/cache");
const { getStakersKey } = require("../constants/cacheKeys");
const TTL = require("../constants/ttl");

const stakers = async (req, res) => {
  try {
    const networkId = req.params.networkParam;

    if (!networkId) return res.status(400);

    const cachedStakers = cache.get(getStakersKey(networkId));

    if (cachedStakers) return res.send(cachedStakers);

    const stakersData = await thalesData.binaryOptions.stakers({
      network: networkId,
    });

    cache.set(getStakersKey(networkId), stakersData, TTL.Stakers);

    if (!stakersData) return res.status(204);

    return res.status(200).send(stakersData);
  } catch (e) {
    console.log("Error ", e);
    return res.send(500);
  }
};

module.exports = {
  stakers,
};
