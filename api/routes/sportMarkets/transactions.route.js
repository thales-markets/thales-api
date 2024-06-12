const express = require("express");
const {
  positionBalance,
  parlays,
  transactions,
  claimTransactions,
} = require("../../controllers/sportMarkets/transactions.controller");

const router = express.Router();

router.get("/:networkId", transactions);
router.get("/position-balance/:networkId", positionBalance);
router.get("/parlays/:networkId", parlays);
router.get("/claim/:networkId", claimTransactions);
router.get("/ranged-position-balance/:networkId", rangePositionBalance);

module.exports = router;
