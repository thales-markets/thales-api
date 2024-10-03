const {
  OddsType,
  PLAYER_PROPS_MARKET_TYPES,
  ONE_SIDE_PLAYER_PROPS_MARKET_TYPES,
  YES_NO_PLAYER_PROPS_MARKET_TYPES,
  COMBINED_POSITIONS_MARKET_TYPES,
} = require("../constants/markets");
const bytes32 = require("bytes32");
const { getLeagueSport, League, Sport } = require("overtime-live-trading-utils");

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

// DEPRECATE
const getAverageOdds = (multipleOddsFromProviders) => {
  let homeOdds;
  let awayOdds;
  let drawOdds;

  multipleOddsFromProviders.forEach((oddsObject) => {
    homeOdds += oddsObject;
    awayOdds += oddsObject;
    drawOdds += oddsObject;
  });

  homeOdds = homeOdds / multipleOddsFromProviders.length;
  awayOdds = awayOdds / multipleOddsFromProviders.length;
  drawOdds = drawOdds / multipleOddsFromProviders.length;

  return { homeOdds: homeOdds, awayOdds: awayOdds, drawOdds: drawOdds };
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

module.exports = {
  fixDuplicatedTeamName,
  formatMarketOdds,
  isOneSideMarket,
  isPlayerPropsMarket,
  isOneSidePlayerPropsMarket,
  isYesNoPlayerPropsMarket,
  getAverageOdds,
  calculateImpliedOddsDifference,
  convertFromBytes32,
  getIsCombinedPositionsMarket,
};
