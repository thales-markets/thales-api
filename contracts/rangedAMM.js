const NetworkId = {
  Mainnet: 1,
  Ropsten: 3,
  Rinkeby: 4,
  Goerli: 5,
  Kovan: 42,
  Optimism: 10,
  OptimismKovan: 69,
  Mumbai: 80001,
  Polygon: 137,
};

const rangedAMMContract = {
  addresses: {
    [NetworkId.Mainnet]: "TBD",
    [NetworkId.Ropsten]: "TBD",
    [NetworkId.Rinkeby]: "TBD",
    [NetworkId.Kovan]: "TBD",
    // added to resolve error with typings
    [NetworkId.Goerli]: "TBD", // TODO: goerli network remove or implement
    [NetworkId.Optimism]: "0x2d356b114cbCA8DEFf2d8783EAc2a5A5324fE1dF",
    [NetworkId.OptimismKovan]: "0x0690F410FB54d76268e4fa97486CBD605e68dC62",
    [NetworkId.Mumbai]: "TBD",
    [NetworkId.Polygon]: "TBD",
  },
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "buyer",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "market",
          type: "address",
        },
        {
          indexed: false,
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "sUSDPaid",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "address",
          name: "susd",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "asset",
          type: "address",
        },
      ],
      name: "BoughtFromAmm",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "oldOwner",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnerChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnerNominated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "bool",
          name: "isPaused",
          type: "bool",
        },
      ],
      name: "PauseChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "market",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "leftMarket",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "rightMarket",
          type: "address",
        },
      ],
      name: "RangedMarketCreated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "amm",
          type: "address",
        },
      ],
      name: "SetAmm",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "capPerMarket",
          type: "uint256",
        },
      ],
      name: "SetCapPerMarket",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_spread",
          type: "uint256",
        },
      ],
      name: "SetMaxSupportedPrice",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_spread",
          type: "uint256",
        },
      ],
      name: "SetMinSupportedPrice",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_spread",
          type: "uint256",
        },
      ],
      name: "SetMinimalDifBetweenStrikes",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "rangedAmmFee",
          type: "uint256",
        },
      ],
      name: "SetRangedAmmFee",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "sUSD",
          type: "address",
        },
      ],
      name: "SetSUSD",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "_safeBox",
          type: "address",
        },
      ],
      name: "SetSafeBox",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_safeBoxImpact",
          type: "uint256",
        },
      ],
      name: "SetSafeBoxImpact",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "_stakingThales",
          type: "address",
        },
      ],
      name: "SetStakingThales",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "amm",
          type: "address",
        },
      ],
      name: "SetThalesAMM",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "seller",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "market",
          type: "address",
        },
        {
          indexed: false,
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "sUSDPaid",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "address",
          name: "susd",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "asset",
          type: "address",
        },
      ],
      name: "SoldToAMM",
      type: "event",
    },
    {
      inputs: [],
      name: "acceptOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
      ],
      name: "availableToBuyFromAMM",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
      ],
      name: "availableToSellToAMM",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "expectedPayout",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "additionalSlippage",
          type: "uint256",
        },
      ],
      name: "buyFromAMM",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "buyFromAmmQuote",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "buyFromAmmQuoteDetailed",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "leftMarket",
          type: "address",
        },
        {
          internalType: "address",
          name: "rightMarket",
          type: "address",
        },
      ],
      name: "canCreateRangedMarket",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "capPerMarket",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "leftMarket",
          type: "address",
        },
        {
          internalType: "address",
          name: "rightMarket",
          type: "address",
        },
      ],
      name: "createRangedMarket",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "createdRangedMarkets",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "initNonReentrant",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_owner",
          type: "address",
        },
        {
          internalType: "contract IThalesAMM",
          name: "_thalesAmm",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_rangedAmmFee",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_capPerMarket",
          type: "uint256",
        },
        {
          internalType: "contract IERC20Upgradeable",
          name: "_sUSD",
          type: "address",
        },
        {
          internalType: "address",
          name: "_safeBox",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_safeBoxImpact",
          type: "uint256",
        },
      ],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "lastPauseTime",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "maxSupportedPrice",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
      ],
      name: "minInPrice",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "minSupportedPrice",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "minimalDifBetweenStrikes",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_owner",
          type: "address",
        },
      ],
      name: "nominateNewOwner",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "nominatedOwner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "paused",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rangedAmmFee",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rangedMarketMastercopy",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rangedPositionMastercopy",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "sUSD",
      outputs: [
        {
          internalType: "contract IERC20Upgradeable",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "safeBox",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "safeBoxImpact",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "expectedPayout",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "additionalSlippage",
          type: "uint256",
        },
      ],
      name: "sellToAMM",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "sellToAmmQuote",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
        {
          internalType: "enum RangedMarket.Position",
          name: "position",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "sellToAmmQuoteDetailed",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_capPerMarket",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_rangedAMMFee",
          type: "uint256",
        },
      ],
      name: "setCapPerMarketAndRangedAMMFee",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_minSupportedPrice",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_maxSupportedPrice",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_minDiffBetweenStrikes",
          type: "uint256",
        },
      ],
      name: "setMinMaxSupportedPrice",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_owner",
          type: "address",
        },
      ],
      name: "setOwner",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "_paused",
          type: "bool",
        },
      ],
      name: "setPaused",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_rangedMarketMastercopy",
          type: "address",
        },
      ],
      name: "setRangedMarketMastercopy",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_rangedPositionMastercopy",
          type: "address",
        },
      ],
      name: "setRangedPositionMastercopy",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_safeBox",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_safeBoxImpact",
          type: "uint256",
        },
      ],
      name: "setSafeBoxData",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract IStakingThales",
          name: "_stakingThales",
          type: "address",
        },
      ],
      name: "setStakingThales",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_thalesAMM",
          type: "address",
        },
      ],
      name: "setThalesAMM",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "spentOnMarket",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "stakingThales",
      outputs: [
        {
          internalType: "contract IStakingThales",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "thalesAmm",
      outputs: [
        {
          internalType: "contract IThalesAMM",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "proxyAddress",
          type: "address",
        },
      ],
      name: "transferOwnershipAtInit",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RangedMarket",
          name: "rangedMarket",
          type: "address",
        },
      ],
      name: "withdrawCollateral",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
};

module.exports = rangedAMMContract;
