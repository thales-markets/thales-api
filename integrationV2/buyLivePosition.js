import axios from "axios";
import bytes32 from "bytes32";
import dotenv from "dotenv";
import { ethers } from "ethers";
import w3utils from "web3-utils";
import liveTradingProcessorContractAbi from "./liveTradingProcessorContractAbi.js"; // Live Trading Processor contract ABI

dotenv.config();

const API_URL = "https://api.thalesmarket.io"; // base API URL

const NETWORK_ID = 10; // Optimism network ID
const NETWORK = "optimism"; // Optimism network
const LIVE_TRADING_PROCCESSOR_CONTRACT_ADDRESS = "0x3b834149F21B9A6C2DDC9F6ce97F2FD1097F8EAB"; // Live Trading Processor contract address on Optimism

const BUY_IN = 10; // 20 USDC
const POSITION = 2; // draw
const COLLATERAL_DECIMALS = 6; // USDC decimals: 6
const COLLATERAL_ADDRESS = "0x0000000000000000000000000000000000000000"; // USDC contract address (can be ZERO address since USDC is default collateral)
const SLIPPAGE = 0.02; // slippage 2%
const REFERRAL_ADDRESS = "0x0000000000000000000000000000000000000000"; // referral address, set to ZERO address for testing

// create instance of Infura provider for Optimism network
const provider = new ethers.providers.InfuraProvider(
  { chainId: Number(NETWORK_ID), name: NETWORK },
  process.env.INFURA,
);

// create wallet instance for provided private key and provider
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// create instance of Live Trading Processor contract
const liveTradingProcessor = new ethers.Contract(
  LIVE_TRADING_PROCCESSOR_CONTRACT_ADDRESS,
  liveTradingProcessorContractAbi,
  wallet,
);

const delay = (time) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
};

const convertFromBytes32 = (value) => {
  const result = bytes32({ input: value });
  return result.replace(/\0/g, "");
};

const buyLivePosition = async () => {
  try {
    // get live markets from Overtime V2 API
    const marketsResponse = await axios.get(`${API_URL}/overtime-v2/networks/${NETWORK_ID}/live-markets`);
    const markets = marketsResponse.data.markets;

    // get a Tokyo Verdy 1969 - Consadole Sapporo market
    const market = markets[2];
    console.log(`Game: ${market.homeTeam} - ${market.awayTeam}`);

    // convert market odds got from API to BigNumber
    const parsedQuote = ethers.utils.parseEther(market.odds[POSITION].normalizedImplied.toString());
    // convert buy-in amount to BigNumber
    const parsedBuyInAmount = ethers.utils.parseUnits(BUY_IN.toString(), COLLATERAL_DECIMALS);
    // convert slippage tolerance to BigNumber
    const parsedSlippage = ethers.utils.parseEther(SLIPPAGE.toString());

    // get max allowed execution delay from Live Trading Processor contract
    const maxAllowedExecutionDelay = Number(await liveTradingProcessor.maxAllowedExecutionDelay());

    // call trade method on Sports AMM V2 contract
    const tx = await liveTradingProcessor.requestLiveTrade(
      {
        _gameId: convertFromBytes32(market.gameId), // use converted from bytes32 gameId field from API for gameId
        _sportId: market.subLeagueId, // use subLeagueId field from API for sportId
        _typeId: market.typeId,
        _position: POSITION,
        _line: market.line * 100, // multiple lines by 100 because the contract can not accept decimals
        _buyInAmount: parsedBuyInAmount,
        _expectedQuote: parsedQuote,
        _additionalSlippage: parsedSlippage,
        _referrer: REFERRAL_ADDRESS,
        _collateral: COLLATERAL_ADDRESS,
      },
      {
        type: 2,
        maxPriorityFeePerGas: w3utils.toWei("0.00000000000000001"),
      },
    );

    // wait for the result
    const txResult = await tx.wait();
    if (txResult) {
      console.log("Live trade requested. Fulfilling live trade...");

      const requestId = txResult.events.find((event) => event.event === "LiveTradeRequested").args[2];

      let requestInProgress = true;
      const startTime = Date.now();
      console.log(`Fulfill start time: ${new Date(startTime)}`);

      while (requestInProgress) {
        const isFulfilled = await liveTradingProcessor.requestIdToFulfillAllowed(requestId);
        console.log(`Is fulfilled: ${isFulfilled}`);
        if (isFulfilled) {
          console.log(`Fulfill end time: ${new Date(Date.now())}`);
          console.log(`Fulfill duration: ${(Date.now() - startTime) / 1000} seconds`);
          console.log(`Successfully bought live position from Sports AMM V2`);
          requestInProgress = false;
        } else {
          // Add buffer of 10 seconds to wait for request to start execution
          if (Date.now() - startTime >= (Number(maxAllowedExecutionDelay) + 10) * 1000) {
            console.log("Odds changed while fulfilling the order. Try increasing the slippage.");
            requestInProgress = false;
          } else {
            await delay(1000);
          }
        }
      }
    }
  } catch (e) {
    console.log("Failed to buy live position from Sports AMM V2", e);
  }
};

buyLivePosition();
