require("dotenv").config();

const thalesData = require("thales-data");
const { bigNumberFormatter, packMarket, isMarketExpired, getPositionStatus, packParlay } = require("../utils/markets");
const { POSITION_NAME_TYPE_MAP } = require("../constants/markets");

async function processUserSinglePositions(network, walletAddress) {
  const positionBalances = await thalesData.sportMarkets.positionBalances({
    account: walletAddress,
    network: network,
  });

  const onlyNonZeroPositionBalances = positionBalances.filter((positionBalance) => positionBalance.amount > 0);

  const mappedPositions = onlyNonZeroPositionBalances.map((positionBalance) => {
    return {
      account: positionBalance.account,
      amount: bigNumberFormatter(positionBalance.amount),
      claimableAmount: 0,
      // sUSDPaid: positionBalance.sUSDPaid,
      position: POSITION_NAME_TYPE_MAP[positionBalance.position.side],
      isOpen: positionBalance.position.market.isOpen,
      isClaimable: positionBalance.position.claimable,
      isCanceled: positionBalance.position.market.isCanceled,
      market: packMarket(positionBalance.position.market),
    };
  });

  const data = {
    open: [],
    claimable: [],
  };
  mappedPositions.forEach((position) => {
    if (position.isOpen) {
      data.open.push(position);
    } else if (position.isClaimable && !isMarketExpired(position.market.maturityDate)) {
      position.claimableAmount = position.isCanceled ? getCanceledGameClaimableAmount(position) : position.amount;
      data.claimable.push(position);
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
  };

  mappedParlayMarkets.forEach((parlayMarket) => {
    if (parlayMarket.isOpen) {
      data.open.push(parlayMarket);
    } else if (parlayMarket.isClaimable) {
      data.claimable.push(parlayMarket);
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
      status: getPositionStatus(mappedTransaction),
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
