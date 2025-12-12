// components/staking/stakingUtils.ts
import { parseUnits, formatUnits } from "viem";

export type FilterTab = "all" | "live" | "closed" | "my-staked" | "my-pools";
export type FeeMode = "claim" | "unstake" | "both";

export type FactoryPoolMeta = {
  pool: `0x${string}`;
  creator: `0x${string}`;
  nft: `0x${string}`;
  rewardToken: `0x${string}`;
};

export type FactoryPoolDetails = FactoryPoolMeta & {
  startTime: number;
  endTime: number;
  totalStaked: bigint;
  hasMyStake: boolean;
};

export type TokenMeta = {
  symbol: string;
  name: string;
  decimals: number;
};

export type FundTarget = {
  pool: `0x${string}`;
  rewardToken: `0x${string}`;
};

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function shortenAddress(addr?: string, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= 2 + chars * 2) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export function getErrText(e: unknown): string {
  if (e && typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage.length > 0)
      return anyE.shortMessage;
    if (typeof anyE.message === "string" && anyE.message.length > 0)
      return anyE.message;
  }
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

// Helper to build app URL both on client and during build
export function getAppUrl(path: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const origin = (process.env.NEXT_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!origin) return path;
  return `${origin}${path}`;
}

// Token helpers (sometimes handy in UI)
export const units = { parseUnits, formatUnits };
