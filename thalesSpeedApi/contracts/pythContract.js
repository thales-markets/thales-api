const { NETWORK } = require("../constants/networks");

const speedMarketsDataContract = {
  addresses: {
    [NETWORK.Optimism]: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    [NETWORK.OptimismGoerli]: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
    [NETWORK.Polygon]: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    [NETWORK.Arbitrum]: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    [NETWORK.Base]: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a",
    [NETWORK.ZkSync]: "0xf087c864AEccFb6A2Bf1Af6A0382B0d0f6c5D834",
    [NETWORK.ZkSyncSepolia]: "0x056f829183Ec806A78c26C98961678c24faB71af",
    [NETWORK.BlastSepolia]: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
  },
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint16",
          name: "chainId",
          type: "uint16",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "sequenceNumber",
          type: "uint64",
        },
      ],
      name: "BatchPriceFeedUpdate",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "publishTime",
          type: "uint64",
        },
        {
          indexed: false,
          internalType: "int64",
          name: "price",
          type: "int64",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "conf",
          type: "uint64",
        },
      ],
      name: "PriceFeedUpdate",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
      ],
      name: "getEmaPrice",
      outputs: [
        {
          components: [
            {
              internalType: "int64",
              name: "price",
              type: "int64",
            },
            {
              internalType: "uint64",
              name: "conf",
              type: "uint64",
            },
            {
              internalType: "int32",
              name: "expo",
              type: "int32",
            },
            {
              internalType: "uint256",
              name: "publishTime",
              type: "uint256",
            },
          ],
          internalType: "struct PythStructs.Price",
          name: "price",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "age",
          type: "uint256",
        },
      ],
      name: "getEmaPriceNoOlderThan",
      outputs: [
        {
          components: [
            {
              internalType: "int64",
              name: "price",
              type: "int64",
            },
            {
              internalType: "uint64",
              name: "conf",
              type: "uint64",
            },
            {
              internalType: "int32",
              name: "expo",
              type: "int32",
            },
            {
              internalType: "uint256",
              name: "publishTime",
              type: "uint256",
            },
          ],
          internalType: "struct PythStructs.Price",
          name: "price",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
      ],
      name: "getEmaPriceUnsafe",
      outputs: [
        {
          components: [
            {
              internalType: "int64",
              name: "price",
              type: "int64",
            },
            {
              internalType: "uint64",
              name: "conf",
              type: "uint64",
            },
            {
              internalType: "int32",
              name: "expo",
              type: "int32",
            },
            {
              internalType: "uint256",
              name: "publishTime",
              type: "uint256",
            },
          ],
          internalType: "struct PythStructs.Price",
          name: "price",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
      ],
      name: "getPrice",
      outputs: [
        {
          components: [
            {
              internalType: "int64",
              name: "price",
              type: "int64",
            },
            {
              internalType: "uint64",
              name: "conf",
              type: "uint64",
            },
            {
              internalType: "int32",
              name: "expo",
              type: "int32",
            },
            {
              internalType: "uint256",
              name: "publishTime",
              type: "uint256",
            },
          ],
          internalType: "struct PythStructs.Price",
          name: "price",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "age",
          type: "uint256",
        },
      ],
      name: "getPriceNoOlderThan",
      outputs: [
        {
          components: [
            {
              internalType: "int64",
              name: "price",
              type: "int64",
            },
            {
              internalType: "uint64",
              name: "conf",
              type: "uint64",
            },
            {
              internalType: "int32",
              name: "expo",
              type: "int32",
            },
            {
              internalType: "uint256",
              name: "publishTime",
              type: "uint256",
            },
          ],
          internalType: "struct PythStructs.Price",
          name: "price",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "id",
          type: "bytes32",
        },
      ],
      name: "getPriceUnsafe",
      outputs: [
        {
          components: [
            {
              internalType: "int64",
              name: "price",
              type: "int64",
            },
            {
              internalType: "uint64",
              name: "conf",
              type: "uint64",
            },
            {
              internalType: "int32",
              name: "expo",
              type: "int32",
            },
            {
              internalType: "uint256",
              name: "publishTime",
              type: "uint256",
            },
          ],
          internalType: "struct PythStructs.Price",
          name: "price",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "updateData",
          type: "bytes[]",
        },
      ],
      name: "getUpdateFee",
      outputs: [
        {
          internalType: "uint256",
          name: "feeAmount",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getValidTimePeriod",
      outputs: [
        {
          internalType: "uint256",
          name: "validTimePeriod",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "updateData",
          type: "bytes[]",
        },
        {
          internalType: "bytes32[]",
          name: "priceIds",
          type: "bytes32[]",
        },
        {
          internalType: "uint64",
          name: "minPublishTime",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "maxPublishTime",
          type: "uint64",
        },
      ],
      name: "parsePriceFeedUpdates",
      outputs: [
        {
          components: [
            {
              internalType: "bytes32",
              name: "id",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "int64",
                  name: "price",
                  type: "int64",
                },
                {
                  internalType: "uint64",
                  name: "conf",
                  type: "uint64",
                },
                {
                  internalType: "int32",
                  name: "expo",
                  type: "int32",
                },
                {
                  internalType: "uint256",
                  name: "publishTime",
                  type: "uint256",
                },
              ],
              internalType: "struct PythStructs.Price",
              name: "price",
              type: "tuple",
            },
            {
              components: [
                {
                  internalType: "int64",
                  name: "price",
                  type: "int64",
                },
                {
                  internalType: "uint64",
                  name: "conf",
                  type: "uint64",
                },
                {
                  internalType: "int32",
                  name: "expo",
                  type: "int32",
                },
                {
                  internalType: "uint256",
                  name: "publishTime",
                  type: "uint256",
                },
              ],
              internalType: "struct PythStructs.Price",
              name: "emaPrice",
              type: "tuple",
            },
          ],
          internalType: "struct PythStructs.PriceFeed[]",
          name: "priceFeeds",
          type: "tuple[]",
        },
      ],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "updateData",
          type: "bytes[]",
        },
        {
          internalType: "bytes32[]",
          name: "priceIds",
          type: "bytes32[]",
        },
        {
          internalType: "uint64",
          name: "minPublishTime",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "maxPublishTime",
          type: "uint64",
        },
      ],
      name: "parsePriceFeedUpdatesUnique",
      outputs: [
        {
          components: [
            {
              internalType: "bytes32",
              name: "id",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "int64",
                  name: "price",
                  type: "int64",
                },
                {
                  internalType: "uint64",
                  name: "conf",
                  type: "uint64",
                },
                {
                  internalType: "int32",
                  name: "expo",
                  type: "int32",
                },
                {
                  internalType: "uint256",
                  name: "publishTime",
                  type: "uint256",
                },
              ],
              internalType: "struct PythStructs.Price",
              name: "price",
              type: "tuple",
            },
            {
              components: [
                {
                  internalType: "int64",
                  name: "price",
                  type: "int64",
                },
                {
                  internalType: "uint64",
                  name: "conf",
                  type: "uint64",
                },
                {
                  internalType: "int32",
                  name: "expo",
                  type: "int32",
                },
                {
                  internalType: "uint256",
                  name: "publishTime",
                  type: "uint256",
                },
              ],
              internalType: "struct PythStructs.Price",
              name: "emaPrice",
              type: "tuple",
            },
          ],
          internalType: "struct PythStructs.PriceFeed[]",
          name: "priceFeeds",
          type: "tuple[]",
        },
      ],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "updateData",
          type: "bytes[]",
        },
      ],
      name: "updatePriceFeeds",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "updateData",
          type: "bytes[]",
        },
        {
          internalType: "bytes32[]",
          name: "priceIds",
          type: "bytes32[]",
        },
        {
          internalType: "uint64[]",
          name: "publishTimes",
          type: "uint64[]",
        },
      ],
      name: "updatePriceFeedsIfNecessary",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
  ],
};

module.exports = speedMarketsDataContract;
