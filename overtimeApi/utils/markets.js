const { ethers } = require("ethers");
const {
  ODDS_TYPE,
  MARKET_TYPE,
  MARKET_DURATION_IN_DAYS,
  FINAL_RESULT_TYPE_POSITION_TYPE_MAP,
  POSITION_TYPE,
  PARLAY_MAXIMUM_QUOTE,
  POSITION_NAME_TYPE_MAP,
} = require("../constants/markets");
const overtimeSportsList = require("../assets/overtime-sports.json");
const {
  SPORTS_TAGS_MAP,
  GOLF_TOURNAMENT_WINNER_TAG,
  SPORTS_MAP,
  ENETPULSE_SPORTS,
  TAGS_OF_MARKETS_WITHOUT_DRAW_ODDS,
} = require("../constants/tags");

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
  return parlayHasOpenMarkets && !isParlayLost(parlayMarket);
};

const isParlayClaimable = (parlayMarket) => {
  const lastGameStartsExpiryDate = addDaysToEnteredTimestamp(
    MARKET_DURATION_IN_DAYS,
    parlayMarket.lastGameStarts.getTime(),
  );
  const isMarketExpired = lastGameStartsExpiryDate < new Date().getTime();

  return isParlayWon(parlayMarket) && !isMarketExpired && !parlayMarket.claimed;
};

const isParlayWon = (parlayMarket) =>
  parlayMarket.positions.every(
    (position) =>
      position.position === FINAL_RESULT_TYPE_POSITION_TYPE_MAP[position.market.finalResult] ||
      position.market.isCanceled,
  );

const isParlayLost = (parlayMarket) =>
  parlayMarket.positions.some(
    (position) =>
      position.position !== FINAL_RESULT_TYPE_POSITION_TYPE_MAP[position.market.finalResult] &&
      position.market.isResolved &&
      !position.market.isCanceled,
  );

const getPositionStatus = (position) =>
  position.isCanceled
    ? "CANCELED"
    : position.isOpen
    ? "OPEN"
    : position.isClaimable || position.isClaimed
    ? "WON"
    : "LOSS";

const getPositionTransactionStatus = (tx) =>
  tx.type !== "buy"
    ? "SOLD"
    : tx.market.isCanceled
    ? "CANCELED"
    : tx.market.isOpen
    ? "OPEN"
    : tx.position === FINAL_RESULT_TYPE_POSITION_TYPE_MAP[tx.market.finalResult]
    ? "WON"
    : "LOSS";

const getParlayStatus = (parlayMarket) =>
  isParlayWon(parlayMarket) ? "WON" : isParlayOpen(parlayMarket) ? "OPEN" : "LOSS";

const packParlay = (parlayMarket) => {
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
    hash: mappedPositionsParlayMarket.txHash,
    timestamp: mappedPositionsParlayMarket.timestamp,
    account: mappedPositionsParlayMarket.account,
    payout: mappedPositionsParlayMarket.payout,
    paid: mappedPositionsParlayMarket.sUSDPaid,
    paidAfterFees: mappedPositionsParlayMarket.sUSDAfterFees,
    totalQuote: {
      american: formatMarketOdds(mappedPositionsParlayMarket.totalQuote, ODDS_TYPE.American),
      decimal: formatMarketOdds(mappedPositionsParlayMarket.totalQuote, ODDS_TYPE.Decimal),
      normalizedImplied: formatMarketOdds(mappedPositionsParlayMarket.totalQuote, ODDS_TYPE.AMM),
    },
    lastGameStarts: mappedPositionsParlayMarket.lastGameStarts,
    isOpen: isParlayOpen(mappedPositionsParlayMarket),
    isClaimable: isParlayClaimable(mappedPositionsParlayMarket),
    isClaimed: mappedPositionsParlayMarket.claimed,
    status: getParlayStatus(mappedPositionsParlayMarket),
    positions: mappedPositionsParlayMarket.positions,
  };
};

const getIsDrawAvailable = (market) =>
  !(TAGS_OF_MARKETS_WITHOUT_DRAW_ODDS.includes(market.leagueId) || market.type === "total" || market.type === "spread");

module.exports = {
  fixDuplicatedTeamName,
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
  getPositionTransactionStatus,
  packParlay,
  getIsDrawAvailable,
};
