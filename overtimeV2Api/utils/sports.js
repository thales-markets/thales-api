const { LeagueMap, Sport } = require("overtime-live-trading-utils");

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
  return allLeagues
    .filter((league) => league.betTypesForLive && league.betTypesForLive.length > 0)
    .map((league) => league.id);
};

const getTestnetLiveSupportedLeagues = () => {
  const allLeagues = Object.values(LeagueMap);
  return allLeagues
    .filter((league) => league.betTypesForLiveTestnet && league.betTypesForLiveTestnet.length > 0)
    .map((league) => league.id);
};

const getBetTypesForLeague = (league, testnet) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? (testnet ? leagueInfo.betTypesForLiveTestnet : leagueInfo.betTypesForLive) : [];
};

const getIsLiveSupported = (league) => {
  const leagueInfo = LeagueMap[league];
  return leagueInfo ? leagueInfo.betTypesForLive && leagueInfo.betTypesForLive > 0 : false;
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
  getIsLiveSupported,
  getBetTypesForLeague,
  getLeagueLabel,
  getLeagueOpticOddsName,
  getLeaguePeriodType,
};
