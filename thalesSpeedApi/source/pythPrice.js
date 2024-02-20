const { ethers } = require("ethers");
const fetch = require("node-fetch");
const pythContractObj = require("../contracts/pythContract.js");
const { PRICE_ID, LATEST_VAAS_URL, LATEST_PRICE_FEEDS_URL, PYTH_CURRENCY_DECIMALS } = require("../constants/pyth");
const { getProvider } = require("../utils/provider");
const { bigNumberFormatter } = require("../utils/formatters");

const getPythPriceData = async (network, asset) => {
  const pythData = { priceUpdateData: [], updateFee: 0, currentPrice: 0 };

  try {
    const provider = getProvider(network);
    const pythContract = new ethers.Contract(pythContractObj.addresses[network], pythContractObj.abi, provider);

    const priceId = PRICE_ID[asset];

    const [priceUpdateDataResponse, priceFeedResponse] = await Promise.all([
      fetch(LATEST_VAAS_URL + priceId),
      fetch(LATEST_PRICE_FEEDS_URL + priceId),
    ]);
    const [priceUpdateDataParsed] = JSON.parse(await priceUpdateDataResponse.text());
    const priceFeed = JSON.parse(await priceFeedResponse.text());

    const priceUpdateData = ["0x" + Buffer.from(priceUpdateDataParsed, "base64").toString("hex")];
    const updateFee = await pythContract.getUpdateFee(priceUpdateData);

    pythData.priceUpdateData = priceUpdateData;
    pythData.updateFee = updateFee;
    pythData.currentPrice = bigNumberFormatter(priceFeed[0].price.price, PYTH_CURRENCY_DECIMALS);
  } catch (e) {
    console.log("Error: could not get pyth price.", e);
  }

  return pythData;
};

module.exports = { getPythPriceData };
