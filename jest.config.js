module.exports = {
  setupFilesAfterEnv: ["./jest/jestInitialSetup.js"],
  collectCoverage: true,
  collectCoverageFrom: ["overtimeV2Api/**/*.js"],
  coveragePathIgnorePatterns: ["contracts", "test"],
};
