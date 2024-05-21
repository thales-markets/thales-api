const express = require("express");
var cors = require("cors");
const { flushSpecificCacheKey } = require("../controllers/cache.controller");

const router = express.Router();

router.post("/", cors({ origin: ["https://thalesmarkets.io"] }), flushSpecificCacheKey);

module.exports = router;
