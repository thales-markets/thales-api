require("dotenv").config();

const thalesData = require("thales-data");
const {
  bigNumberFormatter,
  packMarket,
  isMarketExpired,
  isParlayOpen,
  isParlayClaimable,
} = require("../utils/markets");
const { PARLAY_MAXIMUM_QUOTE } = require("../constants/markets");

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
      sUSDPaid: positionBalance.sUSDPaid,
      side: positionBalance.position.side,
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

      const mappedPosition = {
        id: position.id,
        side: position.side,
        isOpen: market.isOpen,
        isClaimable: position.claimable,
        isCanceled: market.isCanceled,
        quote: parlayMarket.marketQuotes[index],
        claimableQuote: market.isCanceled ? 1 : parlayMarket.marketQuotes[index],
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
      totalQuote: mappedPositionsParlayMarket.totalQuote,
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

module.exports = {
  processUserSinglePositions,
  processUserParlayPositions,
};
