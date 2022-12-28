require("dotenv").config();

const redis = require("redis");
thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
fetch = require("node-fetch");
const { delay } = require("./services/utils");

const RANGED_AMM = "0x2d356b114cbca8deff2d8783eac2a5a5324fe1df";
const VAULT_DISCOUNT = "0xb484027cb0c538538bad2be492714154f9196f93";
const VAULT_DEGEN = "0x9d3abeaf22ddf68e72b865ca3b23ed880a3be41f";
const VAULT_SAFU = "0x6c7fd4321183b542e81bcc7de4dfb88f9dbca29f";

const periodMap = new Map();

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
        await processRewards(10);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }
      await delay(5 * 1000);

      // try {
      //   console.log("process orders on kovan optimism");
      //   await processOrders(69);
      // } catch (error) {
      //   console.log("orders on optimism error: ", error);
      // }
      // await delay(5 * 1000);
    }
  }, 3000);
}

async function processOrders(network) {
  const START_DATE = new Date(2022, 6, 13, 12, 23, 0);

  for (let period = 0; period < 7; period++) {
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
    let globalVolumeDiscounted = 0;

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
      if (
        trade.account.toLowerCase() !== RANGED_AMM &&
        trade.account.toLowerCase() !== VAULT_DISCOUNT &&
        trade.account.toLowerCase() !== VAULT_DEGEN &&
        trade.account.toLowerCase() !== VAULT_SAFU
      ) {
        if (trade.type === "buyUp") {
          globalVolumeUp = globalVolumeUp + trade.amount;
        }
        if (trade.type === "buyDown") {
          globalVolumeDown = globalVolumeDown + trade.amount;
        }
        if (trade.type === "buyRanged") {
          globalVolumeRanged = globalVolumeRanged + trade.amount;
        }
        if (trade.type === "buyDiscounted") {
          globalVolumeDiscounted = globalVolumeDiscounted + trade.amount;
        }
      }
    });

    // console.log("globalVolumeUp: ", globalVolumeUp);
    // console.log("globalVolumeDown: ", globalVolumeDown);
    // console.log("globalVolumeRanged: ", globalVolumeRanged);

    trades.map((trade) => {
      if (
        trade.account.toLowerCase() !== RANGED_AMM &&
        trade.account.toLowerCase() !== VAULT_DISCOUNT &&
        trade.account.toLowerCase() !== VAULT_DEGEN &&
        trade.account.toLowerCase() !== VAULT_SAFU
      ) {
        if (!arrUsers.get(trade.account)) {
          arrUsers.set(trade.account, initUserAddress(trade.account));
        }
        const user = arrUsers.get(trade.account);
        if (trade.type === "buyUp") {
          user.up.volume = user.up.volume + trade.amount;
          user.up.percentage = user.up.volume / globalVolumeUp;
          user.up.rewards.op = user.up.percentage * (period < 6 ? 11000 : 9000);
          user.up.rewards.thales = user.up.percentage * (period < 6 ? 20000 : 15000);
        }
        if (trade.type === "buyDown") {
          user.down.volume = user.down.volume + trade.amount;
          user.down.percentage = user.down.volume / globalVolumeDown;
          user.down.rewards.op = user.down.percentage * (period < 6 ? 11000 : 9000);
          user.down.rewards.thales = user.down.percentage * (period < 6 ? 20000 : 15000);
        }
        if (trade.type === "buyRanged") {
          user.ranged.volume = user.ranged.volume + trade.amount;
          user.ranged.percentage = user.ranged.volume / globalVolumeRanged;
          user.ranged.rewards.op = user.ranged.percentage * (period < 6 ? 6000 : 5000);
          user.ranged.rewards.thales = user.ranged.percentage * 10000;
        }
        if (period >= 6) {
          if (trade.type === "buyDiscounted") {
            user.discounted.volume = user.discounted.volume + trade.amount;
            user.discounted.percentage = user.discounted.volume / globalVolumeDiscounted;
            user.discounted.rewards.op = user.discounted.percentage * 5000;
            user.discounted.rewards.thales = user.discounted.percentage * 10000;
          }
        }

        arrUsers.set(trade.account, user);
      }
    });

    const finalArray = Array.from(arrUsers.values()).map((user) => {
      user.totalRewards.op =
        user.stackingRewards +
        user.up.rewards.op +
        user.down.rewards.op +
        user.ranged.rewards.op +
        user.discounted.rewards.op;
      user.totalRewards.thales =
        user.up.rewards.thales + user.down.rewards.thales + user.ranged.rewards.thales + user.discounted.rewards.thales;
      return user;
    });

    periodMap.set(period, finalArray);
  }

  redisClient.set(KEYS.OP_REWARDS[network], JSON.stringify([...periodMap]), function () {});
}

