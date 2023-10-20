const quotes = require("./source/quotes");

require("dotenv").config();

// markets.processMarkets();
quotes.getAmmQuote(10, "0xFe1047D903927c5710970336C41b83a3B81365e9", 1, 900, "DAI", false, true);
