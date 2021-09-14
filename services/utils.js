const balanceAbi = require("../abi/balance");

function getStableToken(network) {
  const SYNTH_USD_MAINNET = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
  const SYNTH_USD_ROPSTEN = "0x21718c0fbd10900565fa57c76e1862cd3f6a4d8e";
  return network === 1 ? SYNTH_USD_MAINNET : SYNTH_USD_ROPSTEN;
}

function getTradeSizeInSUSD(trade, network) {
  return trade.makerToken === getStableToken(network)
    ? trade.makerAmount
    : trade.takerAmount;
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

function calculateInvestment(trade, market, network, currentInvestment, token) {
  if (isMarketInMaturity(market)) {
    if (token === getStableToken(network)) {
      return currentInvestment + getTradeSizeInSUSD(trade, network);
    } else {
      return currentInvestment;
    }
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
  return (
    "maturity" ==
    getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase
  );
}

module.exports = {
  getStableToken,
  getTradeSizeInSUSD,
  calculateNetProfit,
  calculateInvestment,
  getPhaseAndEndDate,
  getBalance,
  isMarketInMaturity,
};
