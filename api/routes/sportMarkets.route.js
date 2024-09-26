const express = require("express");
const router = express.Router();

const lpRoutes = require("./sportMarkets/lp.route");
const referralRoutes = require("./sportMarkets/referral.route");
const promotionsRoutes = require("./sportMarkets/promotions.route");

router.use("/liquidity-providing", lpRoutes);
router.use("/referral", referralRoutes);
router.use("/promotions", promotionsRoutes);    

module.exports = router;
