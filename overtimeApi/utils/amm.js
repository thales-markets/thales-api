const getSportsAMMQuoteMethod = (sportsAMMContract, marketAddress, position, parsedAmount, collateralAddress) => {
  return collateralAddress
    ? sportsAMMContract.buyFromAmmQuoteWithDifferentCollateral(marketAddress, position, parsedAmount, collateralAddress)
    : sportsAMMContract.buyFromAmmQuote(marketAddress, position, parsedAmount);
};

const getParlayMarketsAMMQuoteMethod = (parlayMarketsAMMContract, markets, positions, usdPaid, collateralAddress) => {
  return collateralAddress
    ? parlayMarketsAMMContract.buyQuoteFromParlayWithDifferentCollateral(markets, positions, usdPaid, collateralAddress)
    : parlayMarketsAMMContract.buyQuoteFromParlay(markets, positions, usdPaid);
};

module.exports = {
  getSportsAMMQuoteMethod,
  getParlayMarketsAMMQuoteMethod,
};
