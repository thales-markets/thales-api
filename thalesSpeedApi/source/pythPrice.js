const { ethers } = require("ethers");
const fetch = require("node-fetch");
const pythContractObj = require("../contracts/pythContract.js");
const { PRICE_ID, LATEST_PRICE_UPDATE_URL, PYTH_CURRENCY_DECIMALS } = require("../constants/pyth");
const { getProvider } = require("../utils/provider");
const { bigNumberFormatter } = require("../utils/formatters");

const getPythPriceData = async (network, asset) => {
  const pythData = { priceUpdateData: [], updateFee: 0, pythPrice: 0 };

  try {
    const provider = getProvider(network);
    const pythContract = new ethers.Contract(pythContractObj.addresses[network], pythContractObj.abi, provider);

    const priceId = PRICE_ID[asset];

    const latestPriceUpdateResponse = await fetch(LATEST_PRICE_UPDATE_URL + priceId);
    const latestPriceUpdate = JSON.parse(await latestPriceUpdateResponse.text());

    const priceUpdateData = ["0x" + latestPriceUpdate.binary.data[0]];
    const updateFee = await pythContract.getUpdateFee(priceUpdateData);
    const pythPrice = bigNumberFormatter(latestPriceUpdate.parsed[0].price.price, PYTH_CURRENCY_DECIMALS);

    pythData.priceUpdateData = priceUpdateData;
    pythData.updateFee = updateFee;
    pythData.pythPrice = pythPrice;
  } catch (e) {
    console.log("Error: could not get pyth price.", e);
  }

  return pythData;
};

module.exports = { getPythPriceData };
