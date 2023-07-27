const { ethers } = require("ethers");
const {
  ODDS_TYPE,
  MARKET_TYPE,
  MARKET_DURATION_IN_DAYS,
  FINAL_RESULT_TYPE_POSITION_TYPE_MAP,
  POSITION_TYPE,
} = require("../constants/markets");
const overtimeSportsList = require("../assets/overtime-sports.json");
const { SPORTS_TAGS_MAP, GOLF_TOURNAMENT_WINNER_TAG, SPORTS_MAP, ENETPULSE_SPORTS } = require("../constants/tags");

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

const fixDuplicatedTeamName = (name, isEnetpulseSport) => {
  if (isEnetpulseSport) return name;
  if (!name || name === null || !name.length) return "";
  const middle = Math.floor(name.length / 2);
  const firstHalf = name.substring(0, middle).trim();
  const secondHalf = name.substring(middle, name.length).trim();

  if (firstHalf === secondHalf) {
    return firstHalf;
  }

  const splittedName = name.split(" ");
  const uniqueWordsInName = new Set(splittedName);
  if (uniqueWordsInName.size !== splittedName.length) {
    return Array.from(uniqueWordsInName).join(" ");
  }

  return name;
};

const bigNumberFormatter = (value, decimals) => Number(ethers.utils.formatUnits(value, decimals ? decimals : 18));

const convertPriceImpactToBonus = (priceImpact) => (priceImpact < 0 ? -((priceImpact / (1 + priceImpact)) * 100) : 0);

const formatMarketOdds = (odds, oddsType) => {
  if (!odds || odds === null) {
    return undefined;
  }
  switch (oddsType) {
    case ODDS_TYPE.Decimal:
      return 1 / odds;
    case ODDS_TYPE.American:
      const decimal = 1 / odds;
      if (decimal >= 2) {
        return (decimal - 1) * 100;
      } else {
        return -100 / (decimal - 1);
      }
    case ODDS_TYPE.AMM:
    default:
      return odds;
  }
};

const getLeagueNameById = (id) => {
  const league = overtimeSportsList.find((sport) => sport.id === id);
  return league ? league.name : undefined;
};

const getIsOneSideMarket = (tag) =>
  SPORTS_TAGS_MAP["Motosport"].includes(Number(tag)) || Number(tag) == GOLF_TOURNAMENT_WINNER_TAG;

const packMarket = (market) => {
  const leagueId = Number(market.tags[0]);
  const isEnetpulseSport = ENETPULSE_SPORTS.includes(leagueId);

  return {
    address: market.address,
    gameId: market.gameId,
    sport: SPORTS_MAP[market.tags[0]],
    leagueId: leagueId,
    leagueName: getLeagueNameById(leagueId),
    type: MARKET_TYPE[market.betType],
    parentMarket: market.parentMarket,
    maturityDate: new Date(market.maturityDate),
    homeTeam: fixDuplicatedTeamName(market.homeTeam, isEnetpulseSport),
    awayTeam: fixDuplicatedTeamName(market.awayTeam, isEnetpulseSport),
    homeScore: market.homeScore,
    awayScore: market.awayScore,
    finalResult: market.finalResult,
    isResolved: market.isResolved,
    isOpen: market.isOpen,
    isCanceled: market.isCanceled,
    isPaused: market.isPaused,
    isOneSideMarket: getIsOneSideMarket(leagueId),
    spread: Number(market.spread) / 100,
    total: Number(market.total) / 100,
    doubleChanceMarketType: market.doubleChanceMarketType,
    odds: {
      homeOdds: {
        american: formatMarketOdds(market.homeOdds, ODDS_TYPE.American),
        decimal: formatMarketOdds(market.homeOdds, ODDS_TYPE.Decimal),
        normalizedImplied: formatMarketOdds(market.homeOdds, ODDS_TYPE.AMM),
      },
      awayOdds: {
        american: formatMarketOdds(market.awayOdds, ODDS_TYPE.American),
        decimal: formatMarketOdds(market.awayOdds, ODDS_TYPE.Decimal),
        normalizedImplied: formatMarketOdds(market.awayOdds, ODDS_TYPE.AMM),
      },
      drawOdds: {
        american: formatMarketOdds(market.drawOdds, ODDS_TYPE.American),
        decimal: formatMarketOdds(market.drawOdds, ODDS_TYPE.Decimal),
        normalizedImplied: formatMarketOdds(market.drawOdds, ODDS_TYPE.AMM),
      },
    },
    priceImpact: {
      homePriceImpact: market.homePriceImpact,
      awayPriceImpact: market.awayPriceImpact,
      drawPriceImpact: market.drawPriceImpact,
    },
    bonus: {
      homeBonus: market.homeBonus,
      awayBonus: market.awayBonus,
      drawBonus: market.drawBonus,
    },
  };
};

