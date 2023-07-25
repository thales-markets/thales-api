const { ethers } = require("ethers");
const { ODDS_TYPE } = require("../constants/markets");
const overtimeSportsList = require("../assets/overtime-sports.json");

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

module.exports = {
  delay,
  fixDuplicatedTeamName,
  bigNumberFormatter,
  convertPriceImpactToBonus,
  formatMarketOdds,
  getLeagueNameById,
};
