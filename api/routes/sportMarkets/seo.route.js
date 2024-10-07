const express = require("express");
const { getSEOArticles } = require("../../controllers/sportMarkets/seo.controller");

const router = express.Router();

router.get("/list", getSEOArticles);

module.exports = router;
