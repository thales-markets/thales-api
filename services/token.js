const circulatingSupplyList = require("../assets/circulating-supply.json");

const DAO_TREASURY_AMOUNT = 18000000;

async function processToken() {
  try {
    const ongoingAirdropNewRoots = await thalesData.binaryOptions.ongoingAirdropNewRoots({ network: 42 });
    const period = ongoingAirdropNewRoots.length > 0 ? parseInt(ongoingAirdropNewRoots[0].period) + 1 : 1;

    const circulatingSupply = circulatingSupplyList[period] - DAO_TREASURY_AMOUNT;
    tokenMap = { circulatingSupply, price: 0 };

    if (process.env.REDIS_URL) {
      redisClient.set(KEYS.TOKEN, JSON.stringify(tokenMap), function () {});
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = processToken;
