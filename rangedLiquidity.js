require("dotenv").config();

const redis = require("redis");
const ethers = require("ethers");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");
const ammContract = require("./contracts/rangedAMM");

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
        console.log("orders on polygon error: ", error);
      }
      await delay(10 * 1000);

      // try {
      //   console.log("process orders on mumbai");
      //   await processOrders(80001);
      // } catch (error) {
      //   console.log("orders on optimism error: ", error);
      // }

      // await delay(10 * 1000);

      try {
        console.log("process orders on Goerli-OVM");
        await processOrders(420);
      } catch (error) {
        console.log("orders on Goerli OVM error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on BSC");
        await processOrders(56);
      } catch (error) {
        console.log("orders on BSC error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on Arbitrum");
        await processOrders(42161);
      } catch (error) {
        console.log("orders on Arbitrum error: ", error);
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

  const rangedAMMLiquidity = new Map();

  // Infura does not have a provider for Binance Smart Chain so we need to provide a public one instead
  const etherprovider = getProvider(network);

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

            marketInfoObject.inPrice = stableCoinFormatter(inPrice, network);
            if (marketInfoObject.inPrice === 0) {
              marketInfoObject.availableIn = 0;
            } else {
              marketInfoObject.availableIn = ethers.utils.formatEther(availableIn);
            }
          }
          if (availableOut > 0) {
            const outPrice = await ammContractInit.buyFromAmmQuote(market.address, 1, ethers.utils.parseEther("1"));

            marketInfoObject.outPrice = stableCoinFormatter(outPrice, network);
            if (marketInfoObject.outPrice === 0) {
              marketInfoObject.availableOut = 0;
            } else {
              marketInfoObject.availableOut = ethers.utils.formatEther(availableOut);
            }
          }
        } catch (e) {}

        rangedAMMLiquidity.set(market.address, marketInfoObject);
      } catch (e) {}
    }
  }
  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.RANGED_AMM_LIQUIDITY[network], JSON.stringify([...rangedAMMLiquidity]), function () {});
  }
}

const stableCoinFormatter = (value, networkId) => {
  if (networkId == 137 || networkId == 42161) {
    // polygon and arbi
    return Number(ethers.utils.formatUnits(value, 6));
  } else {
    return Number(ethers.utils.formatUnits(value, 18));
  }
};

function getProvider(network) {
  const networkName = ethers.providers.getNetwork(network).name;

  switch (Number(network)) {
    case 56:
      const bscProvider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/", {
        name: "binance",
        chainId: 56,
      });
      return bscProvider;

    case 420:
      const opGoerliProvider = new ethers.providers.JsonRpcProvider(
        "https://optimism-goerli.infura.io/v3/" + process.env.INFURA_URL,
        { name: "optimism-goerli", chainId: 420 },
      );
      return opGoerliProvider;

    default:
      // Infura does not have a provider for Binance Smart Chain so we need to provide a public one instead
      const etherprovider = new ethers.providers.InfuraProvider(
        { chainId: network, name: networkName },
        process.env.INFURA_URL,
      );
      return etherprovider;
  }
}
