const express = require("express");
const {
  userTransactions,
  vaultPnl,
  vaultTransactions,
  parlayVaultTransactions,
} = require("../../controllers/sportMarkets/vaults.controller");

const router = express.Router();

router.get("/user-transactions/:networkId", userTransactions);
router.get("/pnl/:networkId", vaultPnl);
router.get("/transactions/:networkId", vaultTransactions);
router.get("/parlay-transactions/:networkId", parlayVaultTransactions);

module.exports = router;
