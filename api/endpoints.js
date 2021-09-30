const ENDPOINTS = {
  ROOT: "/",
  AUTH: "/auth/:walletAddress",
  DISPLAY_NAME: "/display-name",
  DISPLAY_NAME_ADDRESS: "/display-name/:walletAddress",
  OPTIONS: "/options/:networkParam/:addressParam",
  WATCHLIST: "/watchlist",
  WATCHLIST_ADDRESS: "/watchlist/:networkParam/:walletAddressParam",
  LEADERBOARD: "/leaderboard/:networkParam",
  TOKEN_PRICE: "/token/price",
  TOKEN_SUPLY: "/token/circulatingsupply",
  TOKEN_CAP: "/token/marketcap",
};

module.exports = ENDPOINTS;
