const express = require("express");
const router = express.Router();

const lpRoutes = require("./sportMarkets/lp.route");
const referralRoutes = require("./sportMarkets/referral.route");
const transactionsRoutes = require("./sportMarkets/transactions.route");
const vaultRoutes = require("./sportMarkets/vaults.route");
const marketsRoutes = require("./sportMarkets/markets.route");
const voucherRoutes = require("./sportMarkets/vouchers.route");
const usersRoutes = require("./sportMarkets/users.route");

router.use("/liquidity-providing", lpRoutes);
router.use("/referral", referralRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/vaults", vaultRoutes);
router.use("/markets", marketsRoutes);
router.use("/vouchers", voucherRoutes);
router.use("/users", usersRoutes);

module.exports = router;
