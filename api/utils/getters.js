const getCacheKey = (prefixKey, keys) => {
  if (!Array.isArray(keys)) return;

  keys.unshift(prefixKey);

  return keys.map((item) => item?.toLowerCase()).join("-");
};

module.exports = {
  getCacheKey,
};
