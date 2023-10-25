require("dotenv").config();

const thalesData = require("thales-data");
const {
  RANGED_POSITION_NAME,
  POSITION_BALANCE_THRESHOLD,
  MIN_MATURITY,
  MAX_MATURITY,
} = require("../constants/markets");
const { keyBy } = require("lodash");
const { packTrade, packPosition, isMarketExpired, isRangedPosition } = require("../utils/markets");
const { bigNumberParser, bigNumberFormatter } = require("../utils/formatters");
const { formatBytes32String } = require("ethers/lib/utils");

async function processUserPositions(network, walletAddress) {
  const [positionBalances, rangedPositionBalances, userMarketTransactions] = await Promise.all([
    thalesData.binaryOptions.positionBalances({
      max: Infinity,
      network,
      account: walletAddress.toLowerCase(),
    }),
    thalesData.binaryOptions.rangedPositionBalances({
      max: Infinity,
      network,
      account: walletAddress.toLowerCase(),
    }),
    thalesData.binaryOptions.optionTransactions({
      max: Infinity,
      network,
      account: walletAddress.toLowerCase(),
    }),
  ]);

  const filteredUserMarketTransactions = userMarketTransactions.filter((tx) => tx.type !== "mint" && tx.amount !== 0);

  const claimTransactionsMap = new Map();

  filteredUserMarketTransactions.map((tx) => {
    claimTransactionsMap.set(tx.market, tx);
  });
  const rangedMarketIds = filteredUserMarketTransactions.map((tx) => tx.market);

  const [markets, rangedMarkets] = await Promise.all([
    thalesData.binaryOptions.markets({
      max: Infinity,
      network,
      minMaturity: MIN_MATURITY,
      maxMaturity: MAX_MATURITY,
    }),
    rangedMarketIds.length > 0
      ? thalesData.binaryOptions.rangedMarkets({
          max: Infinity,
          network,
          marketIds: rangedMarketIds,
          minMaturity: MIN_MATURITY,
          maxMaturity: MAX_MATURITY,
        })
      : [],
  ]);
  const allMarkets = [...markets, ...rangedMarkets];

  const claimedPositions = allMarkets
    .filter((market) => claimTransactionsMap.has(market.address))
    .map((market) => {
      const claimTransaction = claimTransactionsMap.get(market.address);
      const isRangedMarket = isRangedPosition(claimTransaction.side);

      return {
        account: claimTransaction.account,
        amount: bigNumberParser(claimTransaction.amount),
        paid: 0,
        position: {
          side: claimTransaction.side,
          market: {
            id: market.address,
            currencyKey: formatBytes32String(market.currencyKey),
            maturityDate: market.maturityDate / 1000,
            expiryDate: market.expiryDate / 1000,
            strikePrice: isRangedMarket ? 0 : bigNumberParser(market.strikePrice),
            leftPrice: isRangedMarket ? bigNumberParser(market.leftPrice) : 0,
            rightPrice: isRangedMarket ? bigNumberParser(market.rightPrice) : 0,
            result: market.result,
            finalPrice: market.result !== null ? bigNumberParser(market.finalPrice) : null,
          },
        },
      };
    });

  const allPositions = [...positionBalances, ...rangedPositionBalances];

  claimedPositions.forEach((position) => {
    const pos = allPositions.find(
      (p) => p.position.market.id.toLowerCase() === position.position.market.id.toLowerCase(),
    );
    if (pos) {
      position.paid = pos.paid;
      position.isClaimed = true;
    }
  });

  const allWithClaimedPositions = [...allPositions, ...claimedPositions];

  const filteredPositions = allWithClaimedPositions.filter(
    (position) =>
      !isMarketExpired(Number(position.position.market.expiryDate) * 1000) &&
      bigNumberFormatter(position.amount) >= POSITION_BALANCE_THRESHOLD,
  );

  const sortedPositions = filteredPositions.sort(
    (a, b) => Number(b.position.market.maturityDate) - Number(a.position.market.maturityDate),
  );
  const mappedPositions = sortedPositions.map((position) => packPosition(position, network));

  const groupedPositions = {
    open: [],
    claimable: [],
    closed: [],
  };
  mappedPositions.forEach((position) => {
    if (position.isOpen) {
      groupedPositions.open.push(position);
    } else if (position.isClaimable) {
      groupedPositions.claimable.push(position);
    } else {
      groupedPositions.closed.push(position);
    }
  });

  return groupedPositions;
}

async function processUserTransactions(network, walletAddress) {
  const trades = await thalesData.binaryOptions.trades({
    taker: walletAddress,
    network,
  });

  const rangedTradesMarketIds = trades
    .filter(
      (trade) =>
        trade.optionSide === RANGED_POSITION_NAME.In.toLowerCase() ||
        trade.optionSide === RANGED_POSITION_NAME.Out.toLowerCase(),
    )
    .map((trade) => trade.market);

  const [markets, rangedMarkets] = await Promise.all([
    thalesData.binaryOptions.markets({
      max: Infinity,
      network,
      minMaturity: MIN_MATURITY,
    }),
    rangedTradesMarketIds.length > 0
      ? thalesData.binaryOptions.rangedMarkets({
          max: Infinity,
          network,
          marketIds: rangedTradesMarketIds,
          minMaturity: MIN_MATURITY,
        })
      : [],
  ]);

  const allMarkets = [...markets, ...rangedMarkets];

  const marketsMap = keyBy(allMarkets, "address");
  const tradesWithMarket = trades.map((trade) => ({
    ...trade,
    marketItem: marketsMap[trade.market],
  }));

  const filteredTrades = tradesWithMarket.filter((trade) => trade.marketItem);

  const sortedTrades = filteredTrades.sort((a, b) => b.timestamp - a.timestamp);

  const mappedTades = sortedTrades.map((trade) => packTrade(trade));

  return mappedTades;
}

module.exports = {
  processUserPositions,
  processUserTransactions,
};
