const express = require("express");
var cors = require("cors");
const { flushSpecificCacheKey, cacheStats } = require("../controllers/cache.controller");

const router = express.Router();

router.get("/stats", cacheStats);

router.post("/", flushSpecificCacheKey);
// router.post("/", cors({ origin: ["https://thalesmarkets.io"] }), flushSpecificCacheKey);

module.exports = router;
