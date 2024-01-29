require("dotenv").config();

const redis = require("redis");
const { NETWORK_NAME, NETWORK } = require("../../overtimeApi/constants/networks");
const { delay } = require("../../overtimeApi/utils/general");
const { bigNumberFormatter } = require("../../overtimeApi/utils/formatters");
const markets = require("./treeMarketsAndHashes.json");
const {
  fixDuplicatedTeamName,
  getLeagueNameById,
  getIsPlayerPropsMarket,
  getIsOneSideMarket,
  getIsOneSidePlayerPropsMarket,
  formatMarketOdds,
} = require("../../overtimeApi/utils/markets");
const { SPORTS_MAP, ENETPULSE_SPORTS } = require("../../overtimeApi/constants/tags");
const { MARKET_TYPE, ODDS_TYPE } = require("../../overtimeApi/constants/markets");

let marketsMap = new Map();

async function processMarkets() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        // try {
        //   console.log("process markets on optimism");
        //   await processMarketsPerNetwork(NETWORK.Optimism);
        // } catch (error) {
        //   console.log("markets on optimism error: ", error);
        // }

        // await delay(10 * 1000);

        // try {
        //   console.log("process markets on arbitrum");
        //   await processMarketsPerNetwork(NETWORK.Arbitrum);
        // } catch (error) {
        //   console.log("markets on arbitrum error: ", error);
        // }

        // await delay(10 * 1000);

        // try {
        //   console.log("process markets on base");
        //   await processMarketsPerNetwork(NETWORK.Base);
        // } catch (error) {
        //   console.log("markets on base error: ", error);
        // }

        // await delay(10 * 1000);

        try {
          console.log("process markets on op goerli");
          await processMarketsPerNetwork(NETWORK.OptimismGoerli);
        } catch (error) {
          console.log("markets on op goerli error: ", error);
        }

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

// const childrenOf = (parentMarket, groupedMarkets) => {
//   return (groupedMarkets[parentMarket] || []).map((market) => ({
//     ...market,
//     childMarkets: orderBy(childrenOf(market.address, groupedMarkets), ["betType"], ["asc"]),
//   }));
// };

// const groupMarkets = (allMarkets) => {
//   const groupedMarkets = groupBy(allMarkets, (market) => market.parentMarket);
//   return childrenOf("null", groupedMarkets);
// };

const packMarket = (market) => {
  const leagueId = market.sportId;
  const isEnetpulseSport = ENETPULSE_SPORTS.includes(leagueId);
  // const isPlayerPropsMarket = getIsPlayerPropsMarket(market.betType);
  // const isPlayerPropsMarket = market.childId === 10010;
  const isPlayerPropsMarket = getIsPlayerPropsMarket(market.playerPropsId);
  // const isOneSidePlayerPropsMarket = getIsOneSidePlayerPropsMarket(market.betType)
  const isOneSidePlayerPropsMarket = getIsOneSidePlayerPropsMarket(market.playerPropsId);
  const type = MARKET_TYPE[isPlayerPropsMarket ? market.playerPropsId : market.childId];

  return {
    // address: market.address,
    gameId: market.gameId,
    sport: SPORTS_MAP[leagueId],
    leagueId: leagueId,
    leagueName: getLeagueNameById(leagueId),
    type: type,
    // parentMarket: market.parentMarket,
    maturityDate: new Date(market.maturity * 1000),
    homeTeam: fixDuplicatedTeamName(market.homeTeam, isEnetpulseSport),
    awayTeam: fixDuplicatedTeamName(market.awayTeam, isEnetpulseSport),
    homeScore: market.homeScore,
    awayScore: market.awayScore,
    finalResult: market.finalResult,
    status: market.status,
    isResolved: market.status === 1,
    isOpen: market.status === 0,
    isCanceled: market.status === 2,
    isPaused: market.status === 3,
    isOneSideMarket: getIsOneSideMarket(leagueId),
    spread: Number(market.spread) / 100,
    total: Number(market.total) / 100,
    // doubleChanceMarketType: market.doubleChanceMarketType,
    isPlayerPropsMarket: isPlayerPropsMarket,
    isOneSidePlayerPropsMarket: isOneSidePlayerPropsMarket,
    playerProps: isPlayerPropsMarket
      ? {
          playerId: market.playerProps.playerId,
          playerName: market.playerProps.playerName,
          line: market.playerProps.line,
          type: type,
          outcome: market.playerProps.outcome,
          score: market.playerProps.score,
        }
      : null,
    odds: market.odds.map((odd) => {
      return {
        american: formatMarketOdds(bigNumberFormatter(odd), ODDS_TYPE.American),
        decimal: formatMarketOdds(bigNumberFormatter(odd), ODDS_TYPE.Decimal),
        normalizedImplied: formatMarketOdds(bigNumberFormatter(odd), ODDS_TYPE.AMM),
      };
    }),
    proof: market.proof,
    // {
    //   homeOdds: {
    //     american: formatMarketOdds(market.homeOdds, ODDS_TYPE.American),
    //     decimal: formatMarketOdds(market.homeOdds, ODDS_TYPE.Decimal),
    //     normalizedImplied: formatMarketOdds(market.homeOdds, ODDS_TYPE.AMM),
    //   },
    //   awayOdds: {
    //     american: formatMarketOdds(market.awayOdds, ODDS_TYPE.American),
    //     decimal: formatMarketOdds(market.awayOdds, ODDS_TYPE.Decimal),
    //     normalizedImplied: formatMarketOdds(market.awayOdds, ODDS_TYPE.AMM),
    //   },
    //   drawOdds: {
    //     american: formatMarketOdds(market.drawOdds, ODDS_TYPE.American),
    //     decimal: formatMarketOdds(market.drawOdds, ODDS_TYPE.Decimal),
    //     normalizedImplied: formatMarketOdds(market.drawOdds, ODDS_TYPE.AMM),
    //   },
    // },
    // priceImpact: {
    //   homePriceImpact: market.homePriceImpact,
    //   awayPriceImpact: market.awayPriceImpact,
    //   drawPriceImpact: market.drawPriceImpact,
    // },
    // liquidity: {
    //   homeLiquidity: {
    //     positions: market.homeLiquidity,
    //     usd: market.homeLiquidityUsd,
    //   },
    //   awayLiquidity: {
    //     positions: market.awayLiquidity,
    //     usd: market.awayLiquidityUsd,
    //   },
    //   drawLiquidity: {
    //     positions: market.drawLiquidity,
    //     usd: market.drawLiquidityUsd,
    //   },
    // },
    // bonus: {
    //   homeBonus: market.homeBonus,
    //   awayBonus: market.awayBonus,
    //   drawBonus: market.drawBonus,
    // },
  };
};

