const {
  ODDS_TYPE,
  PLAYER_PROPS_MARKET_TYPES,
  ONE_SIDE_PLAYER_PROPS_MARKET_TYPES,
  YES_NO_PLAYER_PROPS_MARKET_TYPES,
  COMBINED_POSITIONS_MARKET_TYPES,
} = require("../constants/markets");
const overtimeSportsList = require("../assets/overtime-sports.json");
const {
  SPORTS_TAGS_MAP,
  GOLF_TOURNAMENT_WINNER_TAG,
  ENETPULSE_SPORTS,
  JSON_ODDS_SPORTS,
  SPORT_ID_MAP_ENETPULSE,
} = require("../constants/tags");
const bytes32 = require("bytes32");

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
  const league = overtimeSportsList.find((sport) => Number(sport.id) === Number(id));
  return league ? league.name : undefined;
};
const getOpticOddsLeagueNameById = (id) => {
  const league = overtimeSportsList.find((sport) => Number(sport.id) === Number(id));
  return league ? league.opticOddsName : undefined;
};

const getIsOneSideMarket = (tag) =>
  SPORTS_TAGS_MAP["Motosport"].includes(Number(tag)) || Number(tag) == GOLF_TOURNAMENT_WINNER_TAG;

const getIsPlayerPropsMarket = (betType) => PLAYER_PROPS_MARKET_TYPES.includes(betType);

const getIsOneSidePlayerPropsMarket = (betType) => ONE_SIDE_PLAYER_PROPS_MARKET_TYPES.includes(betType);

const getIsYesNoPlayerPropsMarket = (betType) => YES_NO_PLAYER_PROPS_MARKET_TYPES.includes(betType);

const getIsCombinedPositionsMarket = (betType) => {
  return COMBINED_POSITIONS_MARKET_TYPES.includes(betType);
};

const getIsEnetpulseSport = (sportId) => ENETPULSE_SPORTS.includes(Number(sportId));

const getIsEnetpulseSportV2 = (sportId) => SPORT_ID_MAP_ENETPULSE[Number(sportId)] !== undefined;

const getIsJsonOddsSport = (sportId) => JSON_ODDS_SPORTS.includes(Number(sportId));

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

const checkOddsFromMultipleBookmakersV2 = (oddsMap, arrayOfBookmakers, isTwoPositionalSport) => {
  // Check if any bookmaker has odds of 0 or 0.0001
  const hasZeroOdds = arrayOfBookmakers.some((bookmakerId) => {
    const line = oddsMap.get(bookmakerId);
    if (line) {
      return line.homeOdds === 0 || line.awayOdds === 0 || (!isTwoPositionalSport && line.drawOdds === 0);
    }
    return false;
  });

  if (arrayOfBookmakers.length == 1) {
    if (hasZeroOdds) {
      return [
        {
          homeOdds: 0,
          awayOdds: 0,
          drawOdds: 0,
        },
      ];
    }
    const firstBookmaker = arrayOfBookmakers[0];
    const firstLine = oddsMap.get(firstBookmaker);

    return [
      {
        homeOdds: firstLine.homeOdds,
        awayOdds: firstLine.awayOdds,
        drawOdds: isTwoPositionalSport ? 0 : firstLine.drawOdds,
      },
    ];
  }

  if (hasZeroOdds) {
    // If any bookmaker has zero odds, return zero odds
    return [
      {
        homeOdds: 0,
        awayOdds: 0,
        drawOdds: 0,
      },
    ];
  } else {
    let lines = [];
    arrayOfBookmakers.forEach((bookmaker) => lines.push(oddsMap.get(bookmaker)));

    if (lines[0] != undefined) {
      return lines.map((line) => {
        return { homeOdds: line.homeOdds, awayOdds: line.awayOdds, drawOdds: isTwoPositionalSport ? 0 : line.drawOdds };
      });
    }
  }

  // If no matching bookmakers are found, return zero odds
  console.log("Returning zero odds cause no matching bookmakers have been found");
  return [
    {
      homeOdds: 0,
      awayOdds: 0,
      drawOdds: 0,
    },
  ];
};

const convertFromBytes32 = (value) => {
  const result = bytes32({ input: value });
  return result.replace(/\0/g, "");
};

module.exports = {
  fixDuplicatedTeamName,
  formatMarketOdds,
  getLeagueNameById,
  getOpticOddsLeagueNameById,
  getIsOneSideMarket,
  getIsPlayerPropsMarket,
  getIsOneSidePlayerPropsMarket,
  getIsYesNoPlayerPropsMarket,
  getIsEnetpulseSport,
  getIsJsonOddsSport,
  getAverageOdds,
  checkOddsFromMultipleBookmakersV2,
  getIsEnetpulseSportV2,
  convertFromBytes32,
  getIsCombinedPositionsMarket,
};
