const express = require("express");
const router = express.Router();

const lpRoutes = require("./sportMarkets/lp.route");
const referralRoutes = require("./sportMarkets/referral.route");
const transactionsRoutes = require("./sportMarkets/transactions.route");
const vaultRoutes = require("./sportMarkets/vaults.route");

router.use("/liquidity-providing", lpRoutes);
router.use("/referral", referralRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/vaults", vaultRoutes);

module.exports = router;
