require("dotenv").config();

const thalesData = require("thales-data");
const {
  bigNumberFormatter,
  packMarket,
  isMarketExpired,
  isParlayOpen,
  isParlayClaimable,
  formatMarketOdds,
  getPositionStatus,
} = require("../utils/markets");
const { PARLAY_MAXIMUM_QUOTE, ODDS_TYPE, POSITION_NAME_TYPE_MAP } = require("../constants/markets");

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

  const mappedParlayMarkets = parlayMarkets.map((parlayMarket) => {
    let totalQuote = parlayMarket.totalQuote;
    let totalAmount = parlayMarket.totalAmount;

    let realQuote = 1;
    parlayMarket.marketQuotes.map((quote) => {
      realQuote = realQuote * quote;
    });

    const mappedPositions = [];

    parlayMarket.sportMarketsFromContract.forEach((address, index) => {
      const market = parlayMarket.sportMarkets.find((market) => market.address === address);

      if (market && market.isCanceled) {
        realQuote = realQuote / parlayMarket.marketQuotes[index];
        const maximumQuote = PARLAY_MAXIMUM_QUOTE;
        totalQuote = realQuote < maximumQuote ? maximumQuote : realQuote;
        totalAmount = totalAmount * parlayMarket.marketQuotes[index];
      }

      const position = parlayMarket.positions.find((position) => position.market.address == address);

      const quote = market.isCanceled ? 1 : parlayMarket.marketQuotes[index];
      const mappedPosition = {
        id: position.id,
        position: POSITION_NAME_TYPE_MAP[position.side],
        isOpen: market.isOpen,
        isClaimable: position.claimable,
        isCanceled: market.isCanceled,
        quote: {
          american: formatMarketOdds(quote, ODDS_TYPE.American),
          decimal: formatMarketOdds(quote, ODDS_TYPE.Decimal),
          normalizedImplied: formatMarketOdds(quote, ODDS_TYPE.AMM),
        },
        market: packMarket(market),
      };

      mappedPositions.push(mappedPosition);
    });

    const mappedPositionsParlayMarket = {
      ...parlayMarket,
      payout: totalAmount,
      totalQuote: totalQuote,
      lastGameStarts: new Date(parlayMarket.lastGameStarts),
      positions: mappedPositions,
    };

    return {
      id: mappedPositionsParlayMarket.id,
      account: mappedPositionsParlayMarket.account,
      payout: mappedPositionsParlayMarket.payout,
      sUSDPaid: mappedPositionsParlayMarket.sUSDPaid,
      sUSDAfterFees: mappedPositionsParlayMarket.sUSDAfterFees,
      totalQuote: {
        american: formatMarketOdds(mappedPositionsParlayMarket.totalQuote, ODDS_TYPE.American),
        decimal: formatMarketOdds(mappedPositionsParlayMarket.totalQuote, ODDS_TYPE.Decimal),
        normalizedImplied: formatMarketOdds(mappedPositionsParlayMarket.totalQuote, ODDS_TYPE.AMM),
      },
      lastGameStarts: mappedPositionsParlayMarket.lastGameStarts,
      isOpen: isParlayOpen(mappedPositionsParlayMarket),
      isClaimable: isParlayClaimable(mappedPositionsParlayMarket),
      isClaimed: mappedPositionsParlayMarket.claimed,
      positions: mappedPositionsParlayMarket.positions,
    };
  });

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

module.exports = {
  processUserSinglePositions,
  processUserParlayPositions,
  processUserSingleTransactions,
};
