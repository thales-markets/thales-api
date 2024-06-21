const getCacheKey = (prefixKey, keys) => {
  if (!Array.isArray(keys)) return;

  keys.unshift(prefixKey);

  return keys
    .filter((item) => item)
    .map((item) => {
      if (typeof item == "number") return item.toString();
      return item && item.toLowerCase();
    })
    .join("-");
};

const getQueryProperty = (req, propertyName) => {
  if (!req.hasOwnProperty("query")) return;
  if (!req.query.hasOwnProperty(propertyName) || !req.query[propertyName]) return;
  return req.query[propertyName];
};

const getQueryParam = (req, queryParamName) => {
  if (!req.hasOwnProperty("params")) return;
  if (!req.params.hasOwnProperty(queryParamName) || !req.params[queryParamName]) return;
  return req.params[queryParamName];
};

module.exports = {
  getCacheKey,
  getQueryProperty,
  getQueryParam,
};
