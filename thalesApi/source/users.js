require("dotenv").config();

const thalesData = require("thales-data");
const { RANGED_POSITION_NAME } = require("../constants/markets");
const { keyBy } = require("lodash");
const { packTrade } = require("../utils/markets");

const MARKET_DURATION_IN_DAYS = 90;
const TODAY = new Date();
const MIN_MATURITY = Math.round(
  new Date(new Date().setDate(TODAY.getDate() - MARKET_DURATION_IN_DAYS)).getTime() / 1000,
); // show history for 90 days in the past

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
  processUserTransactions,
};
