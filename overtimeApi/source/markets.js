require("dotenv").config();

const thalesData = require("thales-data");
const redis = require("redis");
const { ethers } = require("ethers");
const { orderBy, groupBy } = require("lodash");

const sportPositionalMarketDataContract = require("../contracts/sportPositionalMarketDataContract");
const sportPositionalMarketManagerContract = require("../contracts/sportPositionalMarketManagerContract");
const { ENETPULSE_SPORTS, SPORTS_MAP, SPORTS_TAGS_MAP, GOLF_TOURNAMENT_WINNER_TAG } = require("../constants/tags");
const { BET_TYPE, STABLE_DECIMALS, NETWORK, ODDS_TYPE, MARKET_TYPE } = require("../constants/markets");
const {
  delay,
  fixDuplicatedTeamName,
  bigNumberFormatter,
  convertPriceImpactToBonus,
  formatMarketOdds,
  getLeagueNameById,
} = require("../utils/markets");
const KEYS = require("../../redis/redis-keys");

let marketsMap = new Map();

const BATCH_SIZE = 100;

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
          console.log("process markets on optimism");
          await processMarketsPerNetwork(NETWORK.Optimism);
        } catch (error) {
          console.log("markets on optimism error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process markets on arbitrum");
          await processMarketsPerNetwork(NETWORK.Arbitrum);
        } catch (error) {
          console.log("markets on arbitrum error: ", error);
        }

        await delay(10 * 1000);

        try {
          console.log("process markets on op goerli");
          await processMarketsPerNetwork(NETWORK.OptimismGoerli);
        } catch (error) {
          console.log("markets on op goerli error: ", error);
        }

        await delay(10 * 1000);
      }
    }, 3000);
  }
}

const childrenOf = (parentMarket, groupedMarkets) => {
  return (groupedMarkets[parentMarket] || []).map((market) => ({
    ...market,
    childMarkets: orderBy(childrenOf(market.address, groupedMarkets), ["betType"], ["asc"]),
  }));
};

const groupMarkets = (allMarkets) => {
  const groupedMarkets = groupBy(allMarkets, (market) => market.parentMarket);
  return childrenOf("null", groupedMarkets);
};

