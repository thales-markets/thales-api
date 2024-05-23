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
          console.log("process markets");
          await resolveMarkets(NETWORK.OptimismSepolia);
          const endTime = new Date().getTime();
          console.log(`Seconds for resolving markets: ${((endTime - startTime) / 1000).toFixed(0)}`);
        } catch (error) {
          console.log("markets error: ", error);
        }

        await delay(5 * 60 * 1000);
      }
    }, 3000);
  }
}

async function resolveMarkets(network) {
  redisClient.get(KEYS.OVERTIME_V2_ONGOING_MARKETS, async function (err, obj) {
    const ongoingMarketsMap = new Map(JSON.parse(obj));

    const allOngoingMarkets = Array.from(ongoingMarketsMap.values());
    const allOngoingGameIds = allOngoingMarkets.map((market) => market.gameId);

    const provider = getProvider(network);
    const sportsAmmData = new ethers.Contract(
      sportsAMMV2DataContract.addresses[network],
      sportsAMMV2DataContract.abi,
      provider,
    );

    let emptyArrays = Array(allOngoingGameIds.length).fill(0);

    const areMarketsResolved = await sportsAmmData.areMarketsResolved(
      allOngoingGameIds,
      emptyArrays,
      emptyArrays,
      emptyArrays,
    );
    const readyForResolveGameIds = allOngoingGameIds.filter((_, index) => areMarketsResolved[index]);

    emptyArrays = Array(readyForResolveGameIds.length).fill(0);
    const resultsForMarkets = await sportsAmmData.getResultsForMarkets(
      readyForResolveGameIds,
      emptyArrays,
      emptyArrays,
    );

    redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO, function (err, obj) {
      const gamesInfo = new Map(JSON.parse(obj));

      redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS, async function (err, obj) {
        const closedMarketsMap = new Map(JSON.parse(obj));

        for (let i = 0; i < readyForResolveGameIds.length; i++) {
          const readyForResolveGameId = readyForResolveGameIds[i];
          const ongoingMarket = ongoingMarketsMap.get(readyForResolveGameId);

          ongoingMarket.status === STATUS.Resolved;
          ongoingMarket.isResolved = true;
          ongoingMarket.isCanceled = false;
          ongoingMarket.isPaused = false;
          ongoingMarket.isOpen = false;
          ongoingMarket.statusCode = "resolved";
          ongoingMarket.results = resultsForMarkets[i];

          const gameInfo = gamesInfo.get(ongoingMarket.gameId);

          const homeTeam = !!gameInfo && gameInfo.find((team) => team.isHome);
          const homeScore = homeTeam ? homeTeam.score : 0;
          const awayTeam = !!gameInfo && gameInfo.find((team) => !team.isHome);
          const awayScore = awayTeam ? awayTeam.score : 0;

          ongoingMarket.homeScore = homeScore;
          ongoingMarket.awayScore = awayScore;

          closedMarketsMap.set(readyForResolveGameId, ongoingMarket);
        }

        const allClosedMarkets = Array.from(closedMarketsMap.values());

        console.log("Total resolved markets", allClosedMarkets.length);
        for (let i = 0; i < allClosedMarkets.length; i++) {
          const childMarkets = allClosedMarkets[i].childMarkets.filter((market) => !market.isPlayerPropsMarket);

          const childMarketsGameIds = childMarkets.map((childMarket) => childMarket.gameId);
          const childMarketsTypeIds = childMarkets.map((childMarket) => childMarket.typeId);
          const childMarketsPlayerIds = childMarkets.map((childMarket) => childMarket.playerProps.playerId);
          const childMarketsLines = childMarkets.map((childMarket) => childMarket.line * 100);

          const areMarketsResolved = await sportsAmmData.areMarketsResolved(
            childMarketsGameIds,
            childMarketsTypeIds,
            childMarketsPlayerIds,
            childMarketsLines,
          );

          const resultsForMarkets = await sportsAmmData.getResultsForMarkets(
            childMarketsGameIds,
            childMarketsTypeIds,
            childMarketsPlayerIds,
          );

          for (let j = 0; j < childMarkets.length; j++) {
            if (areMarketsResolved[j]) {
              childMarkets[j].status === STATUS.Resolved;
              childMarkets[j].isResolved = true;
              childMarkets[j].isCanceled = false;
              childMarkets[j].isPaused = false;
              childMarkets[j].isOpen = false;
              childMarkets[j].statusCode = "resolved";

              const resultType = MarketTypeMap[childMarkets[j].typeId].resultType;
              if (resultType === ResultType.EXACT_POSITION) {
                childMarkets[j].results = resultsForMarkets[j];
              } else if (resultType === ResultType.OVER_UNDER) {
                const resultLine = Number(resultsForMarkets[j][0]) / 100;
                if (resultLine == childMarkets[j].line) {
                  childMarkets[j].isResolved = false;
                  childMarkets[j].isCanceled = true;
                  childMarkets[j].results = [];
                } else {
                  const winningPosition =
                    childMarkets[j].typeId === MarketType.SPREAD
                      ? resultLine < childMarkets[j].line
                        ? OverUnderType.Over
                        : OverUnderType.Under
                      : resultLine > childMarkets[j].line
                      ? OverUnderType.Over
                      : OverUnderType.Under;
                  childMarkets[j].results = [winningPosition];
                }
              }
            }
          }

          closedMarketsMap.set(allClosedMarkets[i].gameId, allClosedMarkets[i]);
        }

        redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS, JSON.stringify([...closedMarketsMap]), function () {});
      });
    });
  });
}

module.exports = {
  processResolve,
};
