// Basebots (on-chain SVG robots)
// Network: Base
export const BASEBOTS = {
  address: "0xe36cf57cf3684c73bed170072f086f68ff3e6cfe" as const,
  abi: [
    // -------- Constructor --------
    {
      "inputs": [
        { "internalType": "address", "name": "initialOwner", "type": "address" },
        { "internalType": "address", "name": "royaltyReceiver", "type": "address" },
        { "internalType": "uint96",  "name": "royaltyBps",     "type": "uint96" }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },

    // -------- Custom Errors --------
    { "inputs": [], "name": "AlreadyMinted",   "type": "error" },
    { "inputs": [], "name": "BadSig",          "type": "error" },
    { "inputs": [], "name": "ConfigFrozen",    "type": "error" },
    { "inputs": [], "name": "DirectETH",       "type": "error" },
    { "inputs": [], "name": "FIDRequired",     "type": "error" },
    { "inputs": [], "name": "IncorrectPrice",  "type": "error" },
    { "inputs": [], "name": "MaxSupply",       "type": "error" },
    { "inputs": [], "name": "Nonexistent",     "type": "error" },
    { "inputs": [], "name": "SigExpired",      "type": "error" },
    { "inputs": [], "name": "UseMintWithSig",  "type": "error" },
    { "inputs": [], "name": "VerifierUnset",   "type": "error" },

    // -------- Events --------
    { "anonymous": false, "inputs": [], "name": "EIP712DomainChanged", "type": "event" },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true,  "internalType": "address", "name": "minter", "type": "address" },
        { "indexed": true,  "internalType": "uint256", "name": "fid",    "type": "uint256" }
      ],
      "name": "Minted", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [{ "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }],
      "name": "MintPriceSet", "type": "event"
    },
    { "anonymous": false, "inputs": [], "name": "ConfigFrozenSet", "type": "event" },
    {
      "anonymous": false,
      "inputs": [{ "indexed": false, "internalType": "bool", "name": "paused", "type": "bool" }],
      "name": "PausedSet", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true,  "internalType": "address", "name": "receiver", "type": "address" },
        { "indexed": false, "internalType": "uint96",  "name": "bps",      "type": "uint96" }
      ],
      "name": "RoyaltySet", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [{ "indexed": false, "internalType": "string", "name": "desc", "type": "string" }],
      "name": "CollectionDescriptionSet", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [{ "indexed": false, "internalType": "string", "name": "uri", "type": "string" }],
      "name": "CollectionURISet", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [{ "indexed": true, "internalType": "address", "name": "verifier", "type": "address" }],
      "name": "FidVerifierSet", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [{ "indexed": false, "internalType": "bool", "name": "enabled", "type": "bool" }],
      "name": "FidGatingSet", "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true,  "internalType": "address", "name": "previousOwner", "type": "address" },
        { "indexed": true,  "internalType": "address", "name": "newOwner",      "type": "address" }
      ],
      "name": "OwnershipTransferred", "type": "event"
    },

    // -------- Constants / Views --------
    { "inputs": [], "name": "MAX_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "mintPrice",  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "configFrozen", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "totalMinted",  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "collectionDescription", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "collectionURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "fidVerifier",   "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "fidGatingEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "hasMinted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },

    // OZ: metadata & interface
    { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "contractURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },

    // EIP-712 helper view (OZ v5 exposes this)
    {
      "inputs": [],
      "name": "eip712Domain",
      "outputs": [
        { "internalType": "bytes1",   "name": "fields",            "type": "bytes1" },
        { "internalType": "string",   "name": "name",              "type": "string" },
        { "internalType": "string",   "name": "version",           "type": "string" },
        { "internalType": "uint256",  "name": "chainId",           "type": "uint256" },
        { "internalType": "address",  "name": "verifyingContract", "type": "address" },
        { "internalType": "bytes32",  "name": "salt",              "type": "bytes32" },
        { "internalType": "uint256[]","name": "extensions",        "type": "uint256[]" }
      ],
      "stateMutability": "view",
      "type": "function"
    },

    // ERC-2981 royalty view
    {
      "inputs": [
        { "internalType": "uint256", "name": "tokenId",  "type": "uint256" },
        { "internalType": "uint256", "name": "salePrice","type": "uint256" }
      ],
      "name": "royaltyInfo",
      "outputs": [
        { "internalType": "address", "name": "receiver", "type": "address" },
        { "internalType": "uint256", "name": "royaltyAmount", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },

    // -------- Admin --------
    { "inputs": [{ "internalType": "uint256", "name": "newPrice", "type": "uint256" }], "name": "setMintPrice", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "string",  "name": "desc",     "type": "string"  }], "name": "setCollectionDescription", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "string",  "name": "uri",      "type": "string"  }], "name": "setCollectionURI", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    {
      "inputs": [
        { "internalType": "address", "name": "receiver",     "type": "address" },
        { "internalType": "uint96",  "name": "feeNumerator", "type": "uint96"  }
      ],
      "name": "setDefaultRoyalty",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    { "inputs": [{ "internalType": "bool",    "name": "p", "type": "bool" }], "name": "setPaused", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "freezeConfig", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "verifier", "type": "address" }], "name": "setFidVerifier", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "bool",    "name": "enabled",  "type": "bool" }], "name": "setFidGatingEnabled", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

    // Ownable
    { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

    // -------- Minting --------
    {
      "inputs": [{ "internalType": "uint256", "name": "fid", "type": "uint256" }],
      "name": "mint",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "fid",      "type": "uint256" },
        { "internalType": "uint256", "name": "deadline", "type": "uint256" },
        { "internalType": "bytes",   "name": "sig",      "type": "bytes" }
      ],
      "name": "mintWithSig",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ] as const
};
