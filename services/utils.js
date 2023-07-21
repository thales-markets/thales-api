function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function addMonthsToUTCDate(date, months) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ),
  );
}

function fixDuplicatedTeamName(name) {
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
}

function convertPositionNameToPosition(positionName) {
  if (positionName && positionName !== null && positionName.toUpperCase() == "HOME") return 0;
  if (positionName && positionName !== null && positionName.toUpperCase() == "AWAY") return 1;
  if (positionName && positionName !== null && positionName.toUpperCase() == "DRAW") return 2;
  return 1;
}

function convertFinalResultToResultType(result) {
  if (result == 1) return 0;
  if (result == 2) return 1;
  if (result == 3) return 2;
  return -1;
}

function sortByTotalQuote(a, b) {
  let firstQuote = 1;
  a.marketQuotes.map((quote) => {
    firstQuote = firstQuote * quote;
  });

  let secondQuote = 1;
  b.marketQuotes.map((quote) => {
    secondQuote = secondQuote * quote;
  });
  return firstQuote - secondQuote;
}

module.exports = {
  delay,
  addMonthsToUTCDate,
  fixDuplicatedTeamName,
  convertPositionNameToPosition,
  convertFinalResultToResultType,
  sortByTotalQuote,
};
