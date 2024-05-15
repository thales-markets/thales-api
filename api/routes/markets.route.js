const express = require("express");
const { markets, trades } = require("../controllers/markets.controller");

const router = express.Router();

router.get("/list/:networkId", markets);
router.get("/trades/:networkId", trades);

module.exports = router;
