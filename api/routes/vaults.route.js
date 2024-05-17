const express = require("express");
const { userTransactions, vaultPnl, vaultTransactions } = require("../controllers/vaults.controller");

const router = express.Router();

router.get("/user-transactions/:networkId", userTransactions);
router.get("/pnl/:networkId", vaultPnl);
router.get("/transactions/:networkId", vaultTransactions);

module.exports = router;
