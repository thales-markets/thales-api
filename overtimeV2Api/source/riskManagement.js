require("dotenv").config();
const axios = require("axios");
const { redisClient } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const { readCsvFromUrl } = require("../utils/csvReader");
const { delay } = require("../utils/general");

const processRiskManagement = async () => {
  if (process.env.REDIS_URL) {
    const isTestnet = process.env.IS_TESTNET === "true";
    const network = isTestnet ? "testnet" : "mainnets";

    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log(`Risk management ${network}: process all risks`);

          await processAllRisks(isTestnet);

          const endTime = new Date().getTime();
          const duration = ((endTime - startTime) / 1000).toFixed(0);
          console.log(`Risk management ${network}: === Seconds for processing all risks: ${duration} ===`);
        } catch (error) {
          console.log(`Risk management: processing data error: ${error}`);
        }

        await delay(60 * 1000); // 1 min
      }
    }, 3000);
  }
};

const processAllRisks = async (isTestnet) => {
  const TIMEOUT = Number(process.env.GITHUB_API_TIMEOUT);

  const teamsMapPromise = fetchTeamsMap(TIMEOUT);
  const bookmakersDataPromise = readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV, TIMEOUT);
  const spreadDataPromise = readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV, TIMEOUT);
  const liveLeaguesDataPromise = readCsvFromUrl(
    isTestnet ? process.env.GITHUB_URL_LIVE_LEAGUES_CSV_TESTNET : process.env.GITHUB_URL_LIVE_LEAGUES_CSV,
    TIMEOUT,
  );

  let teamsMap, bookmakersData, spreadData, leaguesData;
  try {
    [teamsMap, bookmakersData, spreadData, leaguesData] = await Promise.all([
      teamsMapPromise,
      bookmakersDataPromise,
      spreadDataPromise,
      liveLeaguesDataPromise,
    ]);

    redisClient.mSet([
      KEYS.RISK_MANAGEMENT_TEAMS_MAP,
      JSON.stringify(Array.from(teamsMap.entries())),
      KEYS.RISK_MANAGEMENT_BOOKMAKERS_DATA,
      JSON.stringify(bookmakersData),
      KEYS.RISK_MANAGEMENT_SPREAD_DATA,
      JSON.stringify(spreadData),
      isTestnet ? KEYS.RISK_MANAGEMENT_LEAGUES_DATA_TESTNET : KEYS.RISK_MANAGEMENT_LEAGUES_DATA,
      JSON.stringify(leaguesData),
    ]);
  } catch (e) {
    console.log(`Risk management: Fetching from Github config data error: ${e.message}`);
  }
};

const fetchTeamsMap = async (timeout) => {
  const teamsMappingJsonResponse = await axios.get(process.env.GITHUB_URL_LIVE_TEAMS_MAPPING, { timeout });

  const teamsMappingJsonData = teamsMappingJsonResponse.data;

  const teamsMap = new Map();
  Object.keys(teamsMappingJsonData).forEach((key) => {
    teamsMap.set(key.toString(), teamsMappingJsonData[key].toString());
  });

  return teamsMap;
};

module.exports = {
  processRiskManagement,
};