const mapMarkets = () => {
  const mappedMarkets = [];

  markets.forEach((market) => {
    let packedMarket = packMarket(market);
    packedMarket.childMarkets = [];
    market.childMarkets.forEach((childMarket) => {
      let packedChildMarket = packMarket(childMarket);
      packedMarket.childMarkets.push(packedChildMarket);
    });

    mappedMarkets.push(packedMarket);
  });

  // let packedMarkets = mappedMarkets.map((market) => packMarket(market));

  // let finalMarkets = groupMarkets(packedMarkets);

  // return finalMarkets;

  return mappedMarkets;
};

function processMarketsPerNetwork(network) {
  // thales-data takes timestamp argument in seconds
  // const minMaturityDate = Math.round(new Date(new Date().setDate(today.getDate() - 7)).getTime() / 1000); // show history for 7 days in the past
  // const todaysDate = Math.round(today.getTime() / 1000);

  console.log(`${NETWORK_NAME[network]}: process open markets`);
  // let markets = await thalesData.sportMarkets.markets({
  //   isOpen: true,
  //   isCanceled: false,
  //   isPaused: false,
  //   network,
  //   minMaturityDate: todaysDate,
  // });
  let mappedMarkets = mapMarkets();
  marketsMap.set("open", mappedMarkets);

  // console.log(`${NETWORK_NAME[network]}: process resolved markets`);
  // markets = await thalesData.sportMarkets.markets({
  //   isOpen: false,
  //   isCanceled: false,
  //   network,
  //   minMaturityDate,
  // });
  // mappedMarkets = await mapMarkets(markets, false, network);
  // marketsMap.set("resolved", mappedMarkets);

  // console.log(`${NETWORK_NAME[network]}: process canceled markets`);
  // markets = await thalesData.sportMarkets.markets({
  //   isOpen: false,
  //   isCanceled: true,
  //   network,
  //   minMaturityDate,
  // });
  // mappedMarkets = await mapMarkets(markets, false, network);
  // marketsMap.set("canceled", mappedMarkets);

  // console.log(`${NETWORK_NAME[network]}: process paused markets`);
  // markets = await await thalesData.sportMarkets.markets({
  //   isPaused: true,
  //   network,
  //   minMaturityDate,
  // });
  // mappedMarkets = await mapMarkets(markets, false, network);
  // marketsMap.set("paused", mappedMarkets);

  // console.log(`${NETWORK_NAME[network]}: process ongoing markets`);
  // markets = await thalesData.sportMarkets.markets({
  //   isOpen: true,
  //   isCanceled: false,
  //   minMaturityDate,
  //   maxMaturityDate: todaysDate,
  //   network,
  // });
  // mappedMarkets = await mapMarkets(markets, false, network);
  // marketsMap.set("ongoing", mappedMarkets);

  // console.log(marketsMap);

  console.log(marketsMap);

  // redisClient.set(KEYS.OVERTIME_MARKETS[network], JSON.stringify([...marketsMap]), function () {});
}

module.exports = {
  processMarkets,
  processMarketsPerNetwork,
};