async function processRewards(network) {
  const START_DATE = new Date(2022, 6, 13, 12, 23, 0);

  for (let period = 7; period < 16; period++) {
    console.log("**** Period: ", period);
    const startDate = new Date(START_DATE.getTime());
    startDate.setDate(START_DATE.getDate() + period * 14);
    console.log("start date: ", startDate);

    if (startDate > new Date()) {
      break;
    }
    const endDate = new Date(START_DATE.getTime());
    endDate.setDate(START_DATE.getDate() + (period + 1) * 14);
    console.log("end date: ", endDate);
    const arrUsers = new Map();
    let globalITM = 0;
    let globalOTM = 0;
    let globalDSC = 0;

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

    const trades = await thalesData.binaryOptions.rewards({
      network: network,
      minTimestamp: parseInt(startDate.getTime() / 1000),
      maxTimestamp: parseInt(endDate.getTime() / 1000),
    });

    trades.map((trade) => {
      if (
        trade.account.toLowerCase() !== RANGED_AMM &&
        trade.account.toLowerCase() !== VAULT_DISCOUNT &&
        trade.account.toLowerCase() !== VAULT_DEGEN &&
        trade.account.toLowerCase() !== VAULT_SAFU
      ) {
        if (trade.type === "ITM") {
          globalITM = globalITM + trade.amount;
        }
        if (trade.type === "OTM") {
          globalOTM = globalOTM + trade.amount;
        }
        if (trade.type === "DSC") {
          globalDSC = globalDSC + trade.amount;
        }
      }
    });

    // console.log("globalVolumeUp: ", globalVolumeUp);
    // console.log("globalVolumeDown: ", globalVolumeDown);
    // console.log("globalVolumeRanged: ", globalVolumeRanged);

    trades.map((trade) => {
      if (
        trade.account.toLowerCase() !== RANGED_AMM &&
        trade.account.toLowerCase() !== VAULT_DISCOUNT &&
        trade.account.toLowerCase() !== VAULT_DEGEN &&
        trade.account.toLowerCase() !== VAULT_SAFU
      ) {
        if (!arrUsers.get(trade.account)) {
          arrUsers.set(trade.account, initUserAddress(trade.account));
        }
        const user = arrUsers.get(trade.account);
        if (period < 12) {
          if (trade.type === "ITM") {
            user.itm.volume = user.itm.volume + trade.amount;
            user.itm.percentage = user.itm.volume / globalITM;
            user.itm.rewards.op = user.itm.percentage * (period < 10 ? 5000 : 2000);
            user.itm.rewards.thales = user.itm.percentage * (period < 10 ? 7000 : 3000);
          }
          if (trade.type === "OTM") {
            user.otm.volume = user.otm.volume + trade.amount;
            user.otm.percentage = user.otm.volume / globalOTM;
            user.otm.rewards.op = user.otm.percentage * 5000;
            user.otm.rewards.thales = user.otm.percentage * 7000;
          }
          if (trade.type === "DSC") {
            user.discounted.volume = user.discounted.volume + trade.amount;
            user.discounted.percentage = user.discounted.volume / globalDSC;
            user.discounted.rewards.op = user.discounted.percentage * (period < 10 ? 5000 : 8000);
            user.discounted.rewards.thales = user.discounted.percentage * (period < 10 ? 7000 : 10000);
          }
          arrUsers.set(trade.account, user);
        } else {
          if (trade.type === "DSC") {
            user.discounted.volume = user.discounted.volume + trade.amount;
            user.discounted.percentage = user.discounted.volume / globalDSC;
            user.discounted.rewards.op = user.discounted.percentage * 8000;
          }
          arrUsers.set(trade.account, user);
        }
      }
    });

    const finalArray = Array.from(arrUsers.values()).map((user) => {
      user.totalRewards.op =
        user.stackingRewards + user.itm.rewards.op + user.otm.rewards.op + user.discounted.rewards.op;
      user.totalRewards.thales = user.itm.rewards.thales + user.otm.rewards.thales + user.discounted.rewards.thales;
      return user;
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
    discounted: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    itm: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    otm: {
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
    discounted: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    itm: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    otm: {
      volume: 0,
      percentage: 0,
      rewards: { op: 0, thales: 0 },
    },
    totalRewards: { op: 0, thales: 0 },
  };
  return user;
}
