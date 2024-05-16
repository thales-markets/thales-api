const express = require("express");
const { optionTransactions, trades, positionBalance } = require("../controllers/trades.controller");

const router = express.Router();

router.get("/:networkId", trades);
router.get("/option-transactions/:networkId", optionTransactions);
router.get("/position-balance/:networkId", positionBalance);

module.exports = router;
