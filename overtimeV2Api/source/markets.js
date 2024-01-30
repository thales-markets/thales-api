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
const KEYS = require("../../redis/redis-keys");

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
        try {
          console.log("process markets");
          await processAllMarkets();
        } catch (error) {
          console.log("markets error: ", error);
        }

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

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
      const formattedOdds = Number(odd) > 0 ? bigNumberFormatter(odd) : 0;
      return {
        american: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.American) : 0,
        decimal: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.Decimal) : 0,
        normalizedImplied: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.AMM) : 0,
      };
    }),
    proof: market.proof,
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

  return mappedMarkets;
};

function processAllMarkets() {
  console.log(`process open markets`);
  let mappedMarkets = mapMarkets();
  marketsMap.set("open", mappedMarkets);

  redisClient.set(KEYS.OVERTIME_V2_MARKETS, JSON.stringify([...marketsMap]), function () {});
}

module.exports = {
  processMarkets,
};
