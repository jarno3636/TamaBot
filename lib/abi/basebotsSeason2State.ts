// src/lib/abi/basebotsSeason2State.ts

export const BASEBOTS_SEASON2_STATE_ADDRESS =
  "0x738f3febff6dacee3b4b9dfb339128f6e94f0e8d" as const;

export const BASEBOTS_SEASON2_STATE_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "basebotsNft", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },

  /* ─────────────── ERRORS ─────────────── */
  { "inputs": [], "name": "AlreadyFinalized", "type": "error" },
  { "inputs": [], "name": "BonusBitOutOfRange", "type": "error" },
  { "inputs": [], "name": "DesignationAlreadySet", "type": "error" },
  { "inputs": [], "name": "EpisodeAlreadySet", "type": "error" },
  { "inputs": [], "name": "Finalized", "type": "error" },
  { "inputs": [], "name": "InvalidDesignation", "type": "error" },
  { "inputs": [], "name": "InvalidEnum", "type": "error" },
  { "inputs": [], "name": "MustProvideMissingFields", "type": "error" },
  { "inputs": [], "name": "NotTokenOwner", "type": "error" },
  { "inputs": [], "name": "SchemaMismatch", "type": "error" },
  { "inputs": [], "name": "SequenceViolation", "type": "error" },

  /* ─────────────── EVENTS ─────────────── */
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "_fromTokenId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "_toTokenId", "type": "uint256" }
    ],
    "name": "BatchMetadataUpdate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": true, "internalType": "uint8", "name": "episodeNumber", "type": "uint8" }
    ],
    "name": "EpisodeSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "outcome", "type": "uint8" },
      { "indexed": false, "internalType": "uint16", "name": "bonusFlags", "type": "uint16" }
    ],
    "name": "FinalizedProfile",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_tokenId", "type": "uint256" }],
    "name": "MetadataUpdate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "MigratedToV2",
    "type": "event"
  },

  /* ─────────────── READS ─────────────── */
  {
    "inputs": [],
    "name": "getGlobalStats",
    "outputs": [
      { "internalType": "uint64", "name": "totalFinalized", "type": "uint64" },
      { "internalType": "uint64[5]", "name": "ep1Counts", "type": "uint64[5]" },
      { "internalType": "uint64[5]", "name": "biasCounts", "type": "uint64[5]" },
      { "internalType": "uint64[5]", "name": "profileCounts", "type": "uint64[5]" },
      { "internalType": "uint64[6]", "name": "outcomeCounts", "type": "uint64[6]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "getBotState",
    "outputs": [
      { "internalType": "bytes7", "name": "designation", "type": "bytes7" },
      { "internalType": "uint8", "name": "ep1Choice", "type": "uint8" },
      { "internalType": "uint8", "name": "cognitionBias", "type": "uint8" },
      { "internalType": "uint8", "name": "profile", "type": "uint8" },
      { "internalType": "uint8", "name": "outcome", "type": "uint8" },
      { "internalType": "uint16", "name": "bonusFlags", "type": "uint16" },
      { "internalType": "uint8", "name": "schemaVersion", "type": "uint8" },
      { "internalType": "bool", "name": "finalized", "type": "bool" },
      { "internalType": "bool", "name": "ep1Set", "type": "bool" },
      { "internalType": "bool", "name": "ep2Set", "type": "bool" },
      { "internalType": "bool", "name": "ep3Set", "type": "bool" },
      { "internalType": "bool", "name": "ep4Set", "type": "bool" },
      { "internalType": "bool", "name": "ep5Set", "type": "bool" },
      { "internalType": "uint40", "name": "updatedAt", "type": "uint40" },
      { "internalType": "uint40", "name": "finalizedAt", "type": "uint40" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  /* ─────────────── WRITES ─────────────── */
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "uint8", "name": "choice", "type": "uint8" }],
    "name": "setEpisode1",
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes7", "name": "designation", "type": "bytes7" }],
    "name": "setEpisode2Designation",
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "uint8", "name": "bias", "type": "uint8" }],
    "name": "setEpisode3",
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "uint8", "name": "profile", "type": "uint8" }],
    "name": "setEpisode4Profile",
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "uint8", "name": "outcome", "type": "uint8" }, { "internalType": "uint16", "name": "bonusFlags", "type": "uint16" }],
    "name": "finalizeAndLock",
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
