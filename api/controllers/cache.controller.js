const cache = require("../services/cache");

const cacheStats = (req, res) => {
  try {
    const cacheStats = cache.getStats();

    return res.send(cacheStats);
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

const flushSpecificCacheKey = (req, res) => {
  try {
    const reqBody = req.body;

    if (!Array.isArray(Object.prototype.hasOwnProperty.call(reqBody, "cacheKeys") && reqBody.cacheKeys))
      return res.sendStatus(400);

    const keys = cache.del(reqBody.cacheKeys);

    return res.send({
      status: "ok",
      keys,
      receivedKeysCount: reqBody.cacheKeys.length,
      receivedKeys: reqBody.cacheKeys,
    });
  } catch (e) {
    console.log("Error ", e);
    return res.sendStatus(500);
  }
};

module.exports = {
  flushSpecificCacheKey,
  cacheStats,
};
