const express = require("express");
const {
  optionTransactions,
  trades,
  positionBalance,
  rangePositionBalance,
} = require("../../controllers/digitalOptions/trades.controller");

const router = express.Router();

router.get("/:networkId", trades);
router.get("/option-transactions/:networkId", optionTransactions);
router.get("/position-balance/:networkId", positionBalance);
router.get("/ranged-position-balance/:networkId", rangePositionBalance);

module.exports = router;
