require("dotenv").config();

const redis = require("redis");
const ethers = require("ethers");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");
const ammContract = require("./contracts/rangedAMM");

const rangedAMMLiquidity = new Map();

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

      //   await delay(10 * 1000);

      //   try {
      //     console.log("process orders on polygon");
      //     await processOrders(137);
      //   } catch (error) {
      //     console.log("orders on optimism error: ", error);
      //   }

      //   await delay(10 * 1000);

      //   try {
      //     console.log("process orders on mumbai");
      //     await processOrders(80001);
      //   } catch (error) {
      //     console.log("orders on optimism error: ", error);
      //   }

      //   await delay(10 * 1000);

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
  const markets = await thalesData.binaryOptions.rangedMarkets({
    max: Infinity,
    network,
  });

  const networkName = ethers.providers.getNetwork(network).name;

  const etherprovider = new ethers.providers.InfuraProvider(
    { chainId: network, name: networkName },
    process.env.INFURA_URL,
  );

  const ammContractInit = new ethers.Contract(ammContract.addresses[network], ammContract.abi, etherprovider);

  for (const market of markets) {
    if (market.maturityDate > Date.now()) {
      try {
        const marketInfoObject = {
          availableIn: 0,
          availableOut: 0,
          inPrice: 0,
          outPrice: 0,
        };

        try {
          const [availableIn, availableOut] = await Promise.all([
            ammContractInit.availableToBuyFromAMM(market.address, 0),
            ammContractInit.availableToBuyFromAMM(market.address, 1),
          ]);

          if (availableIn > 0) {
            const inPrice = await ammContractInit.buyFromAmmQuote(market.address, 0, ethers.utils.parseEther("1"));

            marketInfoObject.inPrice = ethers.utils.formatEther(inPrice);
            marketInfoObject.availableIn = ethers.utils.formatEther(availableIn);
          }
          if (availableOut > 0) {
            const outPrice = await ammContractInit.buyFromAmmQuote(market.address, 1, ethers.utils.parseEther("1"));

            marketInfoObject.outPrice = ethers.utils.formatEther(outPrice);
            marketInfoObject.availableOut = ethers.utils.formatEther(availableOut);
          }
        } catch (e) {}

        rangedAMMLiquidity.set(market.address, marketInfoObject);
        if (process.env.REDIS_URL) {
          redisClient.set(KEYS.RANGED_AMM_LIQUIDITY[network], JSON.stringify([...rangedAMMLiquidity]), function () {});
        }
      } catch (e) {}
    }
  }
}
