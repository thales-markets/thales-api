const { redisClient } = require("../../redis/client");
require("dotenv").config();
const {
  isPlayerPropsMarket,
  isOneSidePlayerPropsMarket,
  isYesNoPlayerPropsMarket,
  isOneSideMarket,
  formatMarketOdds,
  isFuturesMarket,
} = require("../utils/markets");
const { TicketMarketStatus, MarketTypeMap, OddsType } = require("../constants/markets");
const { bigNumberFormatter } = require("../utils/formatters");
const sportsAMMV2DataContract = require("../contracts/sportsAMMV2DataContract");
const sportsAMMV2ManagerContract = require("../contracts/sportsAMMV2ManagerContract");
const freeBetsHolderContract = require("../contracts/freeBetsHolderContract");
const stakingThalesBettingProxyContract = require("../contracts/stakingThalesBettingProxyContract");
const { getProvider } = require("../utils/provider");
const { ethers } = require("ethers");
const KEYS = require("../../redis/redis-keys");
const { getCollateralDecimals, getCollateralSymbolByAddress } = require("../utils/collaterals");
const { getLeagueSport, getLeagueLabel, League, UFC_LEAGUE_IDS } = require("overtime-live-trading-utils");
const { orderBy } = require("lodash");
const positionNamesMap = require("../assets/positionNamesMap.json");
const futuresPositionNamesMap = require("../assets/futuresPositionNamesMap.json");
const { getSystemBetPayoutData } = require("../utils/systemBets");

async function getPlayersInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_PLAYERS_INFO);
  const playersInfoMap = new Map(JSON.parse(obj));
  return playersInfoMap;
}

async function getGamesInfoMap() {
  const obj = await redisClient.get(KEYS.OVERTIME_V2_GAMES_INFO);
  const gamesInfoMap = new Map(JSON.parse(obj));
  return gamesInfoMap;
}

