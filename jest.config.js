module.exports = {
  verbose: true,
  setupFilesAfterEnv: ["./jest/jestInitialSetup.js"],
  collectCoverage: true,
  collectCoverageFrom: ["overtimeV2Api/**/*.js"],
  coveragePathIgnorePatterns: ["contracts", "test"],
};
