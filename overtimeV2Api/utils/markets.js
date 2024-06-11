const { League, Sport } = require("../constants/sports");
const { getLeagueSport } = require("./sports");
const {
  OddsType,
  PLAYER_PROPS_MARKET_TYPES,
  ONE_SIDE_PLAYER_PROPS_MARKET_TYPES,
  YES_NO_PLAYER_PROPS_MARKET_TYPES,
  COMBINED_POSITIONS_MARKET_TYPES,
} = require("../constants/markets");
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
    case OddsType.DECIMAL:
      return 1 / odds;
    case OddsType.AMERICAN:
      const decimal = 1 / odds;
      if (decimal >= 2) {
        return (decimal - 1) * 100;
      } else {
        return -100 / (decimal - 1);
      }
    case OddsType.AMM:
    default:
      return odds;
  }
};

const isOneSideMarket = (league) => getLeagueSport(league) === Sport.MOTOSPORT || league == League.GOLF_WINNER;

const isPlayerPropsMarket = (marketType) => PLAYER_PROPS_MARKET_TYPES.includes(marketType);

const isOneSidePlayerPropsMarket = (marketType) => ONE_SIDE_PLAYER_PROPS_MARKET_TYPES.includes(marketType);

const isYesNoPlayerPropsMarket = (marketType) => YES_NO_PLAYER_PROPS_MARKET_TYPES.includes(marketType);

const getIsCombinedPositionsMarket = (marketType) => {
  return COMBINED_POSITIONS_MARKET_TYPES.includes(marketType);
};

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

