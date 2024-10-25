const { redisClient } = require("../../redis/client");
require("dotenv").config();

const { delay } = require("../utils/general");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const { getProvider } = require("../utils/provider");
const KEYS = require("../../redis/redis-keys");
const { NETWORK, NETWORK_NAME } = require("../constants/networks");
const { ethers } = require("ethers");
const { Status, ResultType, OverUnderType, MarketTypeMap } = require("../constants/markets");
const {
  getIsCombinedPositionsMarket,
  isPlayerPropsMarket,
  isOneSidePlayerPropsMarket,
  isYesNoPlayerPropsMarket,
} = require("../utils/markets");

async function processResolve() {
  if (process.env.REDIS_URL) {
    setTimeout(async () => {
      while (true) {
        try {
          const startTime = new Date().getTime();
          console.log("Resolver: resolve markets");
          await resolveMarkets(NETWORK.Optimism);
          await resolveMarkets(NETWORK.Arbitrum);
          // await resolveMarkets(NETWORK.Base);
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

async function getClosedMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_CLOSED_MARKETS[network]);
  const closedMarketsMap = new Map(JSON.parse(obj));
  return closedMarketsMap;
}

async function getOpenMarketsMap(network) {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_OPEN_MARKETS[network]);
  const openMarkets = new Map(JSON.parse(obj));
  return openMarkets;
}

async function getGamesInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
}

async function resolveMarkets(network) {
  const openMarketsMap = await getOpenMarketsMap(network);
  const closedMarketsMap = await getClosedMarketsMap(network);
  const forceResolve = process.env.FORCE_RESOLVE === "true";
  const resolverNumberOfDaysInPast = Number(process.env.RESOLVER_NUMBER_OF_DAYS_IN_PAST);

  const provider = getProvider(network);
  const sportsAmmData = new ethers.Contract(
    sportsAMMV2DataContract.addresses[network],
    sportsAMMV2DataContract.abi,
    provider,
  );

  const allOpenMarkets = Array.from(openMarketsMap.values());
  const allOpenFixtureIds = allOpenMarkets.map((market) => market.fixtureId);

  if (allOpenFixtureIds.length > 0) {
    let emptyArrays = Array(allOpenFixtureIds.length).fill(0);
    const gamesInfoMap = await getGamesInfoMap();

    // check are there any unresolved open markets
    const [areMarketsResolved, onlyActiveFixtureIds] = await Promise.all([
      sportsAmmData.areMarketsResolved(allOpenFixtureIds, emptyArrays, emptyArrays, emptyArrays),
      sportsAmmData.getOnlyActiveGameIdsAndTicketsOf(allOpenFixtureIds, 0, allOpenFixtureIds.length),
    ]);
    const readyForResolveFixtureIds = allOpenFixtureIds.filter((_, index) => areMarketsResolved[index]);
    const activeFixtureIdsWithoutTickets = allOpenFixtureIds.filter(
      (fixtureId) => !onlyActiveFixtureIds.activeGameIds.includes(fixtureId),
    );

    if (readyForResolveFixtureIds.length > 0) {
      emptyArrays = Array(readyForResolveFixtureIds.length).fill(0);
      // get results for unresolved markets
      const resultsForMarkets = await sportsAmmData.getResultsForMarkets(
        readyForResolveFixtureIds,
        emptyArrays,
        emptyArrays,
      );

      console.log(`Resolver ${NETWORK_NAME[network]}: Total ready for resolve: ${readyForResolveFixtureIds.length}`);
      // resolve parent markets - update status and move under closed markets map
      for (let i = 0; i < readyForResolveFixtureIds.length; i++) {
        const readyForResolveFixtureId = readyForResolveFixtureIds[i];
        const ongoingMarket = openMarketsMap.get(readyForResolveFixtureId);

        if (resultsForMarkets[i].length > 0) {
          ongoingMarket.status = Status.RESOLVED;
          ongoingMarket.isResolved = true;
          ongoingMarket.isCancelled = false;
          ongoingMarket.statusCode = "resolved";
          ongoingMarket.proof = [];
        } else {
          ongoingMarket.status = Status.CANCELLED;
          ongoingMarket.isResolved = false;
          ongoingMarket.isCancelled = true;
          ongoingMarket.statusCode = "cancelled";
          ongoingMarket.proof = [];
        }
        ongoingMarket.isPaused = false;
        ongoingMarket.isOpen = false;
        ongoingMarket.winningPositions = resultsForMarkets[i];

        const gameInfo = gamesInfoMap.get(ongoingMarket.fixtureId);

        const homeTeam = !!gameInfo && gameInfo.teams && gameInfo.teams.find((team) => team.isHome);
        const homeScore = homeTeam?.score;
        const homeScoreByPeriod = homeTeam ? homeTeam.scoreByPeriod : [];

        const awayTeam = !!gameInfo && gameInfo.teams && gameInfo.teams.find((team) => !team.isHome);
        const awayScore = awayTeam?.score;
        const awayScoreByPeriod = awayTeam ? awayTeam.scoreByPeriod : [];

        ongoingMarket.homeScore = homeScore;
        ongoingMarket.awayScore = awayScore;
        ongoingMarket.homeScoreByPeriod = homeScoreByPeriod;
        ongoingMarket.awayScoreByPeriod = awayScoreByPeriod;

        closedMarketsMap.set(readyForResolveFixtureId, ongoingMarket);
      }
    }

    if (activeFixtureIdsWithoutTickets.length > 0) {
      for (let i = 0; i < activeFixtureIdsWithoutTickets.length; i++) {
        const activeFixtureIdWithoutTickets = activeFixtureIdsWithoutTickets[i];

        const gameInfo = gamesInfoMap.get(activeFixtureIdWithoutTickets);
        if (gameInfo && gameInfo.isGameFinished) {
          const ongoingMarket = openMarketsMap.get(activeFixtureIdWithoutTickets);
          ongoingMarket.isWholeGameResolved = true;
          ongoingMarket.noTickets = true;

          closedMarketsMap.set(activeFixtureIdWithoutTickets, ongoingMarket);
        }
      }
    }
  }

  const today = new Date();
  // APU takes timestamp argument in seconds
  const minMaturity = Math.round(
    new Date(new Date().setDate(today.getDate() - resolverNumberOfDaysInPast)).getTime() / 1000,
  );

  // get all unresolved closed markets - has some child markets unresolved
  const allUnresolvedClosedMarkets = Array.from(closedMarketsMap.values()).filter(
    (market) => (!market.isWholeGameResolved && Number(market.maturity) >= Number(minMaturity)) || forceResolve,
  );

  console.log(`Resolver ${NETWORK_NAME[network]}: Total unresolved markets: ${allUnresolvedClosedMarkets.length}`);
  //
  for (let i = 0; i < allUnresolvedClosedMarkets.length; i++) {
    // get all unresolved child markets (except combined positions)
    const unresolvedChildMarkets = allUnresolvedClosedMarkets[i].childMarkets.filter(
      (market) =>
        ((!market.isResolved && !market.isCancelled) || forceResolve) && !getIsCombinedPositionsMarket(market.typeId),
    );

    if (unresolvedChildMarkets.length > 0) {
      const unresolvedChildMarketsFixtureIds = unresolvedChildMarkets.map((childMarket) => childMarket.fixtureId);
      const unresolvedChildMarketsTypeIds = unresolvedChildMarkets.map((childMarket) => childMarket.typeId);
      const unresolvedChildMarketsPlayerIds = unresolvedChildMarkets.map(
        (childMarket) => childMarket.playerProps.playerId,
      );
      const unresolvedChildMarketsLines = unresolvedChildMarkets.map((childMarket) => childMarket.line * 100);

      const [areMarketsResolved, resultsForMarkets] = await Promise.all([
        sportsAmmData.areMarketsResolved(
          unresolvedChildMarketsFixtureIds,
          unresolvedChildMarketsTypeIds,
          unresolvedChildMarketsPlayerIds,
          unresolvedChildMarketsLines,
        ),
        sportsAmmData.getResultsForMarkets(
          unresolvedChildMarketsFixtureIds,
          unresolvedChildMarketsTypeIds,
          unresolvedChildMarketsPlayerIds,
        ),
      ]);

      // resolve child markets (except combined positions)
      for (let j = 0; j < unresolvedChildMarkets.length; j++) {
        const unresolvedChildMarket = unresolvedChildMarkets[j];
        const typeId = unresolvedChildMarket.typeId;

        if (areMarketsResolved[j]) {
          if (resultsForMarkets[j].length > 0) {
            unresolvedChildMarket.status = Status.RESOLVED;
            unresolvedChildMarket.isResolved = true;
            unresolvedChildMarket.isCancelled = false;
            unresolvedChildMarket.statusCode = "resolved";
            unresolvedChildMarket.proof = [];

            const resultType = MarketTypeMap[unresolvedChildMarket.typeId].resultType;
            if (resultType === ResultType.EXACT_POSITION) {
              unresolvedChildMarket.winningPositions = resultsForMarkets[j];
            } else if (resultType === ResultType.OVER_UNDER || resultType === ResultType.SPREAD) {
              const resultLine = Number(resultsForMarkets[j][0]) / 100;
              if (resultLine == unresolvedChildMarket.line) {
                unresolvedChildMarket.status = Status.CANCELLED;
                unresolvedChildMarket.isResolved = false;
                unresolvedChildMarket.isCancelled = true;
                unresolvedChildMarket.statusCode = "cancelled";
                unresolvedChildMarket.winningPositions = [];
                unresolvedChildMarket.proof = [];
              } else {
                const winningPosition =
                  resultType === ResultType.SPREAD
                    ? resultLine < unresolvedChildMarket.line
                      ? OverUnderType.Over
                      : OverUnderType.Under
                    : resultLine > unresolvedChildMarket.line
                    ? OverUnderType.Over
                    : OverUnderType.Under;
                unresolvedChildMarket.winningPositions = [winningPosition];
              }
            }

            if (isPlayerPropsMarket(typeId)) {
              unresolvedChildMarket.playerProps.playerScore =
                isOneSidePlayerPropsMarket(typeId) || isYesNoPlayerPropsMarket(typeId)
                  ? Number(resultsForMarkets[j][0]) / 100 === 1
                    ? "Yes"
                    : "No"
                  : Number(resultsForMarkets[j][0]) / 100;
            }
          } else {
            unresolvedChildMarket.status = Status.CANCELLED;
            unresolvedChildMarket.isResolved = false;
            unresolvedChildMarket.isCancelled = true;
            unresolvedChildMarket.statusCode = "cancelled";
            unresolvedChildMarket.winningPositions = [];
            unresolvedChildMarket.proof = [];
          }
          unresolvedChildMarket.isPaused = false;
          unresolvedChildMarket.isOpen = false;
        }
      }
    }

    // get all unresolvded combined positions child markets
    const cpUnresolvedChildMarkets = allUnresolvedClosedMarkets[i].childMarkets.filter(
      (market) =>
        ((!market.isResolved && !market.isCancelled) || forceResolve) && getIsCombinedPositionsMarket(market.typeId),
    );
    for (let j = 0; j < cpUnresolvedChildMarkets.length; j++) {
      const cpUnresolvdeCildMarket = cpUnresolvedChildMarkets[j];

      const winningPositions = [];
      let status = Status.CANCELLED;
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
          if (
            singleMarket &&
            singleMarket.isResolved &&
            !singleMarket.winningPositions.includes(combinedPosition.position)
          ) {
            hasLosingPosition = true;
            break;
          }
          hasOpenPosition = !singleMarket || singleMarket.isOpen || singleMarket.isPaused;
          hasCancelledPosition = singleMarket && singleMarket.isCancelled;
        }

        // TODO: check logic with multiple (or zero) winning positions
        if (hasLosingPosition) {
          status = Status.RESOLVED;
        } else {
          if (!hasCancelledPosition) {
            if (hasOpenPosition) {
              status = Status.OPEN;
              break;
            } else {
              status = Status.RESOLVED;
              winningPositions.push(j);
            }
          }
        }
      }

      if (status === Status.RESOLVED) {
        cpUnresolvdeCildMarket.status = Status.RESOLVED;
        cpUnresolvdeCildMarket.isResolved = true;
        cpUnresolvdeCildMarket.isCancelled = false;
        cpUnresolvdeCildMarket.statusCode = "resolved";
        cpUnresolvdeCildMarket.isPaused = false;
        cpUnresolvdeCildMarket.isOpen = false;
        cpUnresolvdeCildMarket.winningPositions = winningPositions;
        cpUnresolvdeCildMarket.proof = [];
      } else if (status === Status.CANCELLED) {
        cpUnresolvdeCildMarket.status = Status.CANCELLED;
        cpUnresolvdeCildMarket.isResolved = false;
        cpUnresolvdeCildMarket.isCancelled = true;
        cpUnresolvdeCildMarket.isPaused = false;
        cpUnresolvdeCildMarket.isOpen = false;
        cpUnresolvdeCildMarket.statusCode = "cancelled";
        cpUnresolvdeCildMarket.winningPositions = [];
        cpUnresolvdeCildMarket.proof = [];
      }
    }

    allUnresolvedClosedMarkets[i].isWholeGameResolved = allUnresolvedClosedMarkets[i].childMarkets.every(
      (childMarket) => childMarket.isResolved || childMarket.isCancelled,
    );
    closedMarketsMap.set(allUnresolvedClosedMarkets[i].fixtureId, allUnresolvedClosedMarkets[i]);
  }

  redisClient.set(KEYS.OVERTIME_V2_CLOSED_MARKETS[network], JSON.stringify([...closedMarketsMap]));
}

module.exports = {
  processResolve,
};
