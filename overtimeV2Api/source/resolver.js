require("dotenv").config();

const redis = require("redis");
const { delay } = require("../utils/general");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const { getProvider } = require("../utils/provider");
const KEYS = require("../../redis/redis-keys");
const { NETWORK } = require("../constants/networks");
const { ethers } = require("ethers");
const { STATUS, ResultType, OverUnderType, MarketType, MarketTypeMap } = require("../constants/markets");

async function processResolve() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("resolve markets");
          await resolveMarkets(NETWORK.OptimismSepolia);
          const endTime = new Date().getTime();
          console.log(`=== Seconds for resolving markets: ${((endTime - startTime) / 1000).toFixed(0)} ===`);
        } catch (error) {
          console.log("resolve markets error: ", error);
        }

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

function getOpenMarketsMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS, function (err, obj) {
      const openMarketsMap = new Map(JSON.parse(obj));
      resolve(openMarketsMap);
    });
  });
}

function getClosedMarketsMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS, function (err, obj) {
      const closedMarketsMap = new Map(JSON.parse(obj));
      resolve(closedMarketsMap);
    });
  });
}

function getGamesInfoMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
      const gamesInfoMap = new Map(JSON.parse(obj));
      resolve(gamesInfoMap);
    });
  });
}

async function resolveMarkets(network) {
  const openMarketsMap = await getOpenMarketsMap();

  const allOpenMarkets = Array.from(openMarketsMap.values());
  const allOpenGameIds = allOpenMarkets.map((market) => market.gameId);

  const provider = getProvider(network);
  const sportsAmmData = new ethers.Contract(
    sportsAMMV2DataContract.addresses[network],
    sportsAMMV2DataContract.abi,
    provider,
  );

  let emptyArrays = Array(allOpenGameIds.length).fill(0);

  const areMarketsResolved = await sportsAmmData.areMarketsResolved(
    allOpenGameIds,
    emptyArrays,
    emptyArrays,
    emptyArrays,
  );
  const readyForResolveGameIds = allOpenGameIds.filter((_, index) => areMarketsResolved[index]);

  emptyArrays = Array(readyForResolveGameIds.length).fill(0);
  const resultsForMarkets = await sportsAmmData.getResultsForMarkets(readyForResolveGameIds, emptyArrays, emptyArrays);

  const gamesInfoMap = await getGamesInfoMap();
  const closedMarketsMap = await getClosedMarketsMap();

  console.log(`Total ready for resolve markets: ${readyForResolveGameIds.length}`);
  for (let i = 0; i < readyForResolveGameIds.length; i++) {
    const readyForResolveGameId = readyForResolveGameIds[i];
    const ongoingMarket = openMarketsMap.get(readyForResolveGameId);

    ongoingMarket.status === STATUS.Resolved;
    ongoingMarket.isResolved = true;
    ongoingMarket.isCanceled = false;
    ongoingMarket.isPaused = false;
    ongoingMarket.isOpen = false;
    ongoingMarket.statusCode = "resolved";
    ongoingMarket.winningPositions = resultsForMarkets[i];

    const gameInfo = gamesInfoMap.get(ongoingMarket.gameId);

    const homeTeam = !!gameInfo && gameInfo.find((team) => team.isHome);
    const homeScore = homeTeam ? homeTeam.score : 0;
    const homeScoreByPeriod = homeTeam ? homeTeam.scoreByPeriod : [];
    const awayTeam = !!gameInfo && gameInfo.find((team) => !team.isHome);
    const awayScore = awayTeam ? awayTeam.score : 0;
    const awayScoreByPeriod = awayTeam ? awayTeam.scoreByPeriod : [];

    ongoingMarket.homeScore = homeScore;
    ongoingMarket.awayScore = awayScore;
    ongoingMarket.homeScoreByPeriod = homeScoreByPeriod;
    ongoingMarket.awayScoreByPeriod = awayScoreByPeriod;

    closedMarketsMap.set(readyForResolveGameId, ongoingMarket);
  }

  const allClosedMarkets = Array.from(closedMarketsMap.values());

  console.log(`Total resolved markets: ${allClosedMarkets.length}`);
  for (let i = 0; i < allClosedMarkets.length; i++) {
    const childMarkets = allClosedMarkets[i].childMarkets.filter((market) => !market.isPlayerPropsMarket);

    const childMarketsGameIds = childMarkets.map((childMarket) => childMarket.gameId);
    const childMarketsTypeIds = childMarkets.map((childMarket) => childMarket.typeId);
    const childMarketsPlayerIds = childMarkets.map((childMarket) => childMarket.playerProps.playerId);
    const childMarketsLines = childMarkets.map((childMarket) => childMarket.line * 100);

    const [areMarketsResolved, resultsForMarkets] = await Promise.all([
      sportsAmmData.areMarketsResolved(
        childMarketsGameIds,
        childMarketsTypeIds,
        childMarketsPlayerIds,
        childMarketsLines,
      ),
      sportsAmmData.getResultsForMarkets(childMarketsGameIds, childMarketsTypeIds, childMarketsPlayerIds),
    ]);

    for (let j = 0; j < childMarkets.length; j++) {
      const childMarket = childMarkets[j];
      if (areMarketsResolved[j]) {
        childMarket.status === STATUS.Resolved;
        childMarket.isResolved = true;
        childMarket.isCanceled = false;
        childMarket.isPaused = false;
        childMarket.isOpen = false;
        childMarket.statusCode = "resolved";

        const resultType = MarketTypeMap[childMarket.typeId].resultType;
        if (resultType === ResultType.EXACT_POSITION) {
          childMarket.winningPositions = resultsForMarkets[j];
        } else if (resultType === ResultType.OVER_UNDER) {
          const resultLine = Number(resultsForMarkets[j][0]) / 100;
          if (resultLine == childMarket.line) {
            childMarket.isResolved = false;
            childMarket.isCanceled = true;
            childMarket.winningPositions = [];
          } else {
            const winningPosition =
              childMarket.typeId === MarketType.SPREAD
                ? resultLine < childMarket.line
                  ? OverUnderType.Over
                  : OverUnderType.Under
                : resultLine > childMarket.line
                ? OverUnderType.Over
                : OverUnderType.Under;
            childMarket.winningPositions = [winningPosition];
          }
        }
      }
    }

    closedMarketsMap.set(allClosedMarkets[i].gameId, allClosedMarkets[i]);
  }

  redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS, JSON.stringify([...closedMarketsMap]), function () {});
}

module.exports = {
  processResolve,
};
