const express = require("express");
const { stakers, claimOnBehalfItems, tokenTransaction } = require("../controllers/stakers.controller");

const router = express.Router();

router.get("/:networkId", stakers);
router.get("/claim-on-behalf/:networkId", claimOnBehalfItems);
router.get("/token-transactions/:networkId", tokenTransaction);

module.exports = router;
