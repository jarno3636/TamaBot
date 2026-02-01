// lib/abi/basebotsSeason2State.ts

export const BASEBOTS_SEASON2_STATE_ADDRESS =
  "0x285F757236a7D53BdA5025051FD90f10795d7599" as const;

export const BASEBOTS_SEASON2_STATE_ABI = [
  /* ─────────────── ERRORS ─────────────── */
  { type: "error", name: "AlreadyFinalized", inputs: [] },
  { type: "error", name: "DesignationAlreadySet", inputs: [] },
  { type: "error", name: "FinalizedState", inputs: [] },
  { type: "error", name: "IncorrectRespecFee", inputs: [] },
  { type: "error", name: "InvalidDesignation", inputs: [] },
  { type: "error", name: "InvalidEnum", inputs: [] },
  { type: "error", name: "InvalidFID", inputs: [] },
  { type: "error", name: "SequenceViolation", inputs: [] },

  /* ─────────────── EVENTS ─────────────── */
  {
    type: "event",
    name: "BatchMetadataUpdate",
    anonymous: false,
    inputs: [
      { indexed: false, name: "fromFid", type: "uint256" },
      { indexed: false, name: "toFid", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "EpisodeSet",
    anonymous: false,
    inputs: [
      { indexed: true, name: "fid", type: "uint256" },
      { indexed: true, name: "episode", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "Finalized",
    anonymous: false,
    inputs: [
      { indexed: true, name: "fid", type: "uint256" },
      { indexed: false, name: "outcome", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "MetadataUpdate",
    anonymous: false,
    inputs: [{ indexed: true, name: "fid", type: "uint256" }],
  },
  {
    type: "event",
    name: "Respec",
    anonymous: false,
    inputs: [{ indexed: true, name: "fid", type: "uint256" }],
  },

  /* ─────────────── READS ─────────────── */

  {
    type: "function",
    name: "CURRENT_SCHEMA_VERSION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "FEE_RECIPIENT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "RESPEC_FEE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },

  {
    type: "function",
    name: "getBotState",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "designation", type: "bytes7" },
          { name: "ep1Choice", type: "uint8" },
          { name: "cognitionBias", type: "uint8" },
          { name: "profile", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "schemaVersion", type: "uint8" },
          { name: "finalized", type: "bool" },
          { name: "ep1Set", type: "bool" },
          { name: "ep2Set", type: "bool" },
          { name: "ep3Set", type: "bool" },
          { name: "ep4Set", type: "bool" },
          { name: "ep5Set", type: "bool" },
          { name: "updatedAt", type: "uint40" },
          { name: "finalizedAt", type: "uint40" },
        ],
      },
    ],
  },

  {
    type: "function",
    name: "getDisplayName",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [{ type: "string" }],
  },

  {
    type: "function",
    name: "getGlobalStats",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalFinalized_", type: "uint64" },
      { name: "ep1Counts", type: "uint64[5]" },
      { name: "biasCounts", type: "uint64[5]" },
      { name: "profileCounts", type: "uint64[5]" },
      { name: "outcomeCounts", type: "uint64[6]" },
    ],
  },

  {
    type: "function",
    name: "getTotalFinalized",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },

  {
    type: "function",
    name: "ep1Count",
    stateMutability: "view",
    inputs: [{ name: "c", type: "uint8" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "biasCount",
    stateMutability: "view",
    inputs: [{ name: "b", type: "uint8" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "profileCount",
    stateMutability: "view",
    inputs: [{ name: "p", type: "uint8" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "outcomeCount",
    stateMutability: "view",
    inputs: [{ name: "o", type: "uint8" }],
    outputs: [{ type: "uint64" }],
  },

  /* ─────────────── WRITES ─────────────── */

  {
    type: "function",
    name: "setEpisode1",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "choice", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setEpisode2Designation",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "designation", type: "bytes7" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setEpisode3",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "bias", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setEpisode4Profile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "profile", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [],
  },

  {
    type: "function",
    name: "respec",
    stateMutability: "payable",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [],
  },
] as const;

/* ─────────────────────────────────────────────
 * Wagmi-friendly export
 * ───────────────────────────────────────────── */

export const BASEBOTS_S2 = {
  address: BASEBOTS_SEASON2_STATE_ADDRESS,
  abi: BASEBOTS_SEASON2_STATE_ABI,
} as const;
