const { redisClient } = require("./redis/client");
require("dotenv").config();

const thalesData = require("thales-data");
const KEYS = require("./redis/redis-keys");
const { delay } = require("./services/utils");

const RANGED_AMM = "0x2d356b114cbca8deff2d8783eac2a5a5324fe1df";
const VAULT_DISCOUNT = "0xb484027cb0c538538bad2be492714154f9196f93";
const VAULT_DEGEN = "0x43318de9e8f65b591598f17add87ae7247649c83";
const VAULT_SAFU = "0x6c7fd4321183b542e81bcc7de4dfb88f9dbca29f";

const THALES_REWARDS = [
  2000, 2000, 4000, 10000, 4000, 2000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000,
  4000,
];
const OP_REWARDS = [
  2000, 2000, 4000, 10000, 4000, 2000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000,
  4000,
];

const periodMap = new Map();

if (process.env.REDIS_URL) {
  console.log("create client from index");

  redisClient.on("error", function (error) {
    console.error(error);
  });
  setTimeout(async () => {
    while (true) {
      try {
        console.log("process orders on optimism");
        await processRewards(10);
      } catch (error) {
        console.log("orders on optimism error: ", error);
      }

      await delay(60 * 1000);
    }
  }, 3000);
}

async function processRewards(network) {
  const START_DATE = new Date(2023, 3, 26, 12, 23, 0);

  for (let period = 0; period < 20; period++) {
    console.log("**** Period: ", period, " ****");
    const startDate = new Date(START_DATE.getTime());
    startDate.setDate(START_DATE.getDate() + period * 7);
    console.log("start date: ", startDate);

    if (startDate > new Date()) {
      break;
    }

    const midDate1 = new Date(START_DATE.getTime());
    midDate1.setDate(START_DATE.getDate() + (period + 1) * 7 - 5);
    const midDate2 = new Date(START_DATE.getTime());
    midDate2.setDate(START_DATE.getDate() + (period + 1) * 7 - 2);
    const endDate = new Date(START_DATE.getTime());
    endDate.setDate(START_DATE.getDate() + (period + 1) * 7);
    console.log("end date: ", endDate);

    const arrUsers = new Map();
    let globalITM = 0;
    let globalOTM = 0;

    const trades1 = await thalesData.binaryOptions.rewards({
      network: network,
      periodStart: parseInt(startDate.getTime() / 1000),
      periodEnd: parseInt(midDate1.getTime() / 1000),
    });

    const trades2 = await thalesData.binaryOptions.rewards({
      network: network,
      periodStart: parseInt(midDate1.getTime() / 1000),
      periodEnd: parseInt(midDate2.getTime() / 1000),
    });

    const trades3 = await thalesData.binaryOptions.rewards({
      network: network,
      periodStart: parseInt(midDate2.getTime() / 1000),
      periodEnd: parseInt(endDate.getTime() / 1000),
    });

    const trades = [...trades1, ...trades2, ...trades3];

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

        if (trade.type === "OTM") {
          user.otm.volume = user.otm.volume + trade.amount;
          user.otm.percentage = user.otm.volume / globalOTM;
          user.otm.rewards.op = user.otm.percentage * OP_REWARDS[period];
          user.otm.rewards.thales = user.otm.percentage * THALES_REWARDS[period];
        }
        if (trade.type === "ITM") {
          user.itm.volume = user.itm.volume + trade.amount;
          user.itm.percentage = user.itm.volume / globalITM;
          user.itm.rewards.op = user.itm.percentage * OP_REWARDS[period];
          user.itm.rewards.thales = user.itm.percentage * THALES_REWARDS[period];
        }

        arrUsers.set(trade.account, user);
      }
    });

    const finalArray = Array.from(arrUsers.values()).map((user) => {
      user.totalRewards.op = user.itm.rewards.op + user.otm.rewards.op;
      user.totalRewards.thales = user.itm.rewards.thales + user.otm.rewards.thales;
      return user;
    });

    periodMap.set(period + 1, finalArray);
  }

  redisClient.set(KEYS.OP_REWARDS_V2[network], JSON.stringify([...periodMap]), function () {});
}

function initUserAddress(address) {
  const user = {
    address: address,
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
