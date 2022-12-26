require("dotenv").config();

const redis = require("redis");
const ethers = require("ethers");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { getPhaseAndEndDate, delay } = require("./services/utils");
const ammContract = require("./contracts/amm");
const sportsAmmContract = require("./contracts/sportsAMM");

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("process discounts on optimism");
        await processOrders(10);
        await processOvertimeOrders(10);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on arbitrum");
        await processOrders(42161);
      } catch (error) {
        console.log("orders on arbitrum error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on polygon");
        await processOrders(137);
      } catch (error) {
        console.log("orders on polygon error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process orders on BSC");
        await processOrders(56);
      } catch (error) {
        console.log("orders on BSC error: ", error);
      }

      //   try {
      //     console.log("process orders on mumbai");
      //     await processOrders(80001);
      //   } catch (error) {
      //     console.log("orders on mumbai error: ", error);
      //   }

      await delay(10 * 1000);

      try {
        console.log("process overtime orders on goerli");
        await processOvertimeOrders(5);
      } catch (error) {
        console.log("orders on goerli error: ", error);
      }

      await delay(10 * 1000);

      try {
        console.log("process discounts on goerli-OVM");
        await processOrders(420);
        await processOvertimeOrders(420);
      } catch (error) {
        console.log("orders on goerli-OVM error: ", error);
      }

      //   try {
      //     console.log("process orders on BSC");
      //     await processOrders(56);
      //   } catch (error) {
      //     console.log("orders on BSC error: ", error);
      //   }

      await delay(60 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const markets = await thalesData.binaryOptions.markets({
    max: Infinity,
    network,
  });

  const optimismOptionsMap = new Map();

  // Infura does not have a provider for Binance Smart Chain so we need to provide a public one instead
  const etherprovider = getProvider(network);

  const ammContractInit = new ethers.Contract(ammContract.addresses[network], ammContract.abi, etherprovider);

  for (const market of markets) {
    if ("trading" == getPhaseAndEndDate(market.maturityDate, market.expiryDate).phase) {
      try {
        const marketInfoObject = {
          longPriceImpact: 0,
          shortPriceImpact: 0,
        };

        try {
          const [longPriceImpact, shortPriceImpact] = await Promise.all([
            ammContractInit.buyPriceImpact(market.address, 0, ethers.utils.parseEther("1")),
            ammContractInit.buyPriceImpact(market.address, 1, ethers.utils.parseEther("1")),
          ]);

          marketInfoObject.longPriceImpact = Number(ethers.utils.formatEther(longPriceImpact)) * 100;
          marketInfoObject.shortPriceImpact = Number(ethers.utils.formatEther(shortPriceImpact)) * 100;
        } catch (e) {
          console.log(e);
        }

        optimismOptionsMap.set(market.address, marketInfoObject);
      } catch (e) {
        console.log("Error", e);
      }
    }
  }

  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.DISCOUNTS[network], JSON.stringify([...optimismOptionsMap]), function () {});
  }
}

async function processOvertimeOrders(network) {
  const markets = await thalesData.sportMarkets.markets({
    max: Infinity,
    network,
  });

  const optimismOptionsMap = new Map();

  // Infura does not have a provider for Binance Smart Chain so we need to provide a public one instead
  const etherprovider = getProvider(network);

  const ammContractInit = new ethers.Contract(
    sportsAmmContract.addresses[network],
    sportsAmmContract.abi,
    etherprovider,
  );

  const now = Date.now();

  for (const market of markets) {
    if (market.maturityDate > now) {
      try {
        const marketInfoObject = {
          homePriceImpact: 0,
          awayPriceImpact: 0,
          drawPriceImpact: 0,
          homeBonus: 0,
          awayBonus: 0,
          drawBonus: 0,
        };

        try {
          const [homePriceImpact, awayPriceImpact, drawPriceImpact] = await Promise.all([
            ammContractInit.buyPriceImpact(market.address, 0, ethers.utils.parseEther("1")),
            ammContractInit.buyPriceImpact(market.address, 1, ethers.utils.parseEther("1")),
            ammContractInit.buyPriceImpact(market.address, 2, ethers.utils.parseEther("1")),
          ]);

          marketInfoObject.homePriceImpact = Number(ethers.utils.formatEther(homePriceImpact)) * 100;
          marketInfoObject.awayPriceImpact = Number(ethers.utils.formatEther(awayPriceImpact)) * 100;
          marketInfoObject.drawPriceImpact = Number(ethers.utils.formatEther(drawPriceImpact)) * 100;
          marketInfoObject.homeBonus =
            -(marketInfoObject.homePriceImpact / (100 + marketInfoObject.homePriceImpact)) * 100;
          marketInfoObject.awayBonus =
            -(marketInfoObject.awayPriceImpact / (100 + marketInfoObject.awayPriceImpact)) * 100;
          marketInfoObject.drawBonus =
            -(marketInfoObject.drawPriceImpact / (100 + marketInfoObject.drawPriceImpact)) * 100;
        } catch (e) {
          console.log(e);
        }

        optimismOptionsMap.set(market.address, marketInfoObject);
      } catch (e) {
        console.log("Error", e);
      }
    }
  }

  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.OVERTIME_DISCOUNTS[network], JSON.stringify([...optimismOptionsMap]), function () {});
  }
}

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
