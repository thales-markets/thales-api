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
};
