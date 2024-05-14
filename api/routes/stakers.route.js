const express = require("express");
const { stakers } = require("../controllers/stakers.controller");

const router = express.Router();

router.get("/:networkParam", stakers);

module.exports = router;
