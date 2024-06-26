import axios from "axios";
import dotenv from "dotenv";
import { ethers } from "ethers";
import w3utils from "web3-utils";
import sportsAMMV2ContractAbi from "./sportsAMMV2ContractAbi.js"; // Sports AMM V2 contract ABI

dotenv.config();

const API_URL = "https://api.thalesmarket.io"; // base API URL

const NETWORK_ID = 10; // Optimism network ID
const NETWORK = "optimism"; // Optimism network
const SPORTS_AMM_V2_CONTRACT_ADDRESS = "0xFb4e4811C7A811E098A556bD79B64c20b479E431"; // Sports AMM V2 contract address on Optimism

const BUY_IN = 20; // 20 THALES
const COLLATERAL = "THALES"; // THALES
const COLLATERAL_DECIMALS = 18; // THALES decimals: 18
const COLLATERAL_ADDRESS = "0x217D47011b23BB961eB6D93cA9945B7501a5BB11"; // THALES contract address
const SLIPPAGE = 0.02; // slippage 2%
const REFERRAL_ADDRESS = "0x0000000000000000000000000000000000000000"; // referral address, set to ZERO address for testing

// create instance of Infura provider for Optimism network
const provider = new ethers.providers.InfuraProvider(
  { chainId: Number(NETWORK_ID), name: NETWORK },
  process.env.INFURA,
);

// create wallet instance for provided private key and provider
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// create instance of Sports AMM V2 contract
const sportsAMM = new ethers.Contract(SPORTS_AMM_V2_CONTRACT_ADDRESS, sportsAMMV2ContractAbi, wallet);

const getQuoteTradeData = (market, position) => {
  return {
    gameId: market.gameId,
    sportId: market.subLeagueId, // use subLeagueId field from API for sportId
    typeId: market.typeId,
    maturity: market.maturity,
    status: market.status,
    line: market.line,
    playerId: market.playerProps.playerId,
    odds: market.odds.map((odd) => odd.normalizedImplied), // use normalizedImplied odds field from API for odds
    merkleProof: market.proof, // use proof from API for merkleProof
    position,
    combinedPositions: market.combinedPositions,
    live: false,
  };
};

const getTradeData = (quoteTradeData) =>
  quoteTradeData.map((data) => ({
    ...data,
    // multiple lines by 100 because the contract can not accept decimals
    line: data.line * 100,
    // convert odds to BigNumber
    odds: data.odds.map((odd) => ethers.utils.parseEther(odd.toString()).toString()),
    // multiple combined positions lines by 100 because the contract can not accept decimals
    combinedPositions: data.combinedPositions.map((combinedPositions) =>
      combinedPositions.map((combinedPosition) => ({
        typeId: combinedPosition.typeId,
        position: combinedPosition.position,
        line: combinedPosition.line * 100,
      })),
    ),
  }));

const trade = async () => {
  try {
    // get a EURO 2024 markets from Overtime V2 API and ungroup them
    const marketsResponse = await axios.get(
      `${API_URL}/overtime-v2/networks/${NETWORK_ID}/markets?leagueId=50&ungroup=true`,
    );
    const markets = marketsResponse.data;

    // get a Slovakia - Romania child handicap market with line -1.5
    const slovakiaRomaniaHandicapMarket = markets[0].childMarkets[2];
    console.log(`Game: ${slovakiaRomaniaHandicapMarket.homeTeam} - ${slovakiaRomaniaHandicapMarket.awayTeam}`);
    // get a Ukraine - Belgium parent winner market
    const ukraineBelgiumWinnerMarket = markets[1];
    console.log(`Game: ${ukraineBelgiumWinnerMarket.homeTeam} - ${ukraineBelgiumWinnerMarket.awayTeam}`);

    // get a quote from Overtime V2 API for provided trade data (markets and positions), buy-in amount and collateral on Optimism network
    const quoteTradeData = [
      getQuoteTradeData(slovakiaRomaniaHandicapMarket, 1),
      getQuoteTradeData(ukraineBelgiumWinnerMarket, 1),
    ];
    const quoteResponse = await axios.post(`${API_URL}/overtime-v2/networks/${NETWORK_ID}/quote`, {
      buyInAmount: BUY_IN,
      tradeData: quoteTradeData,
      collateral: COLLATERAL,
    });
    const quote = quoteResponse.data;
    console.log("========== Quote ==========", quote);
    /* ========== Quote ==========
    {
      quoteData: {
        totalQuote: {
          american: -132.9670329668595,
          decimal: 1.7520661157034605,
          normalizedImplied: 0.5707547169808125
        },
        payout: {
          THALES: 35.04132231406921,
          usd: 8.913986776864496,
          payoutCollateral: 'THALES'
        },
        potentialProfit: {
          THALES: 15.041322314069212,
          usd: 3.826286776864496,
          percentage: 0.7520661157034605
        },
        buyInAmountInUsd: 5.0877
      },
      liquidityData: { ticketLiquidityInUsd: 19098 }
    }
    */

    // convert total quote got from API to BigNumber
    const parsedTotalQuote = ethers.utils.parseEther(quote.quoteData.totalQuote.normalizedImplied.toString());
    // convert buy-in amount to BigNumber
    const parsedBuyInAmount = ethers.utils.parseUnits(BUY_IN.toString(), COLLATERAL_DECIMALS);
    // convert slippage tolerance to BigNumber
    const parsedSlippage = ethers.utils.parseEther(SLIPPAGE.toString());

    // call trade method on Sports AMM V2 contract
    const tx = await sportsAMM.trade(
      getTradeData(quoteTradeData),
      parsedBuyInAmount,
      parsedTotalQuote,
      parsedSlippage,
      REFERRAL_ADDRESS,
      COLLATERAL_ADDRESS,
      false,
      {
        type: 2,
        maxPriorityFeePerGas: w3utils.toWei("0.00000000000000001"),
      },
    );
    // wait for the result
    const txResult = await tx.wait();
    console.log(`Successfully bought a ticket from Sports AMM V2. Transaction hash: ${txResult.transactionHash}`);
    /*
    Successfully bought a ticket from Sports AMM V2. Transaction hash: 0xe65638720344cc110b77f14f4276be61e7cd767f490927c195f11813c6d39901
    */
  } catch (e) {
    console.log("Failed to buy a ticket from Sports AMM V2", e);
  }
};

trade();
