const { ethers } = require("ethers");
const fetch = require("node-fetch");
const pythContractObj = require("../contracts/pythContract.js");
const { PRICE_ID, LATEST_VAAS_URL } = require("../constants/pyth");
const { getProvider } = require("../utils/provider");

const getPythPriceData = async (network, asset) => {
  const pythData = { priceUpdateData: [], updateFee: 0 };

  try {
    const provider = getProvider(network);
    const pythContract = new ethers.Contract(pythContractObj.addresses[network], pythContractObj.abi, provider);

    const priceId = PRICE_ID[asset];

    const priceUpdateDataResponse = await fetch(LATEST_VAAS_URL + priceId);
    const [priceUpdateDataParsed] = JSON.parse(await priceUpdateDataResponse.text());

    const priceUpdateData = ["0x" + Buffer.from(priceUpdateDataParsed, "base64").toString("hex")];
    const updateFee = await pythContract.getUpdateFee(priceUpdateData);

    pythData.priceUpdateData = priceUpdateData;
    pythData.updateFee = updateFee;
  } catch (e) {
    console.log("Error: could not get pyth price.", e);
  }

  return pythData;
};

module.exports = { getPythPriceData };