const addDaysToEnteredTimestamp = (numberOfDays, timestamp) => {
  return new Date().setTime(new Date(timestamp).getTime() + numberOfDays * 24 * 60 * 60 * 1000);
};

const isMarketExpired = (maturityDate) => {
  const expiryDate = addDaysToEnteredTimestamp(MARKET_DURATION_IN_DAYS, maturityDate.getTime());
  return expiryDate < new Date().getTime();
};

const getCanceledGameClaimableAmount = (position) => {
  switch (position.position) {
    case POSITION_TYPE.Home:
      return position.market.homeOdds * position.amount;
    case POSITION_TYPE.Away:
      return position.market.awayOdds * position.amount;
    case POSITION_TYPE.Draw:
      return position.market.drawOdds ? position.market.drawOdds * position.amount : 0;
    default:
      return 0;
  }
};

const isParlayOpen = (parlayMarket) => {
  const parlayHasOpenMarkets = parlayMarket.positions.some((position) => position.market.isOpen);
  const resolvedMarketsCount = parlayMarket.positions.filter(
    (position) => position.market.isResolved || position.market.isCanceled,
  ).length;
  const claimablePositionsCount = parlayMarket.positions.filter((position) => position.isClaimable).length;

  const isParlayLost = resolvedMarketsCount > claimablePositionsCount;

  return parlayHasOpenMarkets && !isParlayLost;
};

const isParlayClaimable = (parlayMarket) => {
  const parlayHasOpenMarkets = parlayMarket.positions.some((position) => position.market.isOpen);
  const resolvedMarketsCount = parlayMarket.positions.filter(
    (position) => position.market.isResolved || position.market.isCanceled,
  ).length;
  const claimablePositionsCount = parlayMarket.positions.filter((position) => position.isClaimable).length;

  const lastGameStartsExpiryDate = addDaysToEnteredTimestamp(
    MARKET_DURATION_IN_DAYS,
    parlayMarket.lastGameStarts.getTime(),
  );
  const isMarketExpired = lastGameStartsExpiryDate < new Date().getTime();

  const isWinningParlay = claimablePositionsCount === resolvedMarketsCount && !parlayHasOpenMarkets;

  return isWinningParlay && !isMarketExpired && !parlayMarket.claimed;
};

const getPositionStatus = (tx) => {
  if (tx.type !== "buy") {
    return "SOLD";
  }
  if (tx.market.isCanceled) {
    return "CANCELED";
  }
  if (tx.market.isResolved) {
    if (tx.position === FINAL_RESULT_TYPE_POSITION_TYPE_MAP[tx.market.finalResult]) {
      return "WON";
    } else {
      return "LOSS";
    }
  } else {
    return "OPEN";
  }
};

module.exports = {
  delay,
  fixDuplicatedTeamName,
  bigNumberFormatter,
  convertPriceImpactToBonus,
  formatMarketOdds,
  getLeagueNameById,
  getIsOneSideMarket,
  packMarket,
  isMarketExpired,
  getCanceledGameClaimableAmount,
  isParlayOpen,
  isParlayClaimable,
  getPositionStatus,
};
