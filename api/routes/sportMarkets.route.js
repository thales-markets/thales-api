const express = require("express");
const router = express.Router();

const lpRoutes = require("./sportMarkets/lp.route");
const referralRoutes = require("./sportMarkets/referral.route");

router.use("/liquidity-providing", lpRoutes);
router.use("/referral", referralRoutes);

module.exports = router;
