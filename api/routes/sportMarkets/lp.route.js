const express = require("express");
const { lpPnl, lpTransactions } = require("../../controllers/sportMarkets/lp.controller");

const router = express.Router();

router.get("/pnl/:networkId", lpPnl);
router.get("/transactions/:networkId", lpTransactions);

module.exports = router;
