const getSportsAMMQuoteMethod = (sportsAMMContract, marketAddress, position, parsedAmount, collateralAddress) => {
  return collateralAddress
    ? sportsAMMContract.buyFromAmmQuoteWithDifferentCollateral(marketAddress, position, parsedAmount, collateralAddress)
    : sportsAMMContract.buyFromAmmQuote(marketAddress, position, parsedAmount);
};

module.exports = {
  getSportsAMMQuoteMethod,
};
