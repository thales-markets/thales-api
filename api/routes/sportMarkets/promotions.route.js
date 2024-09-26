const express = require("express");
const { getPromotions } = require("../../controllers/sportMarkets/promotions.controller");

const router = express.Router();

router.get("/list", getPromotions);

module.exports = router;
