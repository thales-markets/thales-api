require("dotenv").config();

const thalesData = require("thales-data");
const {
  packMarket,
  isMarketExpired,
  getPositionTransactionStatus,
  packParlay,
  getPositionStatus,
  getCanceledGameClaimableAmount,
} = require("../utils/markets");
const { POSITION_NAME_TYPE_MAP } = require("../constants/markets");
const { bigNumberFormatter } = require("../utils/formatters");

async function processUserSinglePositions(network, walletAddress) {
  const positionBalances = await thalesData.sportMarkets.positionBalances({
    account: walletAddress,
    network: network,
  });

  const mappedPositions = positionBalances.map((positionBalance) => {
    const market = packMarket(positionBalance.position.market);
    const mappedPosition = {
      account: positionBalance.account,
      payout: bigNumberFormatter(positionBalance.amount),
      claimablePayout: 0,
      paid: positionBalance.sUSDPaid,
      position: POSITION_NAME_TYPE_MAP[positionBalance.position.side],
      isOpen: market.isOpen,
      isClaimable:
        positionBalance.position.claimable && !isMarketExpired(market.maturityDate) && !positionBalance.claimed,
      isClaimed: positionBalance.claimed,
      isCanceled: market.isCanceled,
    };

    return {
      ...mappedPosition,
      status: getPositionStatus(mappedPosition),
      market,
    };
  });

  const data = {
    open: [],
    claimable: [],
    closed: [],
  };
  mappedPositions.forEach((position) => {
    if (position.isOpen) {
      data.open.push(position);
    } else if (position.isClaimable) {
      position.claimableAmount = position.isCanceled ? getCanceledGameClaimableAmount(position) : position.amount;
      data.claimable.push(position);
    } else {
      data.closed.push(position);
    }
  });
  return data;
}

async function processUserParlayPositions(network, walletAddress) {
  const parlayMarkets = await thalesData.sportMarkets.parlayMarkets({
    account: walletAddress,
    network,
  });

  const mappedParlayMarkets = parlayMarkets.map((parlayMarket) => packParlay(parlayMarket));

  const data = {
    open: [],
    claimable: [],
    closed: [],
  };

  mappedParlayMarkets.forEach((parlayMarket) => {
    if (parlayMarket.isOpen) {
      data.open.push(parlayMarket);
    } else if (parlayMarket.isClaimable) {
      data.claimable.push(parlayMarket);
    } else {
      data.closed.push(parlayMarket);
    }
  });

  return data;
}

async function processUserSingleTransactions(network, walletAddress) {
  const userSingleTransactions = await thalesData.sportMarkets.marketTransactions({
    account: walletAddress,
    network: network,
  });

  const mappedUserSingleTransactions = userSingleTransactions.map((transaction) => {
    const mappedTransaction = {
      ...transaction,
      market: packMarket(transaction.wholeMarket),
    };

    return {
      hash: mappedTransaction.hash,
      timestamp: mappedTransaction.timestamp,
      account: mappedTransaction.account,
      amount: mappedTransaction.amount,
      paid: mappedTransaction.paid,
      position: mappedTransaction.position,
      status: getPositionTransactionStatus(mappedTransaction),
      market: mappedTransaction.market,
    };
  });

  return mappedUserSingleTransactions;
}

async function processUserParlayTransactions(network, walletAddress) {
  const parlayMarkets = await thalesData.sportMarkets.parlayMarkets({
    account: walletAddress,
    network,
  });

  const mappedParlayMarkets = parlayMarkets.map((parlayMarket) => packParlay(parlayMarket));

  return mappedParlayMarkets;
}

module.exports = {
  processUserSinglePositions,
  processUserParlayPositions,
  processUserSingleTransactions,
  processUserParlayTransactions,
};
