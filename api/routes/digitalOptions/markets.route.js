const express = require("express");
const { markets, rangedMarkets } = require("../../controllers/digitalOptions/markets.controller");

const router = express.Router();

router.get("/list/:networkId", markets);
router.post("/ranged/:networkId", rangedMarkets);

module.exports = router;
