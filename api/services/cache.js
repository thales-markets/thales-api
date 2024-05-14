const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 5 * 60 });

module.exports = cache;