const mapTicket = (ticket, network, gamesInfoMap, playersInfoMap) => {
  let collateral = getCollateralSymbolByAddress(network, ticket.collateral);
  const collateralDecimals = getCollateralDecimals(network, collateral);
  collateral =
    ticket.ticketOwner.toLowerCase() === stakingThalesBettingProxyContract.addresses[network].toLowerCase()
      ? "sTHALES"
      : collateral;

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
    isCancelled:
      ticket.cancelled ||
      ticket.marketsResult.every((marketResult) => Number(marketResult.status) === TicketMarketStatus.CANCELLED),
    isLost: ticket.isLost,
    isUserTheWinner: ticket.isUserTheWinner,
    isExercisable: ticket.isExercisable,
    isClaimable: ticket.isUserTheWinner && !ticket.resolved,
    isOpen: !ticket.resolved && !ticket.isExercisable,
    finalPayout: bigNumberFormatter(ticket.finalPayout, collateralDecimals),
    isLive: ticket.isLive,
    isFreeBet: ticket.ticketOwner.toLowerCase() == freeBetsHolderContract.addresses[network].toLowerCase(),
    isSystemBet: ticket.isSystem,

    sportMarkets: ticket.marketsData.map((market, index) => {
      const leagueId = `${market.sportId}`.startsWith("152")
        ? League.TENNIS_WTA
        : `${market.sportId}`.startsWith("153")
        ? League.TENNIS_GS
        : `${market.sportId}`.startsWith("156")
        ? League.TENNIS_MASTERS
        : UFC_LEAGUE_IDS.includes(market.sportId)
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
      const positionNames = isFuturesMarket(typeId)
        ? futuresPositionNamesMap[leagueId]
          ? futuresPositionNamesMap[leagueId][typeId]
          : undefined
        : positionNamesMap[typeId];

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

  if (mappedTicket.isSystemBet) {
    const systemBetDenominator = Number(ticket.systemBetDenominator);
    const systemBetPayoutData = getSystemBetPayoutData(
      mappedTicket.sportMarkets,
      systemBetDenominator,
      mappedTicket.buyInAmount,
      mappedTicket.totalQuote,
    );
    mappedTicket.systemBetData = {
      systemBetDenominator: Number(ticket.systemBetDenominator),
      numberOfCombination: systemBetPayoutData.numberOfCombinations,
      buyInPerCombination: systemBetPayoutData.buyinPerCombination,
      minQuote: systemBetPayoutData.systemBetMinimumQuote,
      maxQuote: mappedTicket.totalQuote / systemBetPayoutData.numberOfCombinations,
      minPayout: systemBetPayoutData.systemBetPayoutMinPayout,
      maxPayout: mappedTicket.buyInAmount / mappedTicket.totalQuote,
      numberOfWinningCombinations: systemBetPayoutData.numberOfWinningCombinations,
    };
    if (mappedTicket.isUserTheWinner || mappedTicket.isCancelled) {
      if (mappedTicket.isResolved) {
        mappedTicket.payout = mappedTicket.finalPayout;
      } else {
        mappedTicket.payout = systemBetPayoutData.systemBetPayout;
      }
      mappedTicket.systemBetData.winningQuote = systemBetPayoutData.buyinPerCombination / mappedTicket.payout;
      mappedTicket.totalQuote = mappedTicket.systemBetData.winningQuote;
    } else {
      mappedTicket.payout = mappedTicket.systemBetData.maxPayout;
      mappedTicket.totalQuote = mappedTicket.systemBetData.maxQuote;
    }
  }

  return mappedTicket;
};

const updateTotalQuoteAndPayout = (tickets) => {
  const modifiedTickets = tickets.map((ticket) => {
    // Skip system bet, payout is updated in separate function due to different logic and quote is not used
    if (ticket.isSystemBet) {
      return ticket;
    }
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
  const stakingThalesBettingProxy = new ethers.Contract(
    stakingThalesBettingProxyContract.addresses[network],
    stakingThalesBettingProxyContract.abi,
    provider,
  );

  const batchSize = process.env.BATCH_SIZE_V2;

  const [
    numOfActiveTicketsPerUser,
    numOfResolvedTicketsPerUser,
    numOfActiveFreeBetTicketsPerUser,
    numOfResolvedFreeBetTicketsPerUser,
    numOfActiveStakedThalesTicketsPerUser,
    numOfResolvedStakedThalesTicketsPerUser,
  ] = await Promise.all([
    sportsAMMV2Manager.numOfActiveTicketsPerUser(walletAddress),
    sportsAMMV2Manager.numOfResolvedTicketsPerUser(walletAddress),
    freeBetsHolder.numOfActiveTicketsPerUser(walletAddress),
    freeBetsHolder.numOfResolvedTicketsPerUser(walletAddress),
    stakingThalesBettingProxy.numOfActiveTicketsPerUser(walletAddress),
    stakingThalesBettingProxy.numOfResolvedTicketsPerUser(walletAddress),
  ]);

  const numberOfActiveBatches =
    Math.trunc(
      (Number(numOfActiveTicketsPerUser) > Number(numOfActiveFreeBetTicketsPerUser) &&
      Number(numOfActiveTicketsPerUser) > Number(numOfActiveStakedThalesTicketsPerUser)
        ? Number(numOfActiveTicketsPerUser)
        : Number(numOfActiveFreeBetTicketsPerUser) > Number(numOfActiveStakedThalesTicketsPerUser)
        ? Number(numOfActiveFreeBetTicketsPerUser)
        : Number(numOfActiveStakedThalesTicketsPerUser)) / batchSize,
    ) + 1;
  const numberOfResolvedBatches =
    Math.trunc(
      (Number(numOfResolvedTicketsPerUser) > Number(numOfResolvedFreeBetTicketsPerUser) &&
      Number(numOfResolvedTicketsPerUser) > Number(numOfResolvedStakedThalesTicketsPerUser)
        ? Number(numOfResolvedTicketsPerUser)
        : Number(numOfResolvedFreeBetTicketsPerUser) > Number(numOfResolvedStakedThalesTicketsPerUser)
        ? Number(numOfResolvedFreeBetTicketsPerUser)
        : Number(numOfResolvedStakedThalesTicketsPerUser)) / batchSize,
    ) + 1;

  const promises = [];
  for (let i = 0; i < numberOfActiveBatches; i++) {
    promises.push(sportsAmmData.getActiveTicketsDataPerUser(walletAddress, i * batchSize, batchSize));
  }
  for (let i = 0; i < numberOfResolvedBatches; i++) {
    promises.push(sportsAmmData.getResolvedTicketsDataPerUser(walletAddress, i * batchSize, batchSize));
  }

  const promisesResult = await Promise.all(promises);

  const tickets = promisesResult
    .map((allData) => [...allData.ticketsData, ...allData.freeBetsData, ...allData.stakingBettingProxyData])
    .flat(1);

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
