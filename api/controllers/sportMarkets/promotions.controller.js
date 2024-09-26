const axios = require('axios');
const cache = require("../../services/cache");

const getPromotions = async (req, res) => {
  const branchName = req.query["branch-name"] || "main";
  const resetCache = req.query["reset-cache"] == "true";
  const cacheKey = `promotions_${branchName}`;
  const promotionsUrl = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/${branchName}/src/assets/promotions/index.json`;

  if (resetCache) {
    cache.del(cacheKey);
  }

  const promotionsData = cache.get(cacheKey);

  if (!promotionsData) {
    try {
      const response = await axios.get(promotionsUrl);
      cache.set(cacheKey, response.data);
      res.send(response.data);
    } catch (error) {
      console.log('Error fetching promotions data', error);
      return res.status(500).send("Error fetching promotions data");
    }
  }

  res.send(promotionsData);
};

module.exports = {
    getPromotions,
}