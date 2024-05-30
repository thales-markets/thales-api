const express = require("express");
const router = express.Router();

const lpRoutes = require("./digitalOptions/lp.route");
const marketsRoutes = require("./digitalOptions/markets.route");
const tradesRoutes = require("./digitalOptions/trades.route");
const referralRoutes = require("./digitalOptions/referral.route");
const vaultRoutes = require("./digitalOptions/vaults.route");

router.use("/liquidity-providing", lpRoutes);
router.use("/markets", marketsRoutes);
router.use("/trades", tradesRoutes);
router.use("/referral", referralRoutes);
router.use("/vaults", vaultRoutes);

module.exports = router;
