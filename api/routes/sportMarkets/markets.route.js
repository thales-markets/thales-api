const express = require("express");
const { markets } = require("../../controllers/sportMarkets/markets.controller");

const router = express.Router();

router.get("/:networkId", markets);

module.exports = router;
