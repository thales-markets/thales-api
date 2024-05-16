const express = require("express");
const { optionTransactions, trades } = require("../controllers/trades.controller");

const router = express.Router();

router.get("/:networkId", trades);
router.get("/option-transactions/:networkId", optionTransactions);

module.exports = router;
