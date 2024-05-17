const express = require("express");
const { stakers, claimOnBehalfItems } = require("../controllers/stakers.controller");

const router = express.Router();

router.get("/:networkParam", stakers);
router.get("/claim-on-behalf/:networkId", claimOnBehalfItems);

module.exports = router;
