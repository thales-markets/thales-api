const NetworkId = {
  Mainnet: 1,
  Ropsten: 3,
  Rinkeby: 4,
  Goerli: 5,
  Kovan: 42,
  Optimism: 10,
  OptimismKovan: 69,
  OptimismGoerli: 420,
  Mumbai: 80001,
  Polygon: 137,
  BSC: 56,
  Arbitrum: 42161,
};

const positionalMarketDataContract = {
  addresses: {
    [NetworkId.Mainnet]: "TBD",
    [NetworkId.Ropsten]: "TBD",
    [NetworkId.Rinkeby]: "TBD",
    [NetworkId.Kovan]: "TBD",
    // added to resolve error with typings
    [NetworkId.Goerli]: "", // TODO: goerli network remove or implement
    [NetworkId.Optimism]: "0x21382a033E581a2D685826449d6c9b3d6507e23C",
    [NetworkId.OptimismKovan]: "TBD",
    [NetworkId.OptimismGoerli]: "0x21C7684d27113E06e8B4Fe0114b0c74DEDFCC328",
    [NetworkId.Mumbai]: "0xd6BEd7D753DCbbbb8937Dd009788d6c815aE3094",
    [NetworkId.Polygon]: "TBD",
    [NetworkId.BSC]: "0x28D2e5e76b2E99e7e6fe4F43ebf669aAC16b89Ba",
    [NetworkId.Arbitrum]: "0x036adEA6bc1fD0247c2796f8D201B28C0dC2a67d",
  },
  abi: [
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: "address", name: "oldOwner", type: "address" },
        { indexed: false, internalType: "address", name: "newOwner", type: "address" },
      ],
      name: "OwnerChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: "address", name: "newOwner", type: "address" }],
      name: "OwnerNominated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: "bool", name: "isPaused", type: "bool" }],
      name: "PauseChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: "address", name: "_manager", type: "address" }],
      name: "PositionalMarketManagerChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: "address", name: "_rangedMarketsAMM", type: "address" }],
      name: "SetRangedMarketsAMM",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: "address", name: "_thalesAMM", type: "address" }],
      name: "SetThalesAMM",
      type: "event",
    },
    { inputs: [], name: "acceptOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
    {
      inputs: [
        { internalType: "contract PositionalMarket", name: "market", type: "address" },
        { internalType: "address", name: "account", type: "address" },
      ],
      name: "getAccountMarketData",
      outputs: [
        {
          components: [
            {
              components: [
                { internalType: "uint256", name: "up", type: "uint256" },
                { internalType: "uint256", name: "down", type: "uint256" },
              ],
              internalType: "struct PositionalMarketData.OptionValues",
              name: "balances",
              type: "tuple",
            },
          ],
          internalType: "struct PositionalMarketData.AccountData",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getLiquidityForAllActiveMarkets",
      outputs: [
        {
          components: [
            { internalType: "address", name: "market", type: "address" },
            { internalType: "uint256", name: "upLiquidity", type: "uint256" },
            { internalType: "uint256", name: "downLiquidity", type: "uint256" },
          ],
          internalType: "struct PositionalMarketData.ActiveMarketsLiquidity[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "contract PositionalMarket", name: "market", type: "address" }],
      name: "getMarketData",
      outputs: [
        {
          components: [
            {
              components: [
                { internalType: "uint256", name: "price", type: "uint256" },
                { internalType: "uint256", name: "updatedAt", type: "uint256" },
              ],
              internalType: "struct PositionalMarketData.OraclePriceAndTimestamp",
              name: "oraclePriceAndTimestamp",
              type: "tuple",
            },
            {
              components: [{ internalType: "uint256", name: "deposited", type: "uint256" }],
              internalType: "struct PositionalMarketData.Deposits",
              name: "deposits",
              type: "tuple",
            },
            {
              components: [
                { internalType: "bool", name: "resolved", type: "bool" },
                { internalType: "bool", name: "canResolve", type: "bool" },
              ],
              internalType: "struct PositionalMarketData.Resolution",
              name: "resolution",
              type: "tuple",
            },
            { internalType: "enum IPositionalMarket.Phase", name: "phase", type: "uint8" },
            { internalType: "enum IPositionalMarket.Side", name: "result", type: "uint8" },
            {
              components: [
                { internalType: "uint256", name: "up", type: "uint256" },
                { internalType: "uint256", name: "down", type: "uint256" },
              ],
              internalType: "struct PositionalMarketData.OptionValues",
              name: "totalSupplies",
              type: "tuple",
            },
          ],
          internalType: "struct PositionalMarketData.MarketData",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "contract PositionalMarket", name: "market", type: "address" }],
      name: "getMarketParameters",
      outputs: [
        {
          components: [
            { internalType: "address", name: "creator", type: "address" },
            {
              components: [
                { internalType: "contract Position", name: "up", type: "address" },
                { internalType: "contract Position", name: "down", type: "address" },
              ],
              internalType: "struct PositionalMarket.Options",
              name: "options",
              type: "tuple",
            },
            {
              components: [
                { internalType: "uint256", name: "maturity", type: "uint256" },
                { internalType: "uint256", name: "expiry", type: "uint256" },
              ],
              internalType: "struct PositionalMarket.Times",
              name: "times",
              type: "tuple",
            },
            {
              components: [
                { internalType: "bytes32", name: "key", type: "bytes32" },
                { internalType: "uint256", name: "strikePrice", type: "uint256" },
                { internalType: "uint256", name: "finalPrice", type: "uint256" },
                { internalType: "bool", name: "customMarket", type: "bool" },
                { internalType: "address", name: "iOracleInstanceAddress", type: "address" },
              ],
              internalType: "struct PositionalMarket.OracleDetails",
              name: "oracleDetails",
              type: "tuple",
            },
            {
              components: [
                { internalType: "uint256", name: "poolFee", type: "uint256" },
                { internalType: "uint256", name: "creatorFee", type: "uint256" },
              ],
              internalType: "struct PositionalMarketManager.Fees",
              name: "fees",
              type: "tuple",
            },
          ],
          internalType: "struct PositionalMarketData.MarketParameters",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getPriceImpactForAllActiveMarkets",
      outputs: [
        {
          components: [
            { internalType: "address", name: "market", type: "address" },
            { internalType: "int256", name: "upPriceImpact", type: "int256" },
            { internalType: "int256", name: "downPriceImpact", type: "int256" },
          ],
          internalType: "struct PositionalMarketData.ActiveMarketsPriceImpact[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getPricesForAllActiveMarkets",
      outputs: [
        {
          components: [
            { internalType: "address", name: "market", type: "address" },
            { internalType: "uint256", name: "upPrice", type: "uint256" },
            { internalType: "uint256", name: "downPrice", type: "uint256" },
          ],
          internalType: "struct PositionalMarketData.ActiveMarketsPrices[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "contract RangedMarket", name: "market", type: "address" }],
      name: "getRangedMarketPricesAndLiquidity",
      outputs: [
        {
          components: [
            { internalType: "uint256", name: "inPrice", type: "uint256" },
            { internalType: "uint256", name: "outPrice", type: "uint256" },
            { internalType: "uint256", name: "inLiquidity", type: "uint256" },
            { internalType: "uint256", name: "outLiquidity", type: "uint256" },
          ],
          internalType: "struct PositionalMarketData.RangedMarketPricesAndLiqudity",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_owner", type: "address" }],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "lastPauseTime",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "manager",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_owner", type: "address" }],
      name: "nominateNewOwner",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "nominatedOwner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "paused",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rangedMarketsAMM",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_owner", type: "address" }],
      name: "setOwner",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bool", name: "_paused", type: "bool" }],
      name: "setPaused",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_manager", type: "address" }],
      name: "setPositionalMarketManager",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_rangedMarketsAMM", type: "address" }],
      name: "setRangedMarketsAMM",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_thalesAMM", type: "address" }],
      name: "setThalesAMM",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "thalesAMM",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "proxyAddress", type: "address" }],
      name: "transferOwnershipAtInit",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
};

module.exports = positionalMarketDataContract;
