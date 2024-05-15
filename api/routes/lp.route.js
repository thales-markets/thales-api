const express = require("express");
const { lpPnl, lpTransactions } = require("../controllers/lp.controller");

const router = express.Router();

router.get("/pnl/:networkParam", lpPnl);
router.get("/transactions", lpTransactions);

module.exports = router;
