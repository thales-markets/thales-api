const { checkGameContraints } = require("overtime-live-trading-utils");
const { League, Sport } = require("../../constants/sports");
const {
  nbaScoresResponse,
  mlbScoresResponse,
  soccerScoresResponse,
  soccerScoresHalftimeResponse,
  tennisScoresATPResponse,
} = require("./mockedResponses/opticOddsGameScoresRespones");

const constraintsMap = new Map();
process.env.QUARTER_LIMIT_FOR_LIVE_TRADING_BASKETBALL = 4;
process.env.PERIOD_LIMIT_FOR_LIVE_TRADING_HOCKEY = 3;
process.env.INNING_LIMIT_FOR_LIVE_TRADING_BASEBALL = 8;
process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL = 85;

constraintsMap.set(Sport.BASKETBALL, Number(process.env.QUARTER_LIMIT_FOR_LIVE_TRADING_BASKETBALL));
constraintsMap.set(Sport.HOCKEY, Number(process.env.PERIOD_LIMIT_FOR_LIVE_TRADING_HOCKEY));
constraintsMap.set(Sport.BASEBALL, Number(process.env.INNING_LIMIT_FOR_LIVE_TRADING_BASEBALL));
constraintsMap.set(Sport.SOCCER, Number(process.env.MINUTE_LIMIT_FOR_LIVE_TRADING_FOOTBALL));

describe("Check contraints", () => {
  it("checks NBA contraints for quarter and allow game", () => {
    const passingConstraintsObject = checkGameContraints(nbaScoresResponse, League.NBA, constraintsMap);

    expect(passingConstraintsObject.allow).toBe(true);
  });
});

describe("Check contraints", () => {
  it("checks MLB contraints for inning and block game", () => {
    const passingConstraintsObject = checkGameContraints(mlbScoresResponse, League.MLB, constraintsMap);

    expect(passingConstraintsObject.allow).toBe(false);
  });
});

describe("Check contraints", () => {
  it("checks soccer contraints for game clock", () => {
    const passingConstraintsObject = checkGameContraints(soccerScoresResponse, League.UEFA_EURO, constraintsMap);

    expect(passingConstraintsObject.allow).toBe(true);
  });
});

describe("Check contraints", () => {
  it("checks soccer contraints for halftime", () => {
    const passingConstraintsObject = checkGameContraints(
      soccerScoresHalftimeResponse,
      League.UEFA_EURO,
      constraintsMap,
    );

    expect(passingConstraintsObject.allow).toBe(true);
  });
});

describe("Check contraints", () => {
  it("checks tennis contraints for result", () => {
    const passingConstraintsObject = checkGameContraints(
      tennisScoresATPResponse,
      League.TENNIS_MASTERS,
      constraintsMap,
    );

    expect(passingConstraintsObject.allow).toBe(false);
  });
});
