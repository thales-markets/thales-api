const express = require("express");
const { lpPnl, lpTransactions } = require("../../controllers/digitalOptions/lp.controller");

const router = express.Router();

router.get("/pnl/:networkId", lpPnl);
router.get("/transactions/:networkId", lpTransactions);

module.exports = router;
