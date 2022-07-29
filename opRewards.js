require("dotenv").config();

const redis = require("redis");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");

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
      await delay(5 * 60 * 1000);

      try {
        console.log("process orders on kovan optimism");
        await processOrders(69);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }
      await delay(5 * 60 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const START_DATE = new Date(2022, 6, 13, 12, 23, 0);
  const periodMap = new Map();

  for (let period = 0; period < 8; period++) {
    const startDate = new Date(START_DATE.getTime());
    startDate.setDate(START_DATE.getDate() + period * 14);

    if (startDate > new Date()) {
      break;
    }
    const endDate = new Date(START_DATE.getTime());
    endDate.setDate(START_DATE.getDate() + (period + 1) * 14);

    const arrUsers = new Map();
    let globalVolumeUp = 0;
    let globalVolumeDown = 0;
    let globalVolumeRanged = 0;

    const transactions = await thalesData.binaryOptions.tokenTransactions({
      network: network,
      onlyWithProtocolReward: true,
      minTimestamp: parseInt(startDate.getTime() / 1000),
      maxTimestamp: parseInt(endDate.getTime() / 1000),
    });

    transactions.map((tx) => {
      if (!arrUsers.get(tx.account)) {
        arrUsers.set(tx.account, initUser(tx));
      } else {
        const user = arrUsers.get(tx.account);
        user.stackingRewards = user.stackingRewards + tx.protocolRewards * 0.64;
        arrUsers.set(tx.account, user);
      }
    });

    const trades = await thalesData.binaryOptions.accountBuyVolumes({
      network: network,
      minTimestamp: parseInt(startDate.getTime() / 1000),
      maxTimestamp: parseInt(endDate.getTime() / 1000),
    });

    trades.map((trade) => {
      if (trade.account.toLowerCase() !== "0x2d356b114cbCA8DEFf2d8783EAc2a5A5324fE1dF".toLowerCase()) {
        if (trade.type === "buyUp") {
          globalVolumeUp = globalVolumeUp + trade.amount;
        }
        if (trade.type === "buyDown") {
          globalVolumeDown = globalVolumeDown + trade.amount;
        }
        if (trade.type === "buyRanged") {
          globalVolumeRanged = globalVolumeRanged + trade.amount;
        }
      }
    });

    // console.log("globalVolumeUp: ", globalVolumeUp);
    // console.log("globalVolumeDown: ", globalVolumeDown);
    // console.log("globalVolumeRanged: ", globalVolumeRanged);

    trades.map((trade) => {
      if (trade.account.toLowerCase() !== "0x2d356b114cbCA8DEFf2d8783EAc2a5A5324fE1dF".toLowerCase()) {
        if (!arrUsers.get(trade.account)) {
          arrUsers.set(trade.account, initUserAddress(trade.account));
        }
        const user = arrUsers.get(trade.account);
        if (trade.type === "buyUp") {
          user.up.volume = user.up.volume + trade.amount;
          user.up.percentage = user.up.volume / globalVolumeUp;
          user.up.rewards.op = user.up.percentage * 11000;
          user.up.rewards.thales = user.up.percentage * 20000;
        }
        if (trade.type === "buyDown") {
          user.down.volume = user.down.volume + trade.amount;
          user.down.percentage = user.down.volume / globalVolumeDown;
          user.down.rewards.op = user.down.percentage * 11000;
          user.down.rewards.thales = user.down.percentage * 20000;
        }
        if (trade.type === "buyRanged") {
          user.ranged.volume = user.ranged.volume + trade.amount;
          user.ranged.percentage = user.ranged.volume / globalVolumeRanged;
          user.ranged.rewards.op = user.ranged.percentage * 6000;
          user.ranged.rewards.thales = user.ranged.percentage * 10000;
        }
        arrUsers.set(trade.account, user);
      }
    });

    const finalArray = Array.from(arrUsers.values()).map((data) => {
      data.totalRewards.op = data.stackingRewards + data.up.rewards.op + data.down.rewards.op + data.ranged.rewards.op;
      data.totalRewards.thales = data.up.rewards.thales + data.down.rewards.thales + data.ranged.rewards.thales;
      return data;
    });

    periodMap.set(period, finalArray);
  }

  redisClient.set(KEYS.OP_REWARDS[network], JSON.stringify([...periodMap]), function () {});
}

function initUser(tx) {
  const user = {
    address: tx.account,
    stackingRewards: tx.protocolRewards * 0.64,
    up: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    down: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    ranged: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    totalRewards: { op: 0, thales: 0 },
  };
  return user;
}

function initUserAddress(address) {
  const user = {
    address: address,
    stackingRewards: 0,
    up: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    down: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    ranged: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    totalRewards: { op: 0, thales: 0 },
  };
  return user;
}
