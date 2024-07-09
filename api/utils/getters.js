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
  if (!Object.prototype.hasOwnProperty.call(req, "query")) return;
  if (!Object.prototype.hasOwnProperty.call(req.query, propertyName) || !req.query[propertyName]) return;
  return req.query[propertyName];
};

const getQueryParam = (req, queryParamName) => {
  if (!Object.prototype.hasOwnProperty.call(req, "params")) return;
  if (!Object.prototype.hasOwnProperty.call(req.params, queryParamName) || !req.params[queryParamName]) return;
  return req.params[queryParamName];
};

module.exports = {
  getCacheKey,
  getQueryProperty,
  getQueryParam,
};
