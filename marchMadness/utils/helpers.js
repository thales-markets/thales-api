const _ = require("lodash");
const { ethers } = require("ethers");

const bigNumberFormatter = (value, decimals) => Number(ethers.utils.formatUnits(value, decimals ? decimals : 18));

const floorNumberToDecimals = (value, decimals = DEFAULT_DECIMALS) => {
  return Math.floor(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const filterUniqueBracketsWithUniqueMinter = (data) => {
  const uniqueData = _.uniqWith(data, (arrVal, otherVal) => {
    return arrVal.minter == otherVal.minter && _.isEqual(arrVal.brackets, otherVal.brackets);
  });
  return uniqueData;
};

const mergePointsDataWithMintersData = (mintersData, pointsData) => {
  return mintersData.map((item, index) => {
    return {
      ...item,
      totalPoints: Number(pointsData[index]),
    };
  });
};

module.exports = {
  filterUniqueBracketsWithUniqueMinter,
  mergePointsDataWithMintersData,
  bigNumberFormatter,
  floorNumberToDecimals,
};
