// lib/stakingContracts.ts
import type { Abi } from "viem";

/* ========================================================================== */
/*                               FACTORY ABI                                  */
/* ========================================================================== */

export const CONFIG_STAKING_FACTORY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_poolImplementation", type: "address" },
      { internalType: "address", name: "_protocolFeeRecipient", type: "address" },
      { internalType: "uint16", name: "_protocolFeeBps", type: "uint16" },
      { internalType: "uint16", name: "_maxTotalFeeBps", type: "uint16" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },

  // --- Errors ---
  { inputs: [], name: "FailedDeployment", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    name: "InsufficientBalance",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },

  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "pool", type: "address" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: true, internalType: "address", name: "nft", type: "address" },
      { indexed: false, internalType: "address", name: "rewardToken", type: "address" },
    ],
    name: "PoolCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint16", name: "protocolFeeBps", type: "uint16" },
      { indexed: false, internalType: "uint16", name: "maxTotalFeeBps", type: "uint16" },
      { indexed: false, internalType: "address", name: "recipient", type: "address" },
    ],
    name: "ProtocolFeeUpdated",
    type: "event",
  },

  // --- Functions ---
  {
    inputs: [
      {
        components: [
          { internalType: "contract IERC721", name: "nft", type: "address" },
          { internalType: "contract IERC20", name: "rewardToken", type: "address" },
          { internalType: "uint256", name: "rewardRate", type: "uint256" },
          { internalType: "uint64", name: "startTime", type: "uint64" },
          { internalType: "uint64", name: "endTime", type: "uint64" },
          { internalType: "uint64", name: "maxStaked", type: "uint64" },
          { internalType: "uint16", name: "creatorFeeBps", type: "uint16" },
          { internalType: "bool", name: "takeFeeOnClaim", type: "bool" },
          { internalType: "bool", name: "takeFeeOnUnstake", type: "bool" },
        ],
        internalType: "struct ConfigurableNftStakingFactory.CreatePoolInput",
        name: "p",
        type: "tuple",
      },
    ],
    name: "createPool",
    outputs: [{ internalType: "address", name: "pool", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [],
    name: "maxTotalFeeBps",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
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
    name: "poolImplementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolFeeBps",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolFeeRecipient",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      { internalType: "uint16", name: "_protocolFeeBps", type: "uint16" },
      { internalType: "uint16", name: "_maxTotalFeeBps", type: "uint16" },
      { internalType: "address", name: "_recipient", type: "address" },
    ],
    name: "setProtocolFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // --- Registry helpers (add these in Solidity too) ---
  {
    inputs: [],
    name: "allPoolsLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "allPools",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const satisfies Abi;

/* ========================================================================== */
/*                               POOL ABI                                     */
/* ========================================================================== */

export const CONFIG_STAKING_POOL_ABI = [
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "EmergencyWithdraw",
    type: "event",
  },

  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "factory", type: "address" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: true, internalType: "address", name: "nft", type: "address" },
      { indexed: false, internalType: "address", name: "rewardToken", type: "address" },
      { indexed: false, internalType: "uint256", name: "rewardRate", type: "uint256" },
      { indexed: false, internalType: "uint64", name: "startTime", type: "uint64" },
      { indexed: false, internalType: "uint64", name: "endTime", type: "uint64" },
      { indexed: false, internalType: "uint64", name: "maxStaked", type: "uint64" },
      { indexed: false, internalType: "uint16", name: "protocolFeeBps", type: "uint16" },
      { indexed: false, internalType: "uint16", name: "creatorFeeBps", type: "uint16" },
      { indexed: false, internalType: "bool", name: "takeFeeOnClaim", type: "bool" },
      { indexed: false, internalType: "bool", name: "takeFeeOnUnstake", type: "bool" },
    ],
    name: "Initialized",
    type: "event",
  },

  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "netAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feeProtocol", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feeCreator", type: "uint256" },
    ],
    name: "RewardPaid",
    type: "event",
  },

  // --- Views ---
  {
    inputs: [],
    name: "protocolFeeBps",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "creatorFeeBps",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "creator",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rewardRate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startTime",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "endTime",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "takeFeeOnClaim",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "takeFeeOnUnstake",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [{ internalType: "address", name: "userAddr", type: "address" }],
    name: "pendingRewards",
    outputs: [{ internalType: "uint256", name: "pendingGross", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "users",
    outputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "rewardDebt", type: "uint256" },
      { internalType: "uint256", name: "pending", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  // --- Actions ---
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const satisfies Abi;

/* ========================================================================== */
/*                               CONTRACT EXPORTS                             */
/* ========================================================================== */

// NOTE: all addresses normalized to lowercase to avoid checksum-case issues.
// Viem/wagmi are happy with lowercase, and we always compare via .toLowerCase().

export const CONFIG_STAKING_FACTORY = {
  address: "0x7c12acff6c84eca09be5fb09e14f2e4a5c9540d0" as `0x${string}`,
  abi: CONFIG_STAKING_FACTORY_ABI,
} as const;

// Use the real deploy block from Basescan if you know it to reduce log-scan range.
export const CONFIG_STAKING_FACTORY_DEPLOY_BLOCK = 0n as const;

export const BASEBOTS_STAKING_POOL = {
  address: "0xdd0274f98ef8b9e8edddb74593bb93aff60fe892" as `0x${string}`,
  abi: CONFIG_STAKING_POOL_ABI,
} as const;

/* ========================================================================== */
/*                              BASEBOTS NFT + TOKEN                          */
/* ========================================================================== */

export const BASEBOTS_NFT = {
  address: "0x92e29025fd6badd17c3005084fe8c43d928222b4" as `0x${string}`,
} as const;

export const BOTS_TOKEN = {
  address: "0xc45d7c40c9c65af95d33da5921f787d5cfd3ffcf" as `0x${string}`,
  decimals: 18,
  symbol: "BOTS",
} as const;