const mapMarkets = async (allMarkets, mapOnlyOpenedMarkets, network) => {
  const mappedMarkets = [];

  let oddsFromContract;
  let priceImpactFromContract;
  if (mapOnlyOpenedMarkets) {
    try {
      const provivder = new ethers.providers.InfuraProvider(network, "0043cf4a54184e14a0704726b5e5d83a");
      const sportPositionalMarketData = new ethers.Contract(
        sportPositionalMarketDataContract.addresses[network],
        sportPositionalMarketDataContract.abi,
        provivder,
      );
      const sportPositionalMarketManager = new ethers.Contract(
        sportPositionalMarketManagerContract.addresses[network],
        sportPositionalMarketManagerContract.abi,
        provivder,
      );

      const numberOfActiveMarkets = await sportPositionalMarketManager.numActiveMarkets();
      const numberOfBatches = Math.trunc(numberOfActiveMarkets / BATCH_SIZE) + 1;

      const promises = [];
      for (let i = 0; i < numberOfBatches; i++) {
        promises.push(sportPositionalMarketData.getOddsForAllActiveMarketsInBatches(i, BATCH_SIZE));
      }
      for (let i = 0; i < numberOfBatches; i++) {
        promises.push(sportPositionalMarketData.getPriceImpactForAllActiveMarketsInBatches(i, BATCH_SIZE));
      }

      const promisesResult = await Promise.all(promises);

      oddsFromContract = promisesResult.slice(0, numberOfBatches).flat(1);
      priceImpactFromContract = promisesResult.slice(numberOfBatches, numberOfBatches + numberOfBatches).flat(1);
    } catch (e) {
      console.log("Could not get oods from chain", e);
    }
  }

  allMarkets.forEach((market) => {
    if (Number(market.tags[0]) === 0) return;
    market.maturityDate = new Date(market.maturityDate);
    const isEnetpulseSport = ENETPULSE_SPORTS.includes(Number(market.tags[0]));
    market.homeTeam = fixDuplicatedTeamName(market.homeTeam, isEnetpulseSport);
    market.awayTeam = fixDuplicatedTeamName(market.awayTeam, isEnetpulseSport);
    market.sport = SPORTS_MAP[market.tags[0]];
    market.isOneSideMarket =
      SPORTS_TAGS_MAP["Motosport"].includes(Number(market.tags[0])) ||
      Number(market.tags[0]) == GOLF_TOURNAMENT_WINNER_TAG;

    if (mapOnlyOpenedMarkets) {
      if (oddsFromContract) {
        const oddsItem = oddsFromContract.find(
          (obj) => obj[0].toString().toLowerCase() === market.address.toLowerCase(),
        );
        if (oddsItem) {
          market.homeOdds = bigNumberFormatter(oddsItem.odds[0], STABLE_DECIMALS[network]);
          market.awayOdds = bigNumberFormatter(oddsItem.odds[1], STABLE_DECIMALS[network]);
          market.drawOdds = oddsItem.odds[2]
            ? bigNumberFormatter(oddsItem.odds[2], STABLE_DECIMALS[network])
            : undefined;
        }
      }
      if (priceImpactFromContract) {
        const priceImpactItem = priceImpactFromContract.find(
          (obj) => obj[0].toString().toLowerCase() === market.address.toLowerCase(),
        );
        if (priceImpactItem) {
          market.homePriceImpact = bigNumberFormatter(priceImpactItem.priceImpact[0]);
          market.awayPriceImpact = bigNumberFormatter(priceImpactItem.priceImpact[1]);
          market.drawPriceImpact = priceImpactItem.priceImpact[2]
            ? bigNumberFormatter(priceImpactItem.priceImpact[2])
            : undefined;
          market.homeBonus = convertPriceImpactToBonus(market.homePriceImpact);
          market.awayBonus = convertPriceImpactToBonus(market.awayPriceImpact);
          market.drawBonus = market.drawPriceImpact ? convertPriceImpactToBonus(market.drawPriceImpact) : undefined;
        }
      }

      if (
        market.homeOdds !== 0 ||
        market.awayOdds !== 0 ||
        (market.drawOdds || 0) !== 0 ||
        market.betType === BET_TYPE.DoubleChance
      ) {
        mappedMarkets.push(market);
      }
    } else {
      mappedMarkets.push(market);
    }
  });

  let packedMarkets = mappedMarkets.map((market) => {
    return {
      address: market.address,
      gameId: market.gameId,
      sport: market.sport,
      leagueId: Number(market.tags[0]),
      leagueName: getLeagueNameById(Number(market.tags[0])),
      type: MARKET_TYPE[market.betType],
      parentMarket: market.parentMarket,
      maturityDate: market.maturityDate,
      homeTeam: market.homeTeam,
      awayTeam: market.awayTeam,
      homeScore: market.homeScore,
      awayScore: market.awayScore,
      finalResult: market.finalResult,
      isResolved: market.isResolved,
      isOpen: market.isOpen,
      isCanceled: market.isCanceled,
      isPaused: market.isPaused,
      isOneSideMarket: market.isOneSideMarket,
      spread: Number(market.spread) / 100,
      total: Number(market.total) / 100,
      doubleChanceMarketType: market.doubleChanceMarketType,
      odds: {
        homeOdds: {
          american: formatMarketOdds(market.homeOdds, ODDS_TYPE.American),
          decimal: formatMarketOdds(market.homeOdds, ODDS_TYPE.Decimal),
          normalizedImplied: formatMarketOdds(market.homeOdds, ODDS_TYPE.AMM),
        },
        awayOdds: {
          american: formatMarketOdds(market.awayOdds, ODDS_TYPE.American),
          decimal: formatMarketOdds(market.awayOdds, ODDS_TYPE.Decimal),
          normalizedImplied: formatMarketOdds(market.awayOdds, ODDS_TYPE.AMM),
        },
        drawOdds: {
          american: formatMarketOdds(market.drawOdds, ODDS_TYPE.American),
          decimal: formatMarketOdds(market.drawOdds, ODDS_TYPE.Decimal),
          normalizedImplied: formatMarketOdds(market.drawOdds, ODDS_TYPE.AMM),
        },
      },
      priceImpact: {
        homeBonus: market.homePriceImpact,
        awayBonus: market.awayPriceImpact,
        drawBonus: market.drawPriceImpact,
      },
      bonus: {
        homeBonus: market.homeBonus,
        awayBonus: market.awayBonus,
        drawBonus: market.drawBonus,
      },
    };
  });

  let finalMarkets = groupMarkets(packedMarkets);
  // if (mapOnlyOpenedMarkets && mappedMarkets.length > 0) {
  //   try {
  //     const { sportPositionalMarketDataContract } = networkConnector;

  //     const tmpOpenMarkets = groupMarkets(mappedMarkets);
  //     const sgpFees: SGPItem[] | undefined = localStore.get(LOCAL_STORAGE_KEYS.SGP_FEES);
  //     const tmpTags: number[] = [];

  //     if (sgpFees) sgpFees.forEach((sgpItem) => tmpTags.push(...sgpItem.tags));

  //     const marketsFilteredByTags = filterMarketsByTagsArray(tmpOpenMarkets, tmpTags);
  //     const marketAddresses = getMarketAddressesFromSportMarketArray(marketsFilteredByTags);

  //     if (marketAddresses) {
  //       const promises: CombinedMarketsContractData[] = [];
  //       const numberOfBatches = Math.trunc(marketAddresses.length / BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY) + 1;

  //       for (let i = 0; i < numberOfBatches; i++) {
  //         const arraySlice = marketAddresses.slice(
  //           i * BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY,
  //           i * BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY + BATCH_SIZE_FOR_COMBINED_MARKETS_QUERY,
  //         );
  //         promises.push(sportPositionalMarketDataContract?.getCombinedOddsForBatchOfMarkets(arraySlice));
  //       }

  //       const promisesResult = await Promise.all(promises);

  //       const combinedMarketsData: CombinedMarketsContractData = [];

  //       promisesResult.forEach((promiseData) => {
  //         promiseData.forEach((_combinedMarketData: any) => {
  //           combinedMarketsData.push(_combinedMarketData);
  //         });
  //       });

  //       if (combinedMarketsData) {
  //         const newMarkets = insertCombinedMarketsIntoArrayOFMarkets(tmpOpenMarkets, combinedMarketsData);
  //         finalMarkets = newMarkets;
  //       }
  //     }
  //   } catch (e) {
  //     console.log("Error ", e);
  //   }
  // }

  return finalMarkets;
};

