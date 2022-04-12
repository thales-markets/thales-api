require("dotenv").config();

const redis = require("redis");
const ethers = require("ethers");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { getPhaseAndEndDate, delay } = require("./services/utils");
const ammContract = require("./contracts/amm");

const optimismOptionsMap = new Map();

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("process orders on optimism");
        await processOrders(10);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on polygon");
        await processOrders(137);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on mumbai");
        await processOrders(80001);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on kovan-OVM");
        await processOrders(69);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(60 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const markets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network,
  });

  const networkName = ethers.providers.getNetwork(network).name;
  console.log(networkName);

  const etherprovider = new ethers.providers.InfuraProvider(
    { chainId: network, name: networkName },
    process.env.INFURA_URL,
  );
  const ammContractInit = new ethers.Contract(ammContract.addresses[network], ammContract.abi, etherprovider);

  for (const market of markets) {
    if ("trading" == getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase) {
      try {
        const marketInfoObject = {
          availableLongs: 0,
          availableShorts: 0,
          longPrice: 0,
          shortPrice: 0,
        };

        try {
          const [availableLongs, availableShorts, longPrice, shortPrice] = await Promise.all([
            ammContractInit.availableToBuyFromAMM(market.address, 0),
            ammContractInit.availableToBuyFromAMM(market.address, 1),
            ammContractInit.buyFromAmmQuote(market.address, 0, ethers.utils.parseEther("1")),
            ammContractInit.buyFromAmmQuote(market.address, 1, ethers.utils.parseEther("1")),
          ]);

          marketInfoObject.availableLongs = ethers.utils.formatEther(availableLongs);
          marketInfoObject.availableShorts = ethers.utils.formatEther(availableShorts);
          marketInfoObject.longPrice = ethers.utils.formatEther(longPrice);
          marketInfoObject.shortPrice = ethers.utils.formatEther(shortPrice);
        } catch (e) {
          console.log(e);
        }

        optimismOptionsMap.set(market.address, marketInfoObject);
        if (process.env.REDIS_URL) {
          redisClient.set(KEYS.OPTIMISM_ORDERS, JSON.stringify([...optimismOptionsMap]), function () {});
        }
      } catch (e) {
        console.log("Error", e);
      }
    }
  }
}
