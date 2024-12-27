const { getAddedPayoutOdds } = require("./markets");

const generateSystemBetCombinations = (n, k) => {
  // require(k > 1 && k < n, 'k has to be greater than 1 and less than n');

  // Calculate the number of combinations: n! / (k! * (n-k)!)
  let combinationsCount = 1;
  for (let i = 0; i < k; i++) {
    combinationsCount = (combinationsCount * (n - i)) / (i + 1);
  }

  // Initialize combinations array
  const combinations = new Array(combinationsCount);

  // Generate combinations
  const indices = new Array(k);
  for (let i = 0; i < k; i++) {
    indices[i] = i;
  }

  let index = 0;

  while (true) {
    // Add the current combination
    const combination = new Array(k);
    for (let i = 0; i < k; i++) {
      combination[i] = indices[i];
    }
    combinations[index] = combination;
    index++;

    // Generate the next combination
    let done = true;
    for (let i = k; i > 0; i--) {
      if (indices[i - 1] < n - (k - (i - 1))) {
        indices[i - 1]++;
        for (let j = i; j < k; j++) {
          indices[j] = indices[j - 1] + 1;
        }
        done = false;
        break;
      }
    }

    if (done) {
      break;
    }
  }

  return combinations;
};

const getSystemBetData = (markets, systemBetDenominator, collateral, maxSupportedOdds) => {
  const systemCombinations = generateSystemBetCombinations(markets.length, systemBetDenominator);
  const numberOfCombinations = systemCombinations.length;
  let systemBetQuote = 0;
  let systemBetQuotePerCombination = 0;
  let systemBetMinimumQuote = 0;

  // Loop through each stored combination
  for (let i = 0; i < numberOfCombinations; i++) {
    const currentCombination = systemCombinations[i];

    let combinationQuote = 1;

    for (let j = 0; j < currentCombination.length; j++) {
      const marketIndex = currentCombination[j];
      const market = markets[marketIndex];
      let odds = market.odds[market.position];
      odds = odds > 0 ? getAddedPayoutOdds(collateral, odds) : odds;
      combinationQuote *= odds;
    }

    systemBetMinimumQuote = combinationQuote > systemBetMinimumQuote ? combinationQuote : systemBetMinimumQuote;
    systemBetQuotePerCombination += 1 / combinationQuote;
  }

  systemBetQuotePerCombination = 1 / systemBetQuotePerCombination;
  systemBetQuote = numberOfCombinations * systemBetQuotePerCombination;

  if (maxSupportedOdds) {
    systemBetQuote = systemBetQuote < maxSupportedOdds ? maxSupportedOdds : systemBetQuote;
    systemBetQuotePerCombination = systemBetQuote / numberOfCombinations;
    systemBetMinimumQuote =
      systemBetMinimumQuote < systemBetQuotePerCombination ? systemBetQuotePerCombination : systemBetMinimumQuote;
  }

  return { systemBetQuotePerCombination, systemBetQuote, systemBetMinimumQuote };
};

const getSystemBetPayoutData = (markets, systemBetDenominator, buyInAmount, totalQuote) => {
  const systemCombinations = generateSystemBetCombinations(markets.length, systemBetDenominator);
  const numberOfCombinations = systemCombinations.length;
  const buyinPerCombination = buyInAmount / numberOfCombinations;
  let systemBetPayout = 0;
  let systemBetMinimumQuote = 0;
  let areAllMarketsResolved = true;
  let numberOfWinningCombinations = 0;

  // Loop through each stored combination
  for (let i = 0; i < numberOfCombinations; i++) {
    const currentCombination = systemCombinations[i];

    let combinationQuote = 1;
    let originalCominationQuote = 1;

    for (let j = 0; j < currentCombination.length; j++) {
      const marketIndex = currentCombination[j];
      const market = markets[marketIndex];

      originalCominationQuote *= market.odd.normalizedImplied;

      if (!market.isResolved) {
        areAllMarketsResolved = false;
        continue;
      }
      if (market.isCancelled) {
        continue;
      }
      if (market.isWinning) {
        combinationQuote *= market.odd.normalizedImplied;
      } else {
        combinationQuote = 0;
      }
    }

    systemBetMinimumQuote =
      originalCominationQuote > systemBetMinimumQuote ? originalCominationQuote : systemBetMinimumQuote;
    if (combinationQuote > 0) {
      numberOfWinningCombinations++;
      systemBetPayout += buyinPerCombination / combinationQuote;
    }
  }

  const maxPayout = buyInAmount / totalQuote;
  const maxTotalQuotePerCombination = totalQuote / numberOfCombinations;

  systemBetPayout = systemBetPayout > maxPayout ? maxPayout : systemBetPayout;
  systemBetMinimumQuote =
    systemBetMinimumQuote < maxTotalQuotePerCombination ? maxTotalQuotePerCombination : systemBetMinimumQuote;

  return {
    systemBetPayout: areAllMarketsResolved ? systemBetPayout : 0,
    systemBetMinimumQuote,
    systemBetPayoutMinPayout: buyinPerCombination / systemBetMinimumQuote,
    numberOfCombinations,
    buyinPerCombination,
    numberOfWinningCombinations: areAllMarketsResolved ? numberOfWinningCombinations : 0,
  };
};

module.exports = { generateSystemBetCombinations, getSystemBetData, getSystemBetPayoutData };
