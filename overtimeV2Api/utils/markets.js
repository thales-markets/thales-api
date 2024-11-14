const {
  OddsType,
  PLAYER_PROPS_MARKET_TYPES,
  ONE_SIDE_PLAYER_PROPS_MARKET_TYPES,
  YES_NO_PLAYER_PROPS_MARKET_TYPES,
  COMBINED_POSITIONS_MARKET_TYPES,
  FUTURES_MARKET_TYPES,
  MarketTypeMap,
  Status,
  PARENT_MARKET_PROPERTIES_TO_EXCLUDE,
  CHILD_MARKET_PROPERTIES_TO_EXCLUDE,
} = require("../constants/markets");
const bytes32 = require("bytes32");
const { getLeagueSport, League, Sport, getLeagueLabel, UFC_LEAGUE_IDS } = require("overtime-live-trading-utils");
const { bigNumberFormatter } = require("./formatters");

const formatMarketOdds = (odds, oddsType) => {
  if (!odds || odds === null) {
    return undefined;
  }
  switch (oddsType) {
    case OddsType.DECIMAL:
      return 1 / odds;
    case OddsType.AMERICAN: {
      const decimal = 1 / odds;
      if (decimal >= 2) {
        return (decimal - 1) * 100;
      } else {
        return -100 / (decimal - 1);
      }
    }
    case OddsType.AMM:
    default:
      return odds;
  }
};

const isOneSideMarket = (league) =>
  getLeagueSport(league) === Sport.MOTOSPORT || league == League.GOLF_WINNER || league == League.US_ELECTION;

const isPlayerPropsMarket = (marketType) => PLAYER_PROPS_MARKET_TYPES.includes(marketType);

const isOneSidePlayerPropsMarket = (marketType) => ONE_SIDE_PLAYER_PROPS_MARKET_TYPES.includes(marketType);

const isYesNoPlayerPropsMarket = (marketType) => YES_NO_PLAYER_PROPS_MARKET_TYPES.includes(marketType);

const getIsCombinedPositionsMarket = (marketType) => {
  return COMBINED_POSITIONS_MARKET_TYPES.includes(marketType);
};

const isFuturesMarket = (marketType) => {
  return FUTURES_MARKET_TYPES.includes(marketType);
};

const calculateImpliedOddsDifference = (impliedOddsA, impliedOddsB) => {
  const percentageDifference = (Math.abs(impliedOddsA - impliedOddsB) / impliedOddsA) * 100;
  console.log("% diff: " + percentageDifference);
  return percentageDifference;
};

const convertFromBytes32 = (value) => {
  const result = bytes32({ input: value });
  return result.replace(/\0/g, "");
};

const packMarket = (market, isChild) => {
  const leagueId = `${market.sportId}`.startsWith("152")
    ? League.TENNIS_WTA
    : `${market.sportId}`.startsWith("153")
    ? League.TENNIS_GS
    : `${market.sportId}`.startsWith("156")
    ? League.TENNIS_MASTERS
    : UFC_LEAGUE_IDS.includes(market.sportId)
    ? League.UFC
    : market.sportId;
  const type = MarketTypeMap[market.typeId]?.key;

  const packedMarket = {
    gameId: market.gameId,
    sport: getLeagueSport(leagueId),
    leagueId: leagueId,
    leagueName: getLeagueLabel(leagueId),
    subLeagueId: market.sportId,
    typeId: market.typeId,
    type,
    line: Number(market.line) / 100,
    maturity: market.maturity,
    maturityDate: new Date(market.maturity * 1000),
    homeTeam: market.homeTeam,
    awayTeam: market.awayTeam,
    status: market.status,
    isOpen: market.status === Status.OPEN || market.status === Status.IN_PROGRESS,
    isResolved: market.status === Status.RESOLVED,
    isCancelled: market.status === Status.CANCELLED,
    isPaused: market.status === Status.PAUSED,
    isOneSideMarket: isOneSideMarket(leagueId),
    isPlayerPropsMarket: isPlayerPropsMarket(market.typeId),
    isOneSidePlayerPropsMarket: isOneSidePlayerPropsMarket(market.typeId),
    isYesNoPlayerPropsMarket: isYesNoPlayerPropsMarket(market.typeId),
    playerProps: {
      playerId: market.playerProps.playerId,
      originalProviderPlayerId: market.playerProps.originalProviderPlayerId,
      playerName: market.playerProps.playerName,
    },
    combinedPositions: market.combinedPositions
      ? market.combinedPositions.map((combinedPosition) => {
          return combinedPosition.map((position) => {
            return {
              ...position,
              line: position.line / 100,
            };
          });
        })
      : new Array(market.odds.length).fill([]),
    odds: market.odds.map((odd) => {
      const formattedOdds = Number(odd) > 0 ? bigNumberFormatter(odd) : 0;
      return {
        american: formattedOdds ? formatMarketOdds(formattedOdds, OddsType.AMERICAN) : 0,
        decimal: formattedOdds ? formatMarketOdds(formattedOdds, OddsType.DECIMAL) : 0,
        normalizedImplied: formattedOdds ? formatMarketOdds(formattedOdds, OddsType.AMM) : 0,
      };
    }),
    positionNames: market.positionNames,
    proof: market.proof,
  };

  if (!isChild) {
    packedMarket.isV3 = !!market.isV3 || packedMarket.sport === Sport.TENNIS;
  }

  return packedMarket;
};

const handleExcludeProperties = (propertiesToExclude, market, newMarket, shouldIncludeProofs) => {
  propertiesToExclude.forEach((property) => {
    delete newMarket[property];
  });
  if (!shouldIncludeProofs) {
    delete newMarket["proof"];
  }
  if (!market.isPlayerPropsMarket) {
    delete newMarket["playerProps"];
  } else {
    newMarket.playerProps = {
      playerId: market.playerProps.playerId,
      playerName: market.playerProps.playerName,
    };
  }
  if (!getIsCombinedPositionsMarket(market.typeId)) {
    delete newMarket["combinedPositions"];
  }
  newMarket.odds = market.odds.map((odd) => odd.normalizedImplied);
};

const excludePropertiesFromMarket = (market, shouldIncludeProofs) => {
  const newMarket = { ...market };
  handleExcludeProperties(PARENT_MARKET_PROPERTIES_TO_EXCLUDE, market, newMarket, shouldIncludeProofs);

  newMarket.childMarkets = [];
  market.childMarkets.forEach((childMarket) => {
    const newChildMarket = { ...childMarket };
    handleExcludeProperties(CHILD_MARKET_PROPERTIES_TO_EXCLUDE, childMarket, newChildMarket, shouldIncludeProofs);
    newMarket.childMarkets.push(newChildMarket);
  });
  return newMarket;
};

module.exports = {
  formatMarketOdds,
  isOneSideMarket,
  isPlayerPropsMarket,
  isOneSidePlayerPropsMarket,
  isYesNoPlayerPropsMarket,
  calculateImpliedOddsDifference,
  convertFromBytes32,
  getIsCombinedPositionsMarket,
  isFuturesMarket,
  packMarket,
  excludePropertiesFromMarket,
};
