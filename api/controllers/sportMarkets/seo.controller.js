const axios = require("axios");
const cache = require("../../services/cache");

const getSEOArticles = async (req, res) => {
  const branchName = req.query["branch-name"] || "main";
  const resetCache = req.query["reset-cache"] == "true";
  const cacheKey = `seo_articles_${branchName}`;
  const seoArticlesUrl = `https://raw.githubusercontent.com/thales-markets/thales-sport-markets/${branchName}/src/assets/seo/index.json`;

  if (resetCache) {
    cache.del(cacheKey);
  }

  const seoArticlesData = cache.get(cacheKey);

  if (!seoArticlesData) {
    try {
      const response = await axios.get(seoArticlesUrl);
      cache.set(cacheKey, response.data);
      res.send(response.data);
    } catch (error) {
      console.log("Error fetching seo articles data", error);
      return res.status(500).send("Error fetching seo articles data");
    }
  }

  res.send(seoArticlesData);
};

module.exports = {
  getSEOArticles,
};
