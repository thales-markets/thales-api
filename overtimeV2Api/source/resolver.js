require("dotenv").config();

const redis = require("redis");
const { delay } = require("../utils/general");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const { getProvider } = require("../utils/provider");
const KEYS = require("../../redis/redis-keys");
const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { ethers } = require("ethers");
const { STATUS, ResultType, OverUnderType, MarketType, MarketTypeMap } = require("../constants/markets");
const { getIsCombinedPositionsMarket } = require("../utils/markets");

async function processResolve() {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    console.log("Resolver: create client from index");

    redisClient.on("error", function (error) {
      console.error(error);
    });
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Resolver: resolve markets");
          await resolveMarkets(NETWORK.Optimism);
          // await resolveMarkets(NETWORK.Arbitrum),
          // await resolveMarkets(NETWORK.Base),
          await resolveMarkets(NETWORK.OptimismSepolia);
          const endTime = new Date().getTime();
          console.log(`Resolver: === Seconds for resolving markets: ${((endTime - startTime) / 1000).toFixed(0)} ===`);
        } catch (error) {
          console.log("Resolver: resolve markets error: ", error);
        }

        await delay(60 * 1000);
      }
    }, 3000);
  }
}

function getOpenMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network], function (err, obj) {
      const openMarketsMap = new Map(JSON.parse(obj));
      resolve(openMarketsMap);
    });
  });
}

