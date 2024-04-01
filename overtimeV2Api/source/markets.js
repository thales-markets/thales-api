require("dotenv").config();

const redis = require("redis");
const { delay } = require("../../overtimeApi/utils/general");
const { bigNumberFormatter } = require("../../overtimeApi/utils/formatters");
// const markets = require("./treeMarketsAndHashes.json");
const {
  fixDuplicatedTeamName,
  getLeagueNameById,
  getIsOneSideMarket,
  getIsOneSidePlayerPropsMarket,
  formatMarketOdds,
  getIsYesNoPlayerPropsMarket,
  getIsEnetpulseSport,
  getIsPlayerPropsMarket,
} = require("../../overtimeApi/utils/markets");
const { SPORTS_MAP } = require("../../overtimeApi/constants/tags");
const { MARKET_TYPE, ODDS_TYPE, CHILD_ID, STATUS } = require("../../overtimeApi/constants/markets");
const KEYS = require("../../redis/redis-keys");
const axios = require("axios");

let marketsMap = new Map();

async function processMarkets() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          console.log("process markets");
          await processAllMarkets();
        } catch (error) {
          console.log("markets error: ", error);
        }

        await delay(10 * 1000);
      }
    }, 3000);
  }
}

const packMarket = (market) => {
  const leagueId = market.sportId;
  const isEnetpulseSport = getIsEnetpulseSport(leagueId);
  const type = MARKET_TYPE[market.typeId];

  return {
    gameId: market.gameId,
    sport: SPORTS_MAP[leagueId],
    leagueId: leagueId,
    leagueName: getLeagueNameById(leagueId),
    typeId: market.typeId,
    type: type,
    maturity: market.maturity,
    maturityDate: new Date(market.maturity * 1000),
    homeTeam: fixDuplicatedTeamName(market.homeTeam, isEnetpulseSport),
    awayTeam: fixDuplicatedTeamName(market.awayTeam, isEnetpulseSport),
    homeScore: market.homeScore || 0,
    awayScore: market.awayScore || 0,
    finalResult: market.finalResult || 0,
    status: market.status,
    isOpen: market.status === STATUS.Open,
    isResolved: market.status === STATUS.Resolved,
    isCanceled: market.status === STATUS.Canceled,
    isPaused: market.status === STATUS.Paused,
    isOneSideMarket: getIsOneSideMarket(leagueId),
    line: Number(market.line) / 100,
    isPlayerPropsMarket: getIsPlayerPropsMarket(market.typeId),
    isOneSidePlayerPropsMarket: getIsOneSidePlayerPropsMarket(market.typeId),
    isYesNoPlayerPropsMarket: getIsYesNoPlayerPropsMarket(market.typeId),
    playerProps: {
      playerId: market.playerProps.playerId,
      playerName: market.playerProps.playerName,
    },
    combinedPositions: market.combinedPositions
      ? market.combinedPositions.map((combinedPosition) => {
          return combinedPosition.map((position) => {
            return {
              ...position,
              line: position.line / 100,
            };
          });
        })
      : new Array(market.odds.length).fill([]),
    odds: market.odds.map((odd) => {
      const formattedOdds = Number(odd) > 0 ? bigNumberFormatter(odd) : 0;
      return {
        american: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.American) : 0,
        decimal: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.Decimal) : 0,
        normalizedImplied: formattedOdds ? formatMarketOdds(formattedOdds, ODDS_TYPE.AMM) : 0,
      };
    }),
    proof: market.proof,
  };
};

const loadMarkets = async () => {
  const repoOwner = process.env.GH_REPO_OWNER;
  const repoName = process.env.GH_REPO_NAME;
  const token = process.env.GH_TOKEN;
  const folderName = process.env.GH_FOLDER_NAME;
  const listFileName = process.env.GH_LIST_FILE_NAME;

  const listFilePath = `${folderName}/${listFileName}`;
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/`;

  const response = await axios.get(`${apiUrl}${listFilePath}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  const listContent = Buffer.from(response.data.content, "base64").toString("utf8");

  const files = listContent ? listContent.split(",").map((f) => f.trim()) : [];

  let markets = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const marketsResponse = await axios.get(`${apiUrl}${folderName}/${file}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const marketsContent = Buffer.from(marketsResponse.data.content, "base64").toString("utf8");
    markets = [...markets, ...JSON.parse(marketsContent)];
  }

  return markets;
};

const mapMarkets = async () => {
  const mappedOpenMarkets = [];
  const mappedOngoingMarkets = [];
  const mappedResolvedMarkets = [];
  const mappedCanceledMarkets = [];
  const mappedPausedMarkets = [];

  const markets = await loadMarkets();

  markets.forEach((market) => {
    let packedMarket = packMarket(market);
    packedMarket.childMarkets = [];
    market.childMarkets.forEach((childMarket) => {
      let packedChildMarket = packMarket(childMarket);
      packedMarket.childMarkets.push(packedChildMarket);
    });

    const isStarted = packedMarket.maturityDate < new Date();

    if (packedMarket.isOpen && !isStarted) {
      mappedOpenMarkets.push(packedMarket);
    }
    if ((packedMarket.isOpen || packedMarket.isPaused) && isStarted) {
      mappedOngoingMarkets.push(packedMarket);
    }
    if (packedMarket.isResolved) {
      mappedResolvedMarkets.push(packedMarket);
    }
    if (packedMarket.isCanceled) {
      mappedCanceledMarkets.push(packedMarket);
    }
    if (packedMarket.isPaused) {
      mappedPausedMarkets.push(packedMarket);
    }
  });

  return { mappedOpenMarkets, mappedOngoingMarkets, mappedResolvedMarkets, mappedCanceledMarkets, mappedPausedMarkets };
};

async function processAllMarkets() {
  const mappedMarkets = await mapMarkets();
  marketsMap.set("open", mappedMarkets.mappedOpenMarkets);
  marketsMap.set("ongoing", mappedMarkets.mappedOngoingMarkets);
  marketsMap.set("resolved", mappedMarkets.mappedResolvedMarkets);
  marketsMap.set("canceled", mappedMarkets.mappedCanceledMarkets);
  marketsMap.set("paused", mappedMarkets.mappedPausedMarkets);
  redisClient.set(KEYS.OVERTIME_V2_MARKETS, JSON.stringify([...marketsMap]), function () {});
}

module.exports = {
  processMarkets,
};
