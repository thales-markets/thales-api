# Thales API

[![Discord](https://img.shields.io/discord/906484044915687464.svg?color=768AD4&label=discord&logo=https%3A%2F%2Fdiscordapp.com%2Fassets%2F8c9701b98ad4372b58f13fd9f65f966e.svg)](https://discord.com/invite/rB3AWKwACM)
[![Twitter Follow](https://img.shields.io/twitter/follow/thalesmarket.svg?label=thalesmarket&style=social)](https://twitter.com/thalesmarket)

The REST API to help with some dApp features.

The API is available on [api.thales.market](https://api.thales.market).

## Tech stack

- Node.js
- Express
- Redis
- [thales-data](https://github.com/thales-markets/thales-data)

## Development

### Install dependencies

```bash
npm i
```

### Run

```bash
npm run dev
```

Runs the API in the development mode on [http://localhost:3002](http://localhost:3002).

## API endpoints

The following endpoints are available:

- [GET /token/price](#get-tokenprice)
- [GET /token/circulatingsupply](#get-tokencirculatingsupply)
- [GET /token/marketcap](#get-tokenmarketcap)
- [GET /token/totalsupply](#get-tokentotalsupply)
- [GET /parlay-leaderboard/[networkId]/[period]](#get-parlayleaderboardnetworkIdperiod)

### GET /token/price

Get current THALES price.

Example: https://api.thalesmarket.io/token/price

Response body:

```json
0.52
```

### GET /token/circulatingsupply

Get current THALES circulating supply.

Example: https://api.thalesmarket.io/token/circulatingsupply

Response body:

```json
44589461
```

### GET /token/marketcap

Get current THALES market cap.

Example: https://api.thalesmarket.io/token/marketcap

Response body:

```json
21287365
```

### GET /token/totalsupply

Get current THALES total supply.

Example: https://api.thalesmarket.io/token/totalsupply

Response body:

```json
99091000
```

### GET /parlay-leaderboard/[networkId]/[period]

Get parlay leaderboard for requested network and period.

Example: https://api.thalesmarket.io/parlay-leaderboard/10/1

Response :

```json
[
   {
      "id":"0x13a71c494d76c551934e3379929b8371634a8c26",
      "txHash":"0x99a52d8d3c07e5ce58a861a7ed29f419352c130c158ea",
      "sportMarkets":[
         ...
      ],
      "sportMarketsFromContract":[
         ...
      ],
      "positions":[
         ...
      ],
      "positionsFromContract":[
         ...
      ],
      "marketQuotes":[
         ...
      ],
      "account":"0x04433729c268aa34abb4d2a9da924ee81717bdae",
      "totalAmount":304,
      "sUSDPaid":8,
      "sUSDAfterFees":7.6,
      "totalQuote":0.025,
      "skewImpact":0.16,
      "timestamp":1679857157000,
      "lastGameStarts":1679871600000,
      "blockNumber":"83890766",
      "claimed":true,
      "won":true,
      "numberOfPositions":8,
      "rank":1
   }
]
```
