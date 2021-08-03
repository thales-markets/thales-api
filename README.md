# Thales API

[![Discord](https://img.shields.io/discord/816415414404907089.svg?color=768AD4&label=discord&logo=https%3A%2F%2Fdiscordapp.com%2Fassets%2F8c9701b98ad4372b58f13fd9f65f966e.svg)](https://discord.com/invite/cFGv5zyVEj)
[![Twitter Follow](https://img.shields.io/twitter/follow/thalesmarket.svg?label=thalesmarket&style=social)](https://twitter.com/thalesmarket)

The REST API to help with some dApp feautures.

The API is available on [api.thales.market](https://api.thales.market).

## Tech stack

-   Node.js
-   Express
-   Redis
-   [thales-data](https://github.com/thales-markets/thales-data)

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

-   [GET /options/[networkId]/[marketId]](#get-optionsnetworkidmarketid)
-   [GET /watchlist/[networkId]/[wallet]](#get-optionsnetworkidwallet)
-   [POST /watchlist](#post-watchlist)

### GET /options/[networkId]/[marketId]

Get the count of open orders on a market.

Example: https://api.thales.market/options/1/0x983522030d52cfee5a6cf5a076f55b1890ec78c5

Response body:

```json
15
```

### GET /watchlist/[networkId]/[wallet]

Read the markets watchlist per user's wallet.

Example: https://api.thales.market/watchlist/1/0x4284Cd22fE319Fd7ECd060480b240FcdCB075D11

Response body:

```json
{
    "data": [
        "0x75bbbfe4b4f2a7e9d3b0e97c74d83c9998c387b5",
        "0x84c58576ae251819073b04d52c8251b3ac97e6a0",
        "0x47c4da7f94471f4490f805b061ba88310627bd25"
    ]
}
```

### POST /watchlist

Add the market to the user's watchlist.

Example: https://api.thales.market/watchlist

Request body:

```json
{
    "networkId": 1,
    "walletAddress": "0x4284Cd22fE319Fd7ECd060480b240FcdCB075D11",
    "marketAddress": "0x47c4da7f94471f4490f805b061ba88310627bd25"
}
```

Response body:

```json
{
    "data": [
        "0x75bbbfe4b4f2a7e9d3b0e97c74d83c9998c387b5",
        "0x84c58576ae251819073b04d52c8251b3ac97e6a0",
        "0x47c4da7f94471f4490f805b061ba88310627bd25"
    ]
}
```
