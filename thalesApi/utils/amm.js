const getAmmQuoteAndPriceImpactMethods = (
  ammContract,
  marketAddress,
  position,
  parsedAmount,
  collateralAddress,
  isDefaultCollateral,
  isBuy,
) => {
  const promises = [];

  if (isDefaultCollateral) {
    promises.push(
      isBuy
        ? ammContract.buyFromAmmQuote(marketAddress, position, parsedAmount)
        : ammContract.sellToAmmQuote(marketAddress, position, parsedAmount),
    );
    promises.push(
      isBuy
        ? ammContract.buyPriceImpact(marketAddress, position, parsedAmount)
        : ammContract.getPriceImpact(marketAddress, position, parsedAmount),
    );
  } else {
    promises.push(
      ammContract.buyFromAmmQuoteWithDifferentCollateral(marketAddress, position, parsedAmount, collateralAddress),
    );
    promises.push(ammContract.buyPriceImpact(marketAddress, position, parsedAmount));
  }

  return promises;
};

const getRangedAmmQuoteAndPriceImpactMethods = (
  rangedAmmContract,
  marketAddress,
  position,
  parsedAmount,
  collateralAddress,
  isDefaultCollateral,
  isBuy,
) => {
  const promises = [];

  if (isDefaultCollateral) {
    promises.push(
      isBuy
        ? rangedAmmContract.buyFromAmmQuote(marketAddress, position, parsedAmount)
        : rangedAmmContract.sellToAmmQuote(marketAddress, position, parsedAmount),
    );
    promises.push(rangedAmmContract.getPriceImpact(marketAddress, position));
  } else {
    promises.push(
      rangedAmmContract.buyFromAmmQuoteWithDifferentCollateral(
        marketAddress,
        position,
        parsedAmount,
        collateralAddress,
      ),
    );
    promises.push(rangedAmmContract.getPriceImpact(marketAddress, position));
  }

  return promises;
};

module.exports = {
  getAmmQuoteAndPriceImpactMethods,
  getRangedAmmQuoteAndPriceImpactMethods,
};
