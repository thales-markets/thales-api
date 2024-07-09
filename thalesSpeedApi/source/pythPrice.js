const { ethers } = require("ethers");
const fetch = require("node-fetch");
const pythContractObj = require("../contracts/pythContract.js");
const {
  PRICE_ID,
  LATEST_PRICE_UPDATE_URL,
  HISTORICAL_PRICE_UPDATE_URL,
  PYTH_CURRENCY_DECIMALS,
} = require("../constants/pyth");
const { getProvider } = require("../utils/provider");
const { bigNumberFormatter } = require("../utils/formatters");

const getPythLatestPriceData = async (network, asset) => {
  const pythData = { priceUpdateData: [], updateFee: 0, pythPrice: 0 };

  try {
    const provider = getProvider(network);
    const pythContract = new ethers.Contract(pythContractObj.addresses[network], pythContractObj.abi, provider);

    const priceId = PRICE_ID[asset];

    const latestPriceUpdateResponse = await fetch(`${LATEST_PRICE_UPDATE_URL}${priceId}`);
    const latestPriceUpdate = JSON.parse(await latestPriceUpdateResponse.text());

    const priceUpdateData = ["0x" + latestPriceUpdate.binary.data[0]];
    const updateFee = await pythContract.getUpdateFee(priceUpdateData);
    const pythPrice = bigNumberFormatter(latestPriceUpdate.parsed[0].price.price, PYTH_CURRENCY_DECIMALS);

    pythData.priceUpdateData = priceUpdateData;
    pythData.updateFee = updateFee;
    pythData.pythPrice = pythPrice;
  } catch (e) {
    console.log("Error: could not get latest pyth price data.", e);
  }

  return pythData;
};

const getPythHistoricalPricesData = async (network, assetsAndTimes) => {
  const pythDataArray = Array(assetsAndTimes.length).fill({ priceUpdateData: [], updateFee: 0, pythPrice: 0 });

  try {
    const promises = [];
    for (const assetAndTime of assetsAndTimes) {
      const priceId = PRICE_ID[assetAndTime.asset];
      promises.push(fetch(`${HISTORICAL_PRICE_UPDATE_URL}${assetAndTime.time}?ids[]=${priceId}`));
    }

    const historicalPriceUpdateResponses = await Promise.allSettled(promises);

    const historicalPriceUpdateBodies = historicalPriceUpdateResponses.map((historicalPriceUpdateResponse, i) => {
      if (historicalPriceUpdateResponse.status === "fulfilled") {
        if (historicalPriceUpdateResponse.value) {
          if (historicalPriceUpdateResponse.value.status == 200) {
            return historicalPriceUpdateResponse.value.text();
          } else {
            const priceId = PRICE_ID[assetsAndTimes[i].asset];
            console.log(
              `Failed to fetch Pyth historical data for time: ${assetsAndTimes[i].time} and id: ${priceId}. Status: ${historicalPriceUpdateResponse.value.status}`,
            );
          }
        }
      }
    });

    const pythResponses = await Promise.all(historicalPriceUpdateBodies);

    const parsedPythResponses = pythResponses.map((response) => (response ? JSON.parse(response) : undefined));

    const pythPriceDataArray = assetsAndTimes.map((_, i) => {
      const priceUpdateData = parsedPythResponses[i] ? ["0x" + parsedPythResponses[i].binary.data[0]] : [];
      const pythPrice = parsedPythResponses[i]
        ? bigNumberFormatter(parsedPythResponses[i].parsed[0].price.price, PYTH_CURRENCY_DECIMALS)
        : 0;

      return { priceUpdateData, pythPrice };
    });

    const provider = getProvider(network);
    const pythContract = new ethers.Contract(pythContractObj.addresses[network], pythContractObj.abi, provider);

    for (let i = 0; i < pythPriceDataArray.length; i++) {
      const priceUpdateData = pythPriceDataArray[i].priceUpdateData;
      const updateFee = priceUpdateData.length ? await pythContract.getUpdateFee(priceUpdateData) : 0;
      const pythPrice = pythPriceDataArray[i].pythPrice;

      pythDataArray[i] = {
        priceUpdateData,
        updateFee,
        pythPrice,
      };
    }
  } catch (e) {
    console.log("Error: could not get historical pyth price data.", e);
  }

  return pythDataArray;
};

module.exports = { getPythLatestPriceData, getPythHistoricalPricesData };
