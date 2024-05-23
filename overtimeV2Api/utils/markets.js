const {
  ODDS_TYPE,
  PLAYER_PROPS_MARKET_TYPES,
  ONE_SIDE_PLAYER_PROPS_MARKET_TYPES,
  YES_NO_PLAYER_PROPS_MARKET_TYPES,
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
    // If none of the bookmakers have zero odds, check implied odds percentage difference
    const firstBookmaker = arrayOfBookmakers[0];
    const secondBookmaker = arrayOfBookmakers[1];
    const thirdBookmaker = arrayOfBookmakers[2];
    const firstLine = oddsMap.get(firstBookmaker);
    const secondLine = oddsMap.get(secondBookmaker);
    const thirdLine = oddsMap.get(thirdBookmaker);

    if (firstLine) {
      const homeOdd = firstLine.homeOdds;
      const awayOdd = firstLine.awayOdds;
      const drawOdd = firstLine.drawOdds;

      // Maximum allowed percentage difference for implied odds
      // const maxImpliedPercentageDifference = Number(MAX_PERCENTAGE_DIFF_BETWEEN_ODDS);

      // // Check if the implied odds from other bookmakers have a difference of more than 10%
      // const hasLargeImpliedPercentageDifference = arrayOfBookmakers.slice(1).some((bookmakerId) => {
      //   const line = oddsMap[bookmakerId];
      //   if (line) {
      //     const otherHomeOdd = line.homeOdds;
      //     const otherAwayOdd = line.awayOdds;
      //     const otherDrawOdd = line.drawOdds;

      //     const homeOddsImplied = oddslib.from("decimal", homeOdd).to("impliedProbability");

      //     const awayOddsImplied = oddslib.from("decimal", awayOdd).to("impliedProbability");

      //     // Calculate implied odds for the "draw" if it's not a two-positions sport
      //     const drawOddsImplied = isTwoPositionalSport ? 0 : oddslib.from("decimal", drawOdd).to("impliedProbability");

      //     const otherHomeOddImplied = oddslib.from("decimal", otherHomeOdd).to("impliedProbability");

      //     const otherAwayOddImplied = oddslib.from("decimal", otherAwayOdd).to("impliedProbability");

      //     // Calculate implied odds for the "draw" if it's not a two-positions sport
      //     const otherDrawOddImplied = isTwoPositionalSport
      //       ? 0
      //       : oddslib.from("decimal", otherDrawOdd).to("impliedProbability");

      //     // Calculate the percentage difference for implied odds
      //     const homeOddsDifference = calculateImpliedOddsDifference(homeOddsImplied, otherHomeOddImplied);

      //     const awayOddsDifference = calculateImpliedOddsDifference(awayOddsImplied, otherAwayOddImplied);

      //     // Check implied odds difference for the "draw" only if it's not a two-positions sport
      //     const drawOddsDifference = isTwoPositionalSport
      //       ? 0
      //       : calculateImpliedOddsDifference(drawOddsImplied, otherDrawOddImplied);

      //     // Check if the percentage difference exceeds the threshold
      //     if (
      //       (homeOddsDifference > maxImpliedPercentageDifference &&
      //         homeOddsImplied > MIN_ODDS_FOR_DIFF_CHECKING &&
      //         otherHomeOddImplied > MIN_ODDS_FOR_DIFF_CHECKING) ||
      //       (awayOddsDifference > maxImpliedPercentageDifference &&
      //         awayOddsImplied > MIN_ODDS_FOR_DIFF_CHECKING &&
      //         otherAwayOddImplied > MIN_ODDS_FOR_DIFF_CHECKING) ||
      //       (!isTwoPositionalSport &&
      //         drawOddsDifference > maxImpliedPercentageDifference &&
      //         drawOddsImplied > MIN_ODDS_FOR_DIFF_CHECKING &&
      //         otherDrawOddImplied > MIN_ODDS_FOR_DIFF_CHECKING)
      //     ) {
      //       return true;
      //     }
      //   }
      //   return false;
      // });

      // if (hasLargeImpliedPercentageDifference) {
      //   console.log("Returning zero odds due to percentage difference");
      //   return [
      //     {
      //       homeOdds: 0,
      //       awayOdds: 0,
      //       drawOdds: 0,
      //     },
      //   ];
      // }

      const firstBookieOdds = {
        homeOdds: homeOdd,
        awayOdds: awayOdd,
        drawOdds: isTwoPositionalSport ? 0 : drawOdd,
      };
      const secondBookieOdds = {
        homeOdds: secondLine.homeOdds,
        awayOdds: secondLine.awayOdds,
        drawOdds: isTwoPositionalSport ? 0 : secondLine.drawOdds,
      };
      const thirdBookieOdds = {
        homeOdds: thirdLine.homeOdds,
        awayOdds: thirdLine.awayOdds,
        drawOdds: isTwoPositionalSport ? 0 : thirdLine.drawOdds,
      };
      return [firstBookieOdds, secondBookieOdds, thirdBookieOdds];
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
};
