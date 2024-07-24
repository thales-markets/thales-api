const { LeagueMap, Sport } = require("../constants/sports");

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

const getLiveSupportedLeagues = () => {
  const allLeagues = Object.values(LeagueMap);
  return allLeagues.filter((league) => league.live).map((league) => league.id);
};

const getTestnetLiveSupportedLeagues = () => {
  const allLeagues = Object.values(LeagueMap);
  return allLeagues.filter((league) => league.isLiveTestnet).map((league) => league.id);
};

const isLiveSupportedForLeague = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.live : false;
};

const getLeagueOpticOddsName = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.opticOddsName : undefined;
};

const getLeaguePeriodType = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.periodType : "";
};

module.exports = {
  getLeagueSport,
  getLeagueProvider,
  getLeagueIsDrawAvailable,
  getLiveSupportedLeagues,
  getTestnetLiveSupportedLeagues,
  getLeagueLabel,
  isLiveSupportedForLeague,
  getLeagueOpticOddsName,
  getLeaguePeriodType,
};
