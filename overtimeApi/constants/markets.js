const BET_TYPE = {
  Moneyline: 0,
  Spread: 10001,
  Total: 10002,
  DoubleChance: 10003,
  CombinedPositions: 10004,
  Halftime: 10005,
  HalftimeFulltime: 10006,
  Goals: 10007,
  HalftimeFulltimeGoals: 10008,
  HalftimeSpread: 10011,
  HalftimeTotal: 10012,
  Spread2: 10013,
  Total2: 10014,
  Homeruns: 11010,
  Strikeouts: 11019,
  PassingYards: 11051,
  PassingTouchdowns: 11052,
  RushingYards: 11053,
  ReceivingYards: 11057,
  Touchdowns: 11055,
  FieldGoalsMade: 11060,
  PitcherHitsAllowed: 11047,
  Points: 11029,
  Shots: 11097,
  Goals: 11086,
  HitsRecorded: 11012,
  Rebounds: 11035,
  Assists: 11039,
  DoubleDouble: 11087,
  TripleDouble: 11088,
  Receptions: 11058,
  FirstTouchdown: 11049,
  LastTouchdown: 11056,
  ThreePointsMade: 11038,
};

const MARKET_TYPE = {
  [BET_TYPE.Moneyline]: "moneyline",
  [BET_TYPE.Spread]: "spread",
  [BET_TYPE.Total]: "total",
  [BET_TYPE.DoubleChance]: "doubleChance",
  [BET_TYPE.CombinedPositions]: "combinedPositions",
  [BET_TYPE.Halftime]: "halftime",
  [BET_TYPE.HalftimeFulltime]: "halftimeFulltime",
  [BET_TYPE.Goals]: "goals",
  [BET_TYPE.HalftimeFulltimeGoals]: "halftimeFulltimeGoals",
  [BET_TYPE.HalftimeSpread]: "halftimeSpread",
  [BET_TYPE.HalftimeTotal]: "halftimeTotal",
  [BET_TYPE.HalftimeSpread]: "halftimeSpread",
  [BET_TYPE.HalftimeTotal]: "halftimeTotal",
  [BET_TYPE.Homeruns]: "homeruns",
  [BET_TYPE.Strikeouts]: "strikeouts",
  [BET_TYPE.PassingYards]: "passingYards",
  [BET_TYPE.PassingTouchdowns]: "passingTouchdowns",
  [BET_TYPE.RushingYards]: "rushingYards",
  [BET_TYPE.ReceivingYards]: "receivingYards",
  [BET_TYPE.Touchdowns]: "touchdowns",
  [BET_TYPE.FieldGoalsMade]: "fieldGoalsMade",
  [BET_TYPE.PitcherHitsAllowed]: "pitcherHitsAllowed",
  [BET_TYPE.Points]: "points",
  [BET_TYPE.Shots]: "shots",
  [BET_TYPE.Goals]: "goals",
  [BET_TYPE.HitsRecorded]: "hitsRecorded",
  [BET_TYPE.Rebounds]: "rebounds",
  [BET_TYPE.Assists]: "assists",
  [BET_TYPE.DoubleDouble]: "doubleDouble",
  [BET_TYPE.TripleDouble]: "tripleDouble",
  [BET_TYPE.Receptions]: "receptions",
  [BET_TYPE.FirstTouchdown]: "firstTouchdown",
  [BET_TYPE.LastTouchdown]: "lastTouchdown",
  [BET_TYPE.ThreePointsMade]: "threePointsMade",
};

const PLAYER_PROPS_BET_TYPES = [
  BET_TYPE.Homeruns,
  BET_TYPE.Strikeouts,
  BET_TYPE.PassingYards,
  BET_TYPE.PassingTouchdowns,
  BET_TYPE.RushingYards,
  BET_TYPE.ReceivingYards,
  BET_TYPE.Touchdowns,
  BET_TYPE.FieldGoalsMade,
  BET_TYPE.PitcherHitsAllowed,
  BET_TYPE.Points,
  BET_TYPE.Shots,
  BET_TYPE.Goals,
  BET_TYPE.HitsRecorded,
  BET_TYPE.Rebounds,
  BET_TYPE.Assists,
  BET_TYPE.DoubleDouble,
  BET_TYPE.TripleDouble,
  BET_TYPE.Receptions,
  BET_TYPE.FirstTouchdown,
  BET_TYPE.LastTouchdown,
  BET_TYPE.ThreePointsMade,
];

const ONE_SIDER_PLAYER_PROPS_BET_TYPES = [
  BET_TYPE.Touchdowns,
  BET_TYPE.Goals,
  BET_TYPE.FirstTouchdown,
  BET_TYPE.LastTouchdown,
];
const SPECIAL_YES_NO_BET_TYPES = [BET_TYPE.DoubleDouble, BET_TYPE.TripleDouble];

const ODDS_TYPE = {
  American: "american-odds",
  Decimal: "decimal-odds",
  AMM: "normalized-implied-odds",
};

const POSITION_NAME = {
  Home: "home",
  Away: "away",
  Draw: "draw",
};

const POSITION_TYPE = {
  Home: 0,
  Away: 1,
  Draw: 2,
};

const FINAL_RESULT_TYPE = {
  Canceled: 0,
  Home: 1,
  Away: 2,
  Draw: 3,
};

const POSITION_NAME_TYPE_MAP = {
  [POSITION_NAME.Home]: POSITION_TYPE.Home,
  [POSITION_NAME.Away]: POSITION_TYPE.Away,
  [POSITION_NAME.Draw]: POSITION_TYPE.Draw,
};

const FINAL_RESULT_TYPE_POSITION_TYPE_MAP = {
  [FINAL_RESULT_TYPE.Home]: POSITION_TYPE.Home,
  [FINAL_RESULT_TYPE.Away]: POSITION_TYPE.Away,
  [FINAL_RESULT_TYPE.Draw]: POSITION_TYPE.Draw,
};

const MARKET_DURATION_IN_DAYS = 90;
const PARLAY_MAXIMUM_QUOTE = 0.01449275;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const PARLAY_CONTRACT_ERROR_MESSAGE = {
  RiskPerCombExceeded: "RiskPerComb exceeded",
  SameTeamOnParlay: "SameTeamOnParlay",
};

const STATUS = {
  Open: 0,
  Paused: 1,
  Resolved: 10,
  Canceled: 255,
};

const MAX_PERCENTAGE_DIFF_BETWEEN_ODDS = 10;
const MIN_ODDS_FOR_DIFF_CHECKING = 0.2;

module.exports = {
  BET_TYPE,
  MARKET_TYPE,
  PLAYER_PROPS_BET_TYPES,
  ONE_SIDER_PLAYER_PROPS_BET_TYPES,
  ODDS_TYPE,
  MARKET_DURATION_IN_DAYS,
  POSITION_NAME,
  POSITION_TYPE,
  POSITION_NAME_TYPE_MAP,
  PARLAY_MAXIMUM_QUOTE,
  FINAL_RESULT_TYPE_POSITION_TYPE_MAP,
  ZERO_ADDRESS,
  PARLAY_CONTRACT_ERROR_MESSAGE,
  SPECIAL_YES_NO_BET_TYPES,
  STATUS,
  MAX_PERCENTAGE_DIFF_BETWEEN_ODDS,
  MIN_ODDS_FOR_DIFF_CHECKING,
};
