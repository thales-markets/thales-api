const fs = require("fs");
const axios = require("axios");

const packMarket = (market) => {
  return {
    gameId: market.gameId,
    sportId: market.leagueId,
    childId: market.isPlayerPropsMarket ? 10010 : market.typeId,
    playerPropsId: market.isPlayerPropsMarket ? market.typeId : 0,
    maturity: Math.round(new Date(market.maturityDate).getTime() / 1000),
    homeTeam: market.homeTeam,
    awayTeam: market.awayTeam,
    homeScore: market.homeScore,
    awayScore: market.awayScore,
    finalResult: market.finalResult,
    status: market.isOpen ? 0 : isResolved ? 1 : isCanceled ? 2 : 3,
    spread: market.spread * 100,
    total: market.total * 100,
    playerProps: {
      playerId: market.isPlayerPropsMarket ? market.playerProps.playerId : 0,
      playerName: market.isPlayerPropsMarket ? market.playerProps.playerName : "",
      line: market.isPlayerPropsMarket ? market.playerProps.line * 100 : 0,
      outcome: market.isPlayerPropsMarket
        ? market.playerProps.outcome && market.playerProps.outcome !== null
          ? market.playerProps.outcome
          : 0
        : 0,
      score: market.isPlayerPropsMarket ? market.playerProps.score : 0,
    },
    odds:
      market.odds.drawOdds.normalizedImplied && market.odds.drawOdds.normalizedImplied !== null
        ? [
            market.odds.homeOdds.normalizedImplied,
            market.odds.awayOdds.normalizedImplied,
            market.odds.drawOdds.normalizedImplied,
          ]
        : market.odds.awayOdds.normalizedImplied && market.odds.awayOdds.normalizedImplied !== null
        ? [market.odds.homeOdds.normalizedImplied, market.odds.awayOdds.normalizedImplied]
        : [market.odds.homeOdds.normalizedImplied],
  };
};

const getMarkets = async () => {
  const response = await axios.get(`https://api.thalesmarket.io/overtime/networks/42161/markets`);
  const markets = response.data["Hockey"][9006];

  const mappedMarkets = [];

  markets.forEach((market) => {
    let packedMarket = packMarket(market);
    packedMarket.childMarkets = [];
    market.childMarkets
      .filter((childMarket) => childMarket.typeId !== 10003)
      .forEach((childMarket) => {
        let packedChildMarket = packMarket(childMarket);
        packedMarket.childMarkets.push(packedChildMarket);
      });

    mappedMarkets.push(packedMarket);
  });

  return mappedMarkets;
};

async function writeDummyMarkets() {
  const dummyMarkets = await getMarkets();

  fs.writeFileSync(`overtimeV2Api/utils/dummy/dummyMarketsNhl.json`, JSON.stringify(dummyMarkets), function (err) {
    if (err) return console.log(err);
  });
}

writeDummyMarkets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
