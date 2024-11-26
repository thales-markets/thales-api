// MOCKED functions

let __gameContraints = { allow: true, message: "" };
const __mockCheckGameContraints = (gameContraints) => (__gameContraints = gameContraints);
const checkGameContraints = () => __gameContraints;

// NOT MOCKED functions

const teamNamesMatching = (leagueId, marketHomeTeam, marketAwayTeam, apiHomeTeam, apiAwayTeam, teamsMap) =>
  jest
    .requireActual("overtime-live-trading-utils")
    .teamNamesMatching(leagueId, marketHomeTeam, marketAwayTeam, apiHomeTeam, apiAwayTeam, teamsMap);

const gamesDatesMatching = (marketMaturityDate, apiStartDate, sportId, tennisDifferenceEnvVariable) =>
  jest
    .requireActual("overtime-live-trading-utils")
    .gamesDatesMatching(marketMaturityDate, apiStartDate, sportId, tennisDifferenceEnvVariable);

const getLeagueOpticOddsName = (league) =>
  jest.requireActual("overtime-live-trading-utils").getLeagueOpticOddsName(league);

const getBookmakersArray = (bookmakersData, sportId, backupLiveOddsProviders) =>
  jest
    .requireActual("overtime-live-trading-utils")
    .getBookmakersArray(bookmakersData, sportId, backupLiveOddsProviders);

const getLiveSupportedLeagues = (leagueInfoArray) =>
  jest.requireActual("overtime-live-trading-utils").getLiveSupportedLeagues(leagueInfoArray);

const getBetTypesForLeague = (league, leagueInfoArray) =>
  jest.requireActual("overtime-live-trading-utils").getBetTypesForLeague(league, leagueInfoArray);

const getLeagueSport = (league) => jest.requireActual("overtime-live-trading-utils").getLeagueSport(league);

const getLeagueLabel = (league) => jest.requireActual("overtime-live-trading-utils").getLeagueLabel(league);

const getLeagueProvider = (league) => jest.requireActual("overtime-live-trading-utils").getLeagueProvider(league);

const getLeagueIsDrawAvailable = (league) =>
  jest.requireActual("overtime-live-trading-utils").getLeagueIsDrawAvailable(league);

const fetchResultInCurrentSet = (currentSet, opticOddsScoresApiResponse) =>
  jest.requireActual("overtime-live-trading-utils").fetchResultInCurrentSet(currentSet, opticOddsScoresApiResponse);

const League = jest.requireActual("overtime-live-trading-utils").League;
const Sport = jest.requireActual("overtime-live-trading-utils").Sport;
const MoneylineTypes = jest.requireActual("overtime-live-trading-utils").MoneylineTypes;
const Provider = jest.requireActual("overtime-live-trading-utils").Provider;
const PeriodType = jest.requireActual("overtime-live-trading-utils").PeriodType;

const UFC_LEAGUE_IDS = jest.requireActual("overtime-live-trading-utils").UFC_LEAGUE_IDS;
const LeagueMap = jest.requireActual("overtime-live-trading-utils").LeagueMap;
const LeagueIdMapEnetpulse = jest.requireActual("overtime-live-trading-utils").LeagueIdMapEnetpulse;
const LeagueIdMapOpticOdds = jest.requireActual("overtime-live-trading-utils").LeagueIdMapOpticOdds;

const processMarket = (
  market,
  apiResponseWithOdds,
  liveOddsProviders,
  spreadData,
  isDrawAvailable,
  defaultSpreadForLiveMarkets,
  maxPercentageDiffBetwenOdds,
  leagueMap,
) =>
  jest
    .requireActual("overtime-live-trading-utils")
    .processMarket(
      market,
      apiResponseWithOdds,
      liveOddsProviders,
      spreadData,
      isDrawAvailable,
      defaultSpreadForLiveMarkets,
      maxPercentageDiffBetwenOdds,
      leagueMap,
    );

module.exports = {
  __mockCheckGameContraints,
  checkGameContraints,
  teamNamesMatching,
  gamesDatesMatching,
  getLeagueOpticOddsName,
  getBookmakersArray,
  getLiveSupportedLeagues,
  getBetTypesForLeague,
  getLeagueSport,
  getLeagueLabel,
  getLeagueProvider,
  getLeagueIsDrawAvailable,
  fetchResultInCurrentSet,
  processMarket,
  League,
  Sport,
  MoneylineTypes,
  Provider,
  PeriodType,
  UFC_LEAGUE_IDS,
  LeagueMap,
  LeagueIdMapEnetpulse,
  LeagueIdMapOpticOdds,
};