const checkOddsFromMultipleBookmakersV2 = (oddsMap, arrayOfBookmakers, isDrawAvailable) => {
  // Check if any bookmaker has odds of 0 or 0.0001
  const hasZeroOdds = arrayOfBookmakers.some((bookmakerId) => {
    const line = oddsMap.get(bookmakerId);
    if (line) {
      return line.homeOdds === 0 || line.awayOdds === 0 || (isDrawAvailable && line.drawOdds === 0);
    }
    return false;
  });

  if (arrayOfBookmakers.length == 1) {
    console.log("ARRAY OF BOOKMAKERS LENGTH: ", arrayOfBookmakers.length);
    console.log("HAS ZERO ODDS: ", hasZeroOdds);
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
        drawOdds: isDrawAvailable ? firstLine.drawOdds : 0,
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
    // Maximum allowed percentage difference for implied odds
    const maxImpliedPercentageDifference = Number(process.env.MAX_PERCENTAGE_DIFF_BETWEEN_ODDS);

    // Main bookmaker odds
    const firstBookmakerOdds = oddsMap.get(arrayOfBookmakers[0]);
    const homeOdd = firstBookmakerOdds.homeOdds;
    const awayOdd = firstBookmakerOdds.awayOdds;
    const drawOdd = firstBookmakerOdds.drawOdds;

    // // Check if the implied odds from other bookmakers have a difference of more than 10%
    const hasLargeImpliedPercentageDifference = arrayOfBookmakers.slice(1).some((bookmakerId) => {
      const line = oddsMap[bookmakerId];
      if (line) {
        const otherHomeOdd = line.homeOdds;
        const otherAwayOdd = line.awayOdds;
        const otherDrawOdd = line.drawOdds;

        const homeOddsImplied = oddslib.from("decimal", homeOdd).to("impliedProbability");

        const awayOddsImplied = oddslib.from("decimal", awayOdd).to("impliedProbability");

        // Calculate implied odds for the "draw" if it's not a two-positions sport
        const drawOddsImplied = !isDrawAvailable ? 0 : oddslib.from("decimal", drawOdd).to("impliedProbability");

        const otherHomeOddImplied = oddslib.from("decimal", otherHomeOdd).to("impliedProbability");

        const otherAwayOddImplied = oddslib.from("decimal", otherAwayOdd).to("impliedProbability");

        // Calculate implied odds for the "draw" if it's not a two-positions sport
        const otherDrawOddImplied = !isDrawAvailable
          ? 0
          : oddslib.from("decimal", otherDrawOdd).to("impliedProbability");

        // Calculate the percentage difference for implied odds
        const homeOddsDifference = calculateImpliedOddsDifference(homeOddsImplied, otherHomeOddImplied);

        const awayOddsDifference = calculateImpliedOddsDifference(awayOddsImplied, otherAwayOddImplied);

        // Check implied odds difference for the "draw" only if it's not a two-positions sport
        const drawOddsDifference = !isDrawAvailable
          ? 0
          : calculateImpliedOddsDifference(drawOddsImplied, otherDrawOddImplied);

        // Check if the percentage difference exceeds the threshold
        if (
          (homeOddsDifference > maxImpliedPercentageDifference &&
            homeOddsImplied > MIN_ODDS_FOR_DIFF_CHECKING &&
            otherHomeOddImplied > MIN_ODDS_FOR_DIFF_CHECKING) ||
          (awayOddsDifference > maxImpliedPercentageDifference &&
            awayOddsImplied > MIN_ODDS_FOR_DIFF_CHECKING &&
            otherAwayOddImplied > MIN_ODDS_FOR_DIFF_CHECKING) ||
          (isDrawAvailable &&
            drawOddsDifference > maxImpliedPercentageDifference &&
            drawOddsImplied > MIN_ODDS_FOR_DIFF_CHECKING &&
            otherDrawOddImplied > MIN_ODDS_FOR_DIFF_CHECKING)
        ) {
          return true;
        }
      }
      return false;
    });

    if (hasLargeImpliedPercentageDifference) {
      console.log("Returning zero odds due to percentage difference");
      return [
        {
          homeOdds: 0,
          awayOdds: 0,
          drawOdds: 0,
        },
      ];
    }

    let lines = [];
    arrayOfBookmakers.forEach((bookmaker) => lines.push(oddsMap.get(bookmaker)));

    if (lines[0] != undefined) {
      return lines.map((line) => {
        return { homeOdds: line.homeOdds, awayOdds: line.awayOdds, drawOdds: !isDrawAvailable ? 0 : line.drawOdds };
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

const adjustSpreadOnOdds = (impliedProbs, minSpread, targetSpread) => {
  // Step 1: Check if any implied probability is zero
  if (impliedProbs.some((prob) => prob === 0)) {
    return impliedProbs;
  }

  // Step 2: Calculate the current total implied probabilities
  const totalImpliedProbs = impliedProbs.reduce((sum, prob) => sum + prob, 0);

  // Step 3: Check if the sum of implied probabilities is greater than 1
  if (totalImpliedProbs <= 1) {
    return Array(impliedProbs.length).fill(0);
  }

  // Step 4: Check if targetSpread is zero
  if (targetSpread === 0) {
    const currentSpread = (totalImpliedProbs - 1) * 100;
    // If minSpread is set and greater than current spread, use minSpread
    if (minSpread > currentSpread) {
      targetSpread = minSpread;
    } else {
      // If minSpread is less than current spread, return odds as they are
      return impliedProbs;
    }
  }

  // Step 5: Calculate the target total implied probabilities
  const targetTotalImpliedProbs = 1 + targetSpread / 100;

  // Step 6: Calculate the adjustment factor
  const adjustmentFactor = targetTotalImpliedProbs / totalImpliedProbs;

  // Step 7: Adjust the probabilities to reflect the target spread
  let adjustedImpliedProbs = impliedProbs.map((prob) => prob * adjustmentFactor);

  // Step 8: Check if any adjusted probability equals or exceeds 1
  if (adjustedImpliedProbs.some((prob) => prob >= 1)) {
    return Array(impliedProbs.length).fill(0);
  }

  // Step 9: Ensure the sum of the adjusted probabilities equals the target total implied probabilities
  const sumAdjustedProbs = adjustedImpliedProbs.reduce((sum, prob) => sum + prob, 0);

  // Step 10: If the sum of the adjusted probabilities is less than 1, return zeros
  if (sumAdjustedProbs < 1) {
    return Array(impliedProbs.length).fill(0);
  }

  const normalizationFactor = targetTotalImpliedProbs / sumAdjustedProbs;
  adjustedImpliedProbs = adjustedImpliedProbs.map((prob) => prob * normalizationFactor);

  return adjustedImpliedProbs;
};

const getSpreadData = (spreadData, sportId, typeId) => {
  const defaultSpreadForLiveMarkets = Number(process.env.DEFAULT_SPREAD_FOR_LIVE_MARKETS);
  const sportSpreadData = spreadData.find(
    (data) => Number(data.typeId) === Number(typeId) && Number(data.sportId) === Number(sportId),
  );
  if (sportSpreadData) {
    return {
      minSpread: sportSpreadData.minSpread ? Number(sportSpreadData.minSpread) : defaultSpreadForLiveMarkets,
      targetSpread: sportSpreadData.targetSpread ? Number(sportSpreadData.targetSpread) : 0,
    };
  }
  return { minSpread: defaultSpreadForLiveMarkets, targetSpread: 0 };
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
  checkOddsFromMultipleBookmakersV2,
  convertFromBytes32,
  getIsCombinedPositionsMarket,
  adjustSpreadOnOdds,
  getSpreadData,
};
