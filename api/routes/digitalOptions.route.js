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
router.use("/v1/referral", referralRoutes);
router.use("/v1/vaults", vaultRoutes);

module.exports = router;
