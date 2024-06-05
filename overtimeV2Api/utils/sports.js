const { LeagueMap } = require("../constants/sports");

const getLeagueSport = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.sport : Sport.EMPTY;
};

const getLeagueLabel = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.label : "";
};

const getLeagueProvider = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.provider : "";
};

const getLeagueIsDrawAvailable = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.isDrawAvailable : false;
};

const getSportLeagueIds = (sport) => {
  const allLeagues = Object.values(LeagueMap);
  return allLeagues.filter((league) => league.sport === sport).map((league) => league.id);
};

const getLiveSupportedLeagues = () => {
  const allLeagues = Object.values(LeagueMap);
  return allLeagues.filter((league) => league.live).map((league) => league.id);
};

const isLiveSupportedForLeague = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.live : false;
};

module.exports = {
  getLeagueSport,
  getLeagueProvider,
  getLeagueIsDrawAvailable,
  getSportLeagueIds,
  getLiveSupportedLeagues,
  getLeagueLabel,
  isLiveSupportedForLeague,
};