async function processMarketsPerNetwork(network) {
  const today = new Date();
  // thales-data takes timestamp argument in seconds
  const minMaturityDate = Math.round(new Date(new Date().setDate(today.getDate() - 7)).getTime() / 1000); // show history for 7 days in the past
  const todaysDate = Math.round(today.getTime() / 1000);

  console.log("process open markets");
  let markets = await thalesData.sportMarkets.markets({
    isOpen: true,
    isCanceled: false,
    isPaused: false,
    network,
    minMaturityDate: todaysDate,
  });
  let mappedMarkets = await mapMarkets(markets, true, network);
  marketsMap.set("open", mappedMarkets);

  console.log("process resolved markets");
  markets = await await thalesData.sportMarkets.markets({
    isOpen: false,
    isCanceled: false,
    network,
    minMaturityDate,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("resolved", mappedMarkets);

  console.log("process canceled markets");
  markets = await thalesData.sportMarkets.markets({
    isOpen: false,
    isCanceled: true,
    network,
    minMaturityDate,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("canceled", mappedMarkets);

  console.log("process paused markets");
  markets = await await thalesData.sportMarkets.markets({
    isPaused: true,
    network,
    minMaturityDate,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("paused", mappedMarkets);

  console.log("process ongoing markets");
  markets = await thalesData.sportMarkets.markets({
    isOpen: true,
    isCanceled: false,
    minMaturityDate,
    maxMaturityDate: todaysDate,
    network,
  });
  mappedMarkets = await mapMarkets(markets, false, network);
  marketsMap.set("ongoing", mappedMarkets);

  // console.log(marketsMap);

  redisClient.set(KEYS.OVERTIME_MARKETS[network], JSON.stringify([...marketsMap]), function () {});
}

module.exports = {
  processMarkets,
};
