const ENDPOINTS = {
  ROOT: "/",
  AUTH: "/auth/:walletAddress",
  DISPLAY_NAME: "/display-name",
  DISPLAY_NAME_ADDRESS: "/display-name/:walletAddress",
  OPTIONS: "/options/:networkParam/:addressParam",
  ORDERS: "/orders/:networkParam",
  WATCHLIST: "/watchlist",
  WATCHLIST_ADDRESS: "/watchlist/:networkParam/:walletAddressParam",
  LEADERBOARD: "/leaderboard/:networkParam",
  COMPETITION: "/competition/:networkParam",
  PROFILES: "/profiles/:networkParam",
  TOKEN_PRICE: "/token/price",
  TOKEN_SUPLY: "/token/circulatingsupply",
  TOKEN_CAP: "/token/marketcap",
  TWITTER: "/twitter",
  TWITTER_ADDRESS: "/twitter/:walletAddress",
  VERIFIED_USERS: "/verified-users",
  ETH_BURNED: "/utils/ethburned",
};

module.exports = ENDPOINTS;