function getClosedMarketsMap(network) {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], function (err, obj) {
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
  const openMarketsMap = await getOpenMarketsMap(network);
  const closedMarketsMap = await getClosedMarketsMap(network);

  const provider = getProvider(network);
  const sportsAmmData = new ethers.Contract(
    sportsAMMV2DataContract.addresses[network],
    sportsAMMV2DataContract.abi,
    provider,
  );

  const allOpenMarkets = Array.from(openMarketsMap.values());
  const allOpenGameIds = allOpenMarkets.map((market) => market.gameId);

  if (allOpenGameIds.length > 0) {
    let emptyArrays = Array(allOpenGameIds.length).fill(0);

    // check are there any unresolved open markets
    const areMarketsResolved = await sportsAmmData.areMarketsResolved(
      allOpenGameIds,
      emptyArrays,
      emptyArrays,
      emptyArrays,
    );
    const readyForResolveGameIds = allOpenGameIds.filter((_, index) => areMarketsResolved[index]);

    if (readyForResolveGameIds.length > 0) {
      emptyArrays = Array(readyForResolveGameIds.length).fill(0);
      // get results for unresolved markets
      const resultsForMarkets = await sportsAmmData.getResultsForMarkets(
        readyForResolveGameIds,
        emptyArrays,
        emptyArrays,
      );

      const gamesInfoMap = await getGamesInfoMap();

      console.log(`Resolver ${NETWORK_NAME[network]}: Total ready for resolve: ${readyForResolveGameIds.length}`);
      // resolve parent markets - update status and move under closed markets map
      for (let i = 0; i < readyForResolveGameIds.length; i++) {
        const readyForResolveGameId = readyForResolveGameIds[i];
        const ongoingMarket = openMarketsMap.get(readyForResolveGameId);

        if (resultsForMarkets[i].length > 0) {
          ongoingMarket.status === STATUS.Resolved;
          ongoingMarket.isResolved = true;
          ongoingMarket.isCancelled = false;
          ongoingMarket.statusCode = "resolved";
        } else {
          ongoingMarket.status === STATUS.Cancelled;
          ongoingMarket.isResolved = false;
          ongoingMarket.isCancelled = true;
          ongoingMarket.statusCode = "cancelled";
        }
        ongoingMarket.isPaused = false;
        ongoingMarket.isOpen = false;
        ongoingMarket.winningPositions = resultsForMarkets[i];

        const gameInfo = gamesInfoMap.get(ongoingMarket.gameId);

        const homeTeam = !!gameInfo && gameInfo.teams.find((team) => team.isHome);
        const homeScore = homeTeam ? homeTeam.score : 0;
        const homeScoreByPeriod = homeTeam ? homeTeam.scoreByPeriod : [];
        const awayTeam = !!gameInfo && gameInfo.teams.find((team) => !team.isHome);
        const awayScore = awayTeam ? awayTeam.score : 0;
        const awayScoreByPeriod = awayTeam ? awayTeam.scoreByPeriod : [];

        ongoingMarket.homeScore = homeScore;
        ongoingMarket.awayScore = awayScore;
        ongoingMarket.homeScoreByPeriod = homeScoreByPeriod;
        ongoingMarket.awayScoreByPeriod = awayScoreByPeriod;

        closedMarketsMap.set(readyForResolveGameId, ongoingMarket);
      }
    }
  }

  // get all unresolved closed markets - has some child markets unresolved
  const allUnresolvedClosedMarkets = Array.from(closedMarketsMap.values()).filter(
    (market) => !market.isWholeGameResolved,
  );

  console.log(`Resolver ${NETWORK_NAME[network]}: Total unresolved markets: ${allUnresolvedClosedMarkets.length}`);
  //
  for (let i = 0; i < allUnresolvedClosedMarkets.length; i++) {
    // get all unresolved child markets (except combined positions)
    const unresolvedChildMarkets = allUnresolvedClosedMarkets[i].childMarkets.filter(
      // TODO: remove condition once uint24 for playerId is deployed
      (market) => !market.isResolved && !market.isCancelled && !getIsCombinedPositionsMarket(market.typeId),
    );

    if (unresolvedChildMarkets.length > 0) {
      const unresolvedChildMarketsGameIds = unresolvedChildMarkets.map((childMarket) => childMarket.gameId);
      const unresolvedChildMarketsTypeIds = unresolvedChildMarkets.map((childMarket) => childMarket.typeId);
      const unresolvedChildMarketsPlayerIds = unresolvedChildMarkets.map(
        (childMarket) => childMarket.playerProps.playerId,
      );
      const unresolvedChildMarketsLines = unresolvedChildMarkets.map((childMarket) => childMarket.line * 100);

      const [areMarketsResolved, resultsForMarkets] = await Promise.all([
        sportsAmmData.areMarketsResolved(
          unresolvedChildMarketsGameIds,
          unresolvedChildMarketsTypeIds,
          unresolvedChildMarketsPlayerIds,
          unresolvedChildMarketsLines,
        ),
        sportsAmmData.getResultsForMarkets(
          unresolvedChildMarketsGameIds,
          unresolvedChildMarketsTypeIds,
          unresolvedChildMarketsPlayerIds,
        ),
      ]);

      // resolve child markets (except combined positions)
      for (let j = 0; j < unresolvedChildMarkets.length; j++) {
        const unresolvedChildMarket = unresolvedChildMarkets[j];
        if (areMarketsResolved[j]) {
          if (resultsForMarkets[j].length > 0) {
            unresolvedChildMarket.status === STATUS.Resolved;
            unresolvedChildMarket.isResolved = true;
            unresolvedChildMarket.isCancelled = false;
            unresolvedChildMarket.statusCode = "resolved";

            const resultType = MarketTypeMap[unresolvedChildMarket.typeId].resultType;
            if (resultType === ResultType.EXACT_POSITION) {
              unresolvedChildMarket.winningPositions = resultsForMarkets[j];
            } else if (resultType === ResultType.OVER_UNDER) {
              const resultLine = Number(resultsForMarkets[j][0]) / 100;
              if (resultLine == unresolvedChildMarket.line) {
                unresolvedChildMarket.status === STATUS.Cancelled;
                unresolvedChildMarket.isResolved = false;
                unresolvedChildMarket.isCancelled = true;
                unresolvedChildMarket.statusCode = "cancelled";
                unresolvedChildMarket.winningPositions = [];
              } else {
                const winningPosition =
                  unresolvedChildMarket.typeId === MarketType.SPREAD
                    ? resultLine < unresolvedChildMarket.line
                      ? OverUnderType.Over
                      : OverUnderType.Under
                    : resultLine > unresolvedChildMarket.line
                    ? OverUnderType.Over
                    : OverUnderType.Under;
                unresolvedChildMarket.winningPositions = [winningPosition];
              }
            }
          } else {
            unresolvedChildMarket.status === STATUS.Cancelled;
            unresolvedChildMarket.isResolved = false;
            unresolvedChildMarket.isCancelled = true;
            unresolvedChildMarket.statusCode = "cancelled";
            unresolvedChildMarket.winningPositions = [];
          }
          unresolvedChildMarket.isPaused = false;
          unresolvedChildMarket.isOpen = false;
        }
      }
    }

    // get all unresolvded combined positions child markets
    const cpUnresolvedChildMarkets = allUnresolvedClosedMarkets[i].childMarkets.filter(
      (market) => !market.isResolved && !market.isCancelled && getIsCombinedPositionsMarket(market.typeId),
    );
    for (let j = 0; j < cpUnresolvedChildMarkets.length; j++) {
      const cpUnresolvdeCildMarket = cpUnresolvedChildMarkets[j];

      const winningPositions = [];
      let status = STATUS.Cancelled;
      for (let j = 0; j < cpUnresolvdeCildMarket.combinedPositions.length; j++) {
        const combinedPositions = cpUnresolvdeCildMarket.combinedPositions[j];

        let hasCancelledPosition = false;
        let hasOpenPosition = false;
        let hasLosingPosition = false;
        for (let k = 0; k < combinedPositions.length; k++) {
          const combinedPosition = combinedPositions[k];
          const singleMarket = [...allUnresolvedClosedMarkets[i].childMarkets, allUnresolvedClosedMarkets[i]].find(
            (singleMarket) =>
              singleMarket.typeId === combinedPosition.typeId && singleMarket.line === combinedPosition.line,
          );
          if (singleMarket.isResolved && !singleMarket.winningPositions.includes(combinedPosition.position)) {
            hasLosingPosition = true;
            break;
          }
          hasOpenPosition = singleMarket.isOpen || singleMarket.isPaused;
          hasCancelledPosition = singleMarket.isCancelled;
        }

        // TODO: check logic with multiple (or zero) winning positions
        if (hasLosingPosition) {
          status = STATUS.Resolved;
        } else {
          if (!hasCancelledPosition) {
            if (hasOpenPosition) {
              status = STATUS.Open;
              break;
            } else {
              status = STATUS.Resolved;
              winningPositions.push(j);
            }
          }
        }
      }

      if (status === STATUS.Resolved) {
        cpUnresolvdeCildMarket.status === STATUS.Resolved;
        cpUnresolvdeCildMarket.isResolved = true;
        cpUnresolvdeCildMarket.isCancelled = false;
        cpUnresolvdeCildMarket.statusCode = "resolved";
        cpUnresolvdeCildMarket.isPaused = false;
        cpUnresolvdeCildMarket.isOpen = false;
        cpUnresolvdeCildMarket.winningPositions = winningPositions;
      } else if (status === STATUS.Cancelled) {
        cpUnresolvdeCildMarket.status === STATUS.Cancelled;
        cpUnresolvdeCildMarket.isResolved = false;
        cpUnresolvdeCildMarket.isCancelled = true;
        cpUnresolvdeCildMarket.isPaused = false;
        cpUnresolvdeCildMarket.isOpen = false;
        cpUnresolvdeCildMarket.statusCode = "cancelled";
        cpUnresolvdeCildMarket.winningPositions = [];
      }
    }

    allUnresolvedClosedMarkets[i].isWholeGameResolved = allUnresolvedClosedMarkets[i].childMarkets.every(
      (childMarket) => childMarket.isResolved || childMarket.isCancelled,
    );
    closedMarketsMap.set(allUnresolvedClosedMarkets[i].gameId, allUnresolvedClosedMarkets[i]);
  }

  redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], JSON.stringify([...closedMarketsMap]), function () {});
}

module.exports = {
  processResolve,
};
