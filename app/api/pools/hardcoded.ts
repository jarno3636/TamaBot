// app/api/pools/hardcoded.ts
import { isAddress } from "viem";

export type HardcodedPool = {
  pool: `0x${string}`;
  creator: `0x${string}`;
  nft: `0x${string}`;
  rewardToken: `0x${string}`;
  chainId?: number;
};

const CREATOR = "0xB37c91305F50e3CdB0D7a048a18d7536c9524f58" as const;
const NFT = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as const;
const REWARD_TOKEN = "0xc45d7c40c9c65aF95d33da5921F787D5cFD3FFcf" as const;

// Add pool addresses here as you create them.
// NOTE: you mentioned two pools but only provided one address so far.
// Add the 2nd pool address as a new entry when you have it.
export const HARDCODED_POOLS: HardcodedPool[] = [
  {
    pool: "0x7c12aCFf6C84ECA09BE5fb09e14F2E4A5c9540D0",
    creator: CREATOR,
    nft: NFT,
    rewardToken: REWARD_TOKEN,
    chainId: 8453,
  },
].map((p) => {
  // normalize + validate once at boot
  const pool = p.pool.toLowerCase();
  const creator = p.creator.toLowerCase();
  const nft = p.nft.toLowerCase();
  const rewardToken = p.rewardToken.toLowerCase();

  if (![pool, creator, nft, rewardToken].every(isAddress)) {
    throw new Error(`[HARDCODED_POOLS] Invalid address in entry: ${JSON.stringify(p)}`);
  }

  return {
    ...p,
    pool: pool as `0x${string}`,
    creator: creator as `0x${string}`,
    nft: nft as `0x${string}`,
    rewardToken: rewardToken as `0x${string}`,
  };
});
