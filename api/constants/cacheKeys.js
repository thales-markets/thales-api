const PREFIX_KEYS = {
  Stakers: "stakers-",
  ClaimOnBehalfItems: "claim-on-behalf",
  TokenTransactions: "token-transactions",
  DigitalOptions: {
    LiquidityPoolPnl: "digital-options-liquidity-pool-pnl-",
    LiquidityPoolTransactions: "digital-options-liquidity-pool-tx-",

    Markets: "digital-options-markets-",
    RangedMarkets: "digital-options-ranged-markets",

    Trades: "digital-options-trades-",
    OptionTransactions: "digital-options-option-transactions-",
    PositionBalance: "digital-options-position-balance",
    RangePositionBalance: "digital-options-range-position-balance",

    ReferralTransactions: "digital-options-referral-transactions",
    ReferredTraders: "digital-options-referred-traders",
    Referrers: "digital-options-referrers",

    VaultUserTransactions: "digital-options-vault-user-transactions",
    VaultPnl: "digital-options-vault-pnl",
    VaultTransactions: "digital-options-vault-transactions",
  },

  VaultUserTransactions: "vault-user-transactions",
  VaultPnl: "vault-pnl",
  VaultTransactions: "vault-transactions",
};

module.exports = {
  PREFIX_KEYS,
};
