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
  const markets = response.data["Soccer"][9016];

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
  const repoOwner = "thales-markets";
  const repoName = "overtime-v2-merkles";
  const filePath = `merkle-trees/`;
  const listFilePath = `merkle-trees/alltrees.txt`;
  const token = `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`;
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
    const marketsResponse = await axios.get(`${apiUrl}${filePath}${file}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const marketsContent = Buffer.from(marketsResponse.data.content, "base64").toString("utf8");
    markets = [...markets, ...JSON.parse(marketsContent).treeMarketsAndHashes];
  }

  console.log(markets);
  // const dummyMarkets = await getMarkets();

  // fs.writeFileSync(`overtimeV2Api/utils/dummy/dummyMarketsUcl.json`, JSON.stringify(dummyMarkets), function (err) {
  //   if (err) return console.log(err);
  // });
}

writeDummyMarkets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
