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

## API endpoints

The following endpoints are available:

-   [GET /options/[networkId]/[marketId]](#get-optionsnetworkidmarketid)
-   [GET /watchlist/[networkId]/[marketId]](#)
-   [POST /watchlist](#)

### GET /options/[networkId]/[marketId]

Get the count of open orders on a market.

Example: https://api.thales.market/options/1/0x983522030d52cfee5a6cf5a076f55b1890ec78c5

Response body:

```javascript
15;
```

# thales-api

REST api endpoints to help with some dAPP features  
Available endpoints:

-   Get the count of open orders on a market TODO: add example
-   Read and write into the watchlist per user: TODO: add examples
