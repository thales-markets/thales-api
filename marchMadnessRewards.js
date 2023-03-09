require("dotenv").config();

const redis = require("redis");
const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const ethers = require("ethers");
const marchMadness = require("./contracts/marchMadness");
const { delay } = require("./services/utils");

const OP_REWARDS = 5000;
const OP_VOLUME_REWARDS = 20000;
const THALES_REWARDS = 50000;
const THALES_VOLUME_REWARDS = 10000;

const ONE_MINUTE = 60 * 1000;

if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });

  setTimeout(async () => {
    while (true) {
      try {
        await processOrders(42161);
      } catch (e) {
        console.log("Error ", e);
      }

      await delay(ONE_MINUTE);

      try {
        await processOrders(10);
      } catch (e) {
        console.log("Error ", e);
      }

      await delay(ONE_MINUTE);

      try {
        await processOrders(420);
      } catch (e) {
        console.log("Error ", e);
      }
      // 3 minute delay between iterations
      await delay(3 * ONE_MINUTE);
    }
    // 3 seconds timeout to give time to connect to redis
  }, 3000);
}

const REWARDS = {
  FIRST_ROUND: 1,
  SECOND_ROUND: 2,
  THIRD_ROUND: 4,
  FOURTH_ROUND: 7,
  FIFTH_ROUND: 10,
  FINAL: 20,
};

async function processOrders(network) {
  const TAG_ID = "9005";
  const FROM_DATE = new Date("03-09-2023").getTime() / 1000;

  console.log("NetworkId -> ", network);

  const provider = getProvider(network);

  if (marchMadness.addresses[network] == "TBD") {
    console.log("Contract address not provided.");
    return;
  }

  const marchMadnessContract = new ethers.Contract(marchMadness.addresses[network], marchMadness.abi, provider);

  const marchMadnessTokens = await thalesData.sportMarkets.marchMadnessToken({
    network: network,
  });

  const users = [];
  let globalVolume = 0;

  for (let i = 0; i < marchMadnessTokens.length; i++) {
    const owner = marchMadnessTokens[i].minter;

    const singles = await thalesData.sportMarkets.marketTransactions({
      network: network,
      account: owner,
      minTimestamp: FROM_DATE,
    });
    const parlays = await thalesData.sportMarkets.parlayMarkets({
      network: network,
      account: owner,
      minTimestamp: FROM_DATE,
    });

    // Check for singles and parlays that are in right competition
    const singleFromLeague = singles.filter((singleTx) => singleTx.wholeMarket.tags.includes(TAG_ID));
    const parlayFromLeague = parlays.filter(
      (parlayTx) => parlayTx.sportMarkets.map((sportMarket) => sportMarket.tags.includes(TAG_ID)).length > 0,
    );

    const numberOfCorrectedPredictionsPerRound = await marchMadnessContract.getCorrectPositionsByRound(owner);

    const multiplier = (
      calculateRewardPercentageBaseOnCorrectPredictions(numberOfCorrectedPredictionsPerRound) / 100
    ).toFixed(2);

    if (!numberOfCorrectedPredictionsPerRound.length) continue;

    let _volume = 0;
    let _baseVolume = 0;
    let _bonusVolume = 0;

    singleFromLeague.forEach((single) => {
      _baseVolume += single.paid;
      _bonusVolume += single.paid * Number(multiplier);
    });

    parlayFromLeague.forEach((parlay) => {
      _baseVolume += parlay.sUSDPaid;
      _bonusVolume += parlay.sUSDPaid * Number(multiplier);
    });

    _volume = _baseVolume + _bonusVolume;

    users.push({
      walletAddress: owner,
      baseVolume: _baseVolume,
      bonusVolume: _bonusVolume,
      volume: _volume,
      totalCorrectedPredictions: numberOfCorrectedPredictionsPerRound.reduce(
        (partialSum, a) => Number(partialSum) + Number(a),
        0,
      ),
    });

    globalVolume += _volume;
  }

  const clonedUsers = JSON.parse(JSON.stringify(users));

  const finalArray = users
    .sort((userA, userB) => userB.volume - userA.volume)
    .map((user, index) => {
      user.rank = index + 1;
      user.rewards = globalVolume > 0 ? (user.volume / globalVolume) * getVolumeRewardsForNetwork(network) : 0;
      return user;
    });

  const finalArrayByNumberOfCorrectPredictions = clonedUsers
    .filter((user) => user.baseVolume > 10)
    .sort((userA, userB) => userB.totalCorrectedPredictions - userA.totalCorrectedPredictions)
    .map((user, index) => {
      user.rank = index + 1;
      user.rewards = getRewardsForNetwork(network) / 10;
      return user;
    });

  const leaderboardData = { globalVolume, leaderboard: finalArray };
  if (process.env.REDIS_URL) {
    redisClient.set(KEYS.MARCH_MADNESS.BY_VOLUME[network], JSON.stringify(leaderboardData), function () {});
    redisClient.set(
      KEYS.MARCH_MADNESS.BY_NUMBER_OF_CORRECT_PREDICTIONS[network],
      JSON.stringify(finalArrayByNumberOfCorrectPredictions),
      function () {},
    );
  }
  return;
}

const getVolumeRewardsForNetwork = (networkId) => {
  if (networkId == 10) return OP_VOLUME_REWARDS;
  if (networkId == 420) return OP_VOLUME_REWARDS;
  return THALES_VOLUME_REWARDS;
};

const getRewardsForNetwork = (networkId) => {
  if (networkId == 10) return OP_REWARDS;
  if (networkId == 420) return OP_REWARDS;
  return THALES_REWARDS;
};

const calculateRewardPercentageBaseOnCorrectPredictions = (arrayOfPredicitionsPerRound) => {
  if (arrayOfPredicitionsPerRound.length !== 6) return 0;

  return Number(
    Number(arrayOfPredicitionsPerRound[0]) * REWARDS.FIRST_ROUND +
      Number(arrayOfPredicitionsPerRound[1]) * REWARDS.SECOND_ROUND +
      Number(arrayOfPredicitionsPerRound[2]) * REWARDS.THIRD_ROUND +
      Number(arrayOfPredicitionsPerRound[3]) * REWARDS.FOURTH_ROUND +
      Number(arrayOfPredicitionsPerRound[4]) * REWARDS.FIFTH_ROUND +
      Number(arrayOfPredicitionsPerRound[5]) * REWARDS.FINAL,
  );
};
// function getProvider(network) {
//   switch (Number(network)) {
//     case 56:
//       const bscProvider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/", {
//         name: "binance",
//         chainId: 56,
//       });
//       return bscProvider;

//     default:
//       // Infura does not have a provider for Binance Smart Chain so we need to provide a public one instead
//       const etherprovider = new ethers.providers.JsonRpcProvider(MAP_PROVIDER[network] + process.env.INFURA_URL);
//       return etherprovider;
//   }
// }

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

const MAP_PROVIDER = {
  // 1: "https://mainnet.chainnodes.org/",
  // 5: "https://goerli.chainnodes.org/",
  // 10: "https://optimism-mainnet.chainnodes.org/",
  // 137: "https://polygon-mainnet.chainnodes.org/",
  // 420: "https://optimism-goerli.chainnodes.org/",
  // 42161: "https://arbitrum-one.chainnodes.org/",
  1: "https://mainnet.infura.io/v3/",
  10: "https://optimism-mainnet.infura.io/v3/",
  420: "https://optimism-goerli.infura.io/v3/",
  42161: "ttps://arbitrum-mainnet.infura.io/v3/",
};
