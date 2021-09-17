const ENDPOINTS = {
    ROOT: "/",
    OPTIONS: "/options/:networkParam/:addressParam",
    WATCHLIST: "/watchlist",
    WATCHLIST_ADDRESS: "/watchlist/:networkParam/:walletAddressParam",
    DISPLAY_NAME: "/display-name",
    DISPLAY_NAME_ADDRESS: "/display-name/:walletAddress",
    LEADERBOARD: "/leaderboard/:networkParam",
    AUTH: "/auth/:walletAddress",
    TWITTER_CHECK: "/twitter/:walletAddress",
    TOKEN: "/token",
};

module.exports = ENDPOINTS;
