const getSportsAMMQuoteMethod = (
  sportsAMMContract,
  marketAddress,
  position,
  parsedAmount,
  collateralAddress,
  isDefaultCollateral,
) => {
  return isDefaultCollateral
    ? sportsAMMContract.buyFromAmmQuote(marketAddress, position, parsedAmount)
    : sportsAMMContract.buyFromAmmQuoteWithDifferentCollateral(
        marketAddress,
        position,
        parsedAmount,
        collateralAddress,
      );
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
