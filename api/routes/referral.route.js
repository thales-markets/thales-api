const express = require("express");
const { referralTransactions, referredTraders, referrers } = require("../controllers/referral.controller");

const router = express.Router();

router.get("/transactions/:networkId", referralTransactions);
router.get("/traders/:networkId", referredTraders);
router.get("/referrers/:networkId", referrers);

module.exports = router;
