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

const getParlayMarketsAMMQuoteMethod = (
  parlayMarketsAMMContract,
  markets,
  positions,
  usdPaid,
  collateralAddress,
  isDefaultCollateral,
) => {
  return isDefaultCollateral
    ? parlayMarketsAMMContract.buyQuoteFromParlay(markets, positions, usdPaid)
    : parlayMarketsAMMContract.buyQuoteFromParlayWithDifferentCollateral(
        markets,
        positions,
        usdPaid,
        collateralAddress,
      );
};

module.exports = {
  getSportsAMMQuoteMethod,
  getParlayMarketsAMMQuoteMethod,
};
