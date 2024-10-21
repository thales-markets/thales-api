require("dotenv").config();
const axios = require("axios");
const { redisClient } = require("../../redis/client");
const KEYS = require("../../redis/redis-keys");
const { readCsvFromUrl } = require("../utils/csvReader");
const teamsMapping = require("../assets/teamsMapping.json");

const { delay } = require("../utils/general");

const processRiskManagement = async () => {
  if (process.env.REDIS_URL) {
    setTimeout(async () => {
      while (true) {
        try {
          await processAllRisks();
        } catch (error) {
          console.log(`Risk management: processing data error: ${error}`);
        }

        await delay(30 * 1000);
      }
    }, 3000);
  }
};

const processAllRisks = async () => {
  const TIMEOUT = process.env.GITHUB_API_TIMEOUT;

  const teamsMapPromise = fetchTeamsMap(TIMEOUT);
  const bookmakersDataPromise = readCsvFromUrl(process.env.GITHUB_URL_LIVE_BOOKMAKERS_CSV, TIMEOUT);
  const spreadDataPromise = readCsvFromUrl(process.env.GITHUB_URL_SPREAD_CSV, TIMEOUT);

  let teamsMap, bookmakersData, spreadData;
  try {
    [teamsMap, bookmakersData, spreadData] = await Promise.all([
      teamsMapPromise,
      bookmakersDataPromise,
      spreadDataPromise,
    ]);

    redisClient.mset(
      [
        KEYS.RISK_MANAGEMENT_TEAMS_MAP,
        JSON.stringify(Array.from(teamsMap.entries())),
        KEYS.RISK_MANAGEMENT_BOOKMAKERS_DATA,
        JSON.stringify(bookmakersData),
        KEYS.RISK_MANAGEMENT_SPREAD_DATA,
        JSON.stringify(spreadData),
      ],
      () => {},
    );
  } catch (e) {
    console.log(`Risk management: Fetching from Github config data error: ${e.message}`);
  }
};

const fetchTeamsMap = async (timeout) => {
  const teamsMap = new Map();

  const teamsMappingJsonResponse = await axios.get(process.env.GITHUB_URL_LIVE_TEAMS_MAPPING, { timeout });

  let teamsMappingJson = teamsMappingJsonResponse.data;

  if (teamsMappingJson === undefined || Object.keys(teamsMappingJson).length === 0) {
    teamsMappingJson = teamsMapping;
  }

  Object.keys(teamsMappingJson).forEach(function (key) {
    teamsMap.set(key.toString(), teamsMappingJson[key].toString());
  });

  return teamsMap;
};

module.exports = {
  processRiskManagement,
};
