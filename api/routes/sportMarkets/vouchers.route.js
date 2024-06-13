const express = require("express");
const { vouchers } = require("../../controllers/sportMarkets/vouchers.controller");

const router = express.Router();

router.get("/:networkId", vouchers);

module.exports = router;
