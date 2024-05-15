const getCacheKey = (prefixKey, keys) => {
  if (!Array.isArray(keys)) return;

  keys.unshift(prefixKey);

  return keys
    .filter((item) => item)
    .map((item) => item?.toLowerCase())
    .join("-");
};

module.exports = {
  getCacheKey,
};
