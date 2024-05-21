const cache = require("../services/cache");

const flushSpecificCacheKey = (req, res) => {
  try {
    const reqBody = req.body;

    if (!Array.isArray(reqBody.hasOwnProperty("cacheKeys") && reqBody.cacheKeys)) return res.status(400);

    const keys = cache.del(reqBody.cacheKeys);

    return res.status(200).send({
      status: "ok",
      keys,
    });
  } catch (e) {
    console.log("Error ", e);
    return res.status(500);
  }
};

module.exports = {
  flushSpecificCacheKey,
};
