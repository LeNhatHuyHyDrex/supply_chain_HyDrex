export const CONTRACT_ADDRESS = "0xdEec868C61019eE6cc367AEeD883A5e27a9A0f99";

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "origin",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "updater",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "locationData",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "latitude",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "longitude",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "condition",
        "type": "string"
      }
    ],
    "name": "ProductAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum SupplyChain.Status",
        "name": "status",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "updater",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "locationData",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "latitude",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "longitude",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "condition",
        "type": "string"
      }
    ],
    "name": "ProductStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "supplier",
        "type": "address"
      }
    ],
    "name": "SupplierAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "supplier",
        "type": "address"
      }
    ],
    "name": "SupplierRemoved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_origin",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_locationData",
        "type": "string"
      },
      {
        "internalType": "int256",
        "name": "_latitude",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "_longitude",
        "type": "int256"
      }
    ],
    "name": "addProduct",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_supplier",
        "type": "address"
      }
    ],
    "name": "addSupplier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "authorizedSuppliers",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllProducts",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "origin",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "enum SupplyChain.Status",
                "name": "status",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "updater",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "locationData",
                "type": "string"
              },
              {
                "internalType": "int256",
                "name": "latitude",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "longitude",
                "type": "int256"
              },
              {
                "internalType": "string",
                "name": "condition",
                "type": "string"
              }
            ],
            "internalType": "struct SupplyChain.TrackingUpdate[]",
            "name": "history",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct SupplyChain.Product[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "getProduct",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "origin",
        "type": "string"
      },
      {
        "components": [
          {
            "internalType": "enum SupplyChain.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "updater",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "locationData",
            "type": "string"
          },
          {
            "internalType": "int256",
            "name": "latitude",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "longitude",
            "type": "int256"
          },
          {
            "internalType": "string",
            "name": "condition",
            "type": "string"
          }
        ],
        "internalType": "struct SupplyChain.TrackingUpdate[]",
        "name": "history",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "getProductHistory",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum SupplyChain.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "updater",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "locationData",
            "type": "string"
          },
          {
            "internalType": "int256",
            "name": "latitude",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "longitude",
            "type": "int256"
          },
          {
            "internalType": "string",
            "name": "condition",
            "type": "string"
          }
        ],
        "internalType": "struct SupplyChain.TrackingUpdate[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "productCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "productIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "products",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "origin",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_supplier",
        "type": "address"
      }
    ],
    "name": "removeSupplier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_status",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_locationData",
        "type": "string"
      },
      {
        "internalType": "int256",
        "name": "_latitude",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "_longitude",
        "type": "int256"
      },
      {
        "internalType": "string",
        "name": "_condition",
        "type": "string"
      }
    ],
    "name": "updateProductStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
