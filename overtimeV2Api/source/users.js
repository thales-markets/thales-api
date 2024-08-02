const { redisClient } = require("../../redis/client");
require("dotenv").config();
const {
  isPlayerPropsMarket,
  isOneSidePlayerPropsMarket,
  isYesNoPlayerPropsMarket,
  isOneSideMarket,
  formatMarketOdds,
} = require("../utils/markets");
const { TicketMarketStatus, MarketTypeMap, OddsType } = require("../constants/markets");
const { bigNumberFormatter } = require("../utils/formatters");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const sportsAMMV2ManagerContract = require("../contracts/sportsAMMV2ManagerContract");
const freeBetsHolderContract = require("../contracts/freeBetsHolderContract");
const { getProvider } = require("../utils/provider");
const { ethers } = require("ethers");
const KEYS = require("../../redis/redis-keys");
const { League } = require("../constants/sports");
const { getCollateralDecimals, getCollateralSymbolByAddress } = require("../utils/collaterals");
const { getLeagueSport, getLeagueLabel } = require("../utils/sports");
const { orderBy } = require("lodash");
const positionNamesMap = require("../assets/positionNamesMap.json");

function getPlayersInfoMap() {
  return new Promise(function (resolve) {
    redisClient.get(KEYS.OVERTIME_V2_PLAYERS_INFO, function (err, obj) {
      const playersInfoMap = new Map(JSON.parse(obj));
      resolve(playersInfoMap);
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

const mapTicket = (ticket, network, gamesInfoMap, playersInfoMap) => {
  const collateral = getCollateralSymbolByAddress(network, ticket.collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);

  const mappedTicket = {
    id: ticket.id,
    timestamp: Number(ticket.createdAt) * 1000,
    collateral,
    account: ticket.ticketOwner,
    buyInAmount: bigNumberFormatter(ticket.buyInAmount, collateralDecimals),
    fees: bigNumberFormatter(ticket.fees, collateralDecimals),
    totalQuote: bigNumberFormatter(ticket.totalQuote),
    payout: bigNumberFormatter(ticket.buyInAmount, collateralDecimals) / bigNumberFormatter(ticket.totalQuote),
    numOfMarkets: Number(ticket.numOfMarkets),
    expiry: Number(ticket.expiry) * 1000,
    isResolved: ticket.resolved,
    isPaused: ticket.paused,
    isCancelled: ticket.marketsResult.every(
      (marketResult) => Number(marketResult.status) === TicketMarketStatus.CANCELLED,
    ),
    isLost: ticket.isLost,
    isUserTheWinner: ticket.isUserTheWinner,
    isExercisable: ticket.isExercisable,
    isClaimable: ticket.isUserTheWinner && !ticket.resolved,
    isOpen: !ticket.resolved && !ticket.isExercisable,
    finalPayout: bigNumberFormatter(ticket.finalPayout, collateralDecimals),
    isLive: ticket.isLive,
    isFreeBet: ticket.ticketOwner.toLowerCase() == freeBetsHolderContract.addresses[network].toLowerCase(),

    sportMarkets: ticket.marketsData.map((market, index) => {
      const leagueId = `${market.sportId}`.startsWith("153")
        ? League.TENNIS_GS
        : `${market.sportId}`.startsWith("156")
        ? League.TENNIS_MASTERS
        : market.sportId === 701 || market.sportId == 702 || market.sportId == 703
        ? League.UFC
        : Number(market.sportId);
      const typeId = Number(market.typeId);
      const isPlayerProps = isPlayerPropsMarket(typeId);
      const type = MarketTypeMap[typeId];
      const line = Number(market.line);

      const gameInfo = gamesInfoMap.get(market.gameId);

      const homeTeam = !!gameInfo && gameInfo.teams && gameInfo.teams.find((team) => team.isHome);
      const homeTeamName = homeTeam?.name ?? "Home Team";
      const homeScore = homeTeam?.score;
      const homeScoreByPeriod = homeTeam ? homeTeam.scoreByPeriod : [];

      const awayTeam = !!gameInfo && gameInfo.teams && gameInfo.teams.find((team) => !team.isHome);
      const awayTeamName = awayTeam?.name ?? "Away Team";
      const awayScore = awayTeam?.score;
      const awayScoreByPeriod = awayTeam ? awayTeam.scoreByPeriod : [];

      const playerInfo = playersInfoMap.get(market.playerId.toString());
      const playerName = isPlayerProps && playerInfo ? playerInfo.playerName : "Player Name";

      const marketResult = ticket.marketsResult[index];
      const marketStatus = Number(marketResult.status);

      const formattedOdds = bigNumberFormatter(market.odd);
      const positionNames = positionNamesMap[typeId];

      return {
        gameId: market.gameId,
        sport: getLeagueSport(leagueId),
        leagueId: leagueId,
        subLeagueId: Number(market.sportId),
        leagueName: getLeagueLabel(leagueId),
        typeId: typeId,
        type: type.key,
        maturity: Number(market.maturity) * 1000,
        maturityDate: new Date(market.maturity * 1000),
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        homeScore: isPlayerProps
          ? isOneSidePlayerPropsMarket(typeId) || isYesNoPlayerPropsMarket(typeId)
            ? Number(marketResult.results[0]) / 100 === 1
              ? "Yes"
              : "No"
            : Number(marketResult.results[0]) / 100
          : homeScore,
        homeScoreByPeriod,
        awayScore: isPlayerProps ? 0 : awayScore,
        awayScoreByPeriod,
        isOpen: marketStatus === TicketMarketStatus.OPEN,
        isResolved: marketStatus !== TicketMarketStatus.OPEN,
        isCancelled: marketStatus === TicketMarketStatus.CANCELLED,
        isWinning: marketStatus === TicketMarketStatus.WINNING,
        isOneSideMarket: isOneSideMarket(leagueId),
        line: line / 100,
        isPlayerPropsMarket: isPlayerProps,
        isOneSidePlayerPropsMarket: isOneSidePlayerPropsMarket(typeId),
        isYesNoPlayerPropsMarket: isYesNoPlayerPropsMarket(typeId),
        playerProps: {
          playerId: Number(market.playerId),
          playerName: playerName,
          playerScore: isPlayerProps
            ? isOneSidePlayerPropsMarket(typeId) || isYesNoPlayerPropsMarket(typeId)
              ? Number(marketResult.results[0]) / 100 === 1
                ? "Yes"
                : "No"
              : Number(marketResult.results[0]) / 100
            : 0,
        },
        selectedCombinedPositions: market.combinedPositions.map((combinedPosition) => ({
          typeId: combinedPosition.typeId,
          position: combinedPosition.position,
          line: combinedPosition.line / 100,
        })),
        position: Number(market.position),
        positionName: positionNames ? positionNames[Number(market.position)] : undefined,
        odd: {
          american: formatMarketOdds(formattedOdds, OddsType.AMERICAN),
          decimal: formatMarketOdds(formattedOdds, OddsType.DECIMAL),
          normalizedImplied: formatMarketOdds(formattedOdds, OddsType.AMM),
        },
        isGameFinished: gameInfo?.isGameFinished,
        gameStatus: gameInfo?.gameStatus,
      };
    }),
  };

  return mappedTicket;
};

const updateTotalQuoteAndPayout = (tickets) => {
  const modifiedTickets = tickets.map((ticket) => {
    let totalQuote = ticket.totalQuote;
    let payout = ticket.payout;

    if (ticket.isCancelled) {
      totalQuote = 1;
      payout = ticket.buyInAmount;
    } else {
      ticket.sportMarkets.forEach((market) => {
        if (market.isCancelled) {
          totalQuote = totalQuote / market.odd;
          payout = payout * market.odd;
        }
      });
    }

    return {
      ...ticket,
      totalQuote,
      payout,
    };
  });
  return modifiedTickets;
};

async function processUserHistory(network, walletAddress) {
  const gamesInfoMap = await getGamesInfoMap();
  const playersInfoMap = await getPlayersInfoMap();

  const provider = getProvider(network);
  const sportsAmmData = new ethers.Contract(
    sportsAMMV2DataContract.addresses[network],
    sportsAMMV2DataContract.abi,
    provider,
  );
  const sportsAMMV2Manager = new ethers.Contract(
    sportsAMMV2ManagerContract.addresses[network],
    sportsAMMV2ManagerContract.abi,
    provider,
  );
  const freeBetsHolder = new ethers.Contract(
    freeBetsHolderContract.addresses[network],
    freeBetsHolderContract.abi,
    provider,
  );

  const batchSize = process.env.BATCH_SIZE_V2;

  const [
    numOfActiveTicketsPerUser,
    numOfResolvedTicketsPerUser,
    numOfActiveFreeBetTicketsPerUser,
    numOfResolvedFreeBetTicketsPerUser,
  ] = await Promise.all([
    sportsAMMV2Manager.numOfActiveTicketsPerUser(walletAddress),
    sportsAMMV2Manager.numOfResolvedTicketsPerUser(walletAddress),
    freeBetsHolder.numOfActiveTicketsPerUser(walletAddress),
    freeBetsHolder.numOfResolvedTicketsPerUser(walletAddress),
  ]);

  const numberOfActiveBatches =
    Math.trunc(
      (Number(numOfActiveTicketsPerUser) > Number(numOfActiveFreeBetTicketsPerUser)
        ? Number(numOfActiveTicketsPerUser)
        : Number(numOfActiveFreeBetTicketsPerUser)) / batchSize,
    ) + 1;
  const numberOfResolvedBatches =
    Math.trunc(
      (Number(numOfResolvedTicketsPerUser) > Number(numOfResolvedFreeBetTicketsPerUser)
        ? Number(numOfResolvedTicketsPerUser)
        : Number(numOfResolvedFreeBetTicketsPerUser)) / batchSize,
    ) + 1;

  const promises = [];
  for (let i = 0; i < numberOfActiveBatches; i++) {
    promises.push(sportsAmmData.getActiveTicketsDataPerUser(walletAddress, i * batchSize, batchSize));
  }
  for (let i = 0; i < numberOfResolvedBatches; i++) {
    promises.push(sportsAmmData.getResolvedTicketsDataPerUser(walletAddress, i * batchSize, batchSize));
  }

  const promisesResult = await Promise.all(promises);

  const tickets = promisesResult.map((allData) => [...allData.ticketsData, ...allData.freeBetsData]).flat(1);

  const mappedTickets = tickets.map((ticket) => mapTicket(ticket, network, gamesInfoMap, playersInfoMap));

  const finalTickets = orderBy(updateTotalQuoteAndPayout(mappedTickets), ["timestamp"], ["desc"]);

  const groupedTickets = {
    open: finalTickets.filter((ticket) => ticket.isOpen),
    claimable: finalTickets.filter((ticket) => ticket.isClaimable),
    closed: finalTickets.filter((ticket) => !ticket.isOpen && !ticket.isClaimable),
  };
  return groupedTickets;
}

module.exports = {
  processUserHistory,
};
