const balanceAbi = require("../abi/balance");

function getStableToken(network) {
  const SYNTH_USD_MAINNET = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
  const SYNTH_USD_ROPSTEN = "0x21718c0fbd10900565fa57c76e1862cd3f6a4d8e";
  return network === 1 ? SYNTH_USD_MAINNET : SYNTH_USD_ROPSTEN;
}

function getTradeSizeInSUSD(trade, network) {
  return trade.makerToken === getStableToken(network) ? trade.makerAmount : trade.takerAmount;
}

function getAmountOfTokens(trade, network) {
  return trade.makerToken === getStableToken(network) ? trade.takerAmount : trade.makerAmount;
}

function getPricePerToken(trade, network) {
  return trade.makerToken === getStableToken(network)
    ? trade.makerAmount / trade.takerAmount
    : trade.takerAmount / trade.makerAmount;
}

function getTradeType(trade, network) {
  return trade.takerToken === getStableToken(network) ? "buy" : "sell";
}

function getSidePerTrade(trade, market, network) {
  if (trade.makerToken === getStableToken(network)) {
    return trade.takerToken === market.longAddress ? "long" : "short";
  } else {
    return trade.makerToken === market.longAddress ? "long" : "short";
  }
}

function calculateNetProfit(trade, market, network, currentProfit, token) {
  if (isMarketInMaturity(market)) {
    if (token === getStableToken(network)) {
      return currentProfit - getTradeSizeInSUSD(trade, network);
    } else {
      return currentProfit + getTradeSizeInSUSD(trade, network);
    }
  }
  return currentProfit;
}

function calculateInvestment(trade, network, currentInvestment, token) {
  if (token === getStableToken(network)) {
    return currentInvestment + getTradeSizeInSUSD(trade, network);
  }

  return currentInvestment;
}

function getPhaseAndEndDate(maturityDate, expiryDate) {
  const now = Date.now();

  if (maturityDate > now) {
    return {
      phase: "trading",
      timeRemaining: maturityDate,
    };
  }

  if (expiryDate > now) {
    return {
      phase: "maturity",
      timeRemaining: expiryDate,
    };
  }

  return {
    phase: "expiry",
    timeRemaining: expiryDate,
  };
}

async function getBalance(marketAddress, walletAddress) {
  const contract = new Web3Client.eth.Contract(balanceAbi, marketAddress);
  try {
    const result = await contract.methods.balancesOf(walletAddress).call();
    return result;
  } catch (e) {
    console.log(e);
  }
}

function isMarketInMaturity(market) {
  return "maturity" == getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase;
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function addMonthsToUTCDate(date, months) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ),
  );
}

function fixDuplicatedTeamName(name) {
  if (!name || name === null || !name.length) return "";
  const middle = Math.floor(name.length / 2);
  const firstHalf = name.substring(0, middle).trim();
  const secondHalf = name.substring(middle, name.length).trim();

  if (firstHalf === secondHalf) {
    return firstHalf;
  }

  const splittedName = name.split(" ");
  const uniqueWordsInName = new Set(splittedName);
  if (uniqueWordsInName.size !== splittedName.length) {
    return Array.from(uniqueWordsInName).join(" ");
  }

  return name;
}

function convertPositionNameToPosition(positionName) {
  if (positionName && positionName !== null && positionName.toUpperCase() == "HOME") return 0;
  if (positionName && positionName !== null && positionName.toUpperCase() == "AWAY") return 1;
  if (positionName && positionName !== null && positionName.toUpperCase() == "DRAW") return 2;
  return 1;
}

function convertFinalResultToResultType(result) {
  if (result == 1) return 0;
  if (result == 2) return 1;
  if (result == 3) return 2;
  return -1;
}

function sortByTotalQuote(a, b) {
  let firstQuote = 1;
  a.marketQuotes.map((quote) => {
    firstQuote = firstQuote * quote;
  });

  let secondQuote = 1;
  b.marketQuotes.map((quote) => {
    secondQuote = secondQuote * quote;
  });
  return firstQuote - secondQuote;
}

module.exports = {
  getStableToken,
  getTradeSizeInSUSD,
  calculateNetProfit,
  calculateInvestment,
  getPhaseAndEndDate,
  getBalance,
  isMarketInMaturity,
  delay,
  getAmountOfTokens,
  getPricePerToken,
  getTradeType,
  getSidePerTrade,
  addMonthsToUTCDate,
  fixDuplicatedTeamName,
  convertPositionNameToPosition,
  convertFinalResultToResultType,
  sortByTotalQuote,
};
