const teamNamesMatching = () => true;

const gamesDatesMatching = () => true;

let __bookmakersArray = ["mockedBookmaker"];
const __mockBookmakersArray = (bookmakers) => (__bookmakersArray = bookmakers);
const getBookmakersArray = () => __bookmakersArray;

module.exports = { teamNamesMatching, gamesDatesMatching, getBookmakersArray, __mockBookmakersArray };
