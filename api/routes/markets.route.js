const express = require("express");
const { markets, rangedMarkets } = require("../controllers/markets.controller");

const router = express.Router();

router.get("/list/:networkId", markets);
router.get("/ranged/:networkId", rangedMarkets);

module.exports = router;