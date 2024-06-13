const express = require("express");
const { userStats } = require("../../controllers/sportMarkets/users.controller");

const router = express.Router();

router.get("/stats/:networkId", userStats);

module.exports = router;
