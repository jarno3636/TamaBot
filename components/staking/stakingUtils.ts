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
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage.length > 0) return anyE.shortMessage;
    if (typeof anyE.message === "string" && anyE.message.length > 0) return anyE.message;
  }
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

export function getAppUrl(path: string) {
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  const origin = (process.env.NEXT_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!origin) return path;
  return `${origin}${path}`;
}

// Tailwind-safe string join
export function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Inline “tone” styles — use anywhere color/glow seems to disappear.
 * This is the same trick used in the upgraded modal.
 */
export function toneStyle(tone: "teal" | "emerald" | "sky" | "amber" | "rose" | "white") {
  switch (tone) {
    case "teal":
      return {
        background: "linear-gradient(135deg, rgba(121,255,225,0.30), rgba(56,189,248,0.14))",
        borderColor: "rgba(121,255,225,0.92)",
        color: "rgba(240,253,250,0.98)",
        boxShadow: "0 0 0 1px rgba(121,255,225,0.18), 0 0 18px rgba(121,255,225,0.18)",
      } as const;
    case "emerald":
      return {
        background: "linear-gradient(135deg, rgba(52,211,153,0.26), rgba(16,185,129,0.12))",
        borderColor: "rgba(52,211,153,0.88)",
        color: "rgba(236,253,245,0.98)",
        boxShadow: "0 0 0 1px rgba(52,211,153,0.16), 0 0 16px rgba(52,211,153,0.14)",
      } as const;
    case "sky":
      return {
        background: "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(14,165,233,0.12))",
        borderColor: "rgba(56,189,248,0.86)",
        color: "rgba(240,249,255,0.98)",
        boxShadow: "0 0 0 1px rgba(56,189,248,0.14), 0 0 16px rgba(56,189,248,0.12)",
      } as const;
    case "amber":
      return {
        background: "linear-gradient(135deg, rgba(251,191,36,0.26), rgba(245,158,11,0.12))",
        borderColor: "rgba(251,191,36,0.86)",
        color: "rgba(255,251,235,0.98)",
        boxShadow: "0 0 0 1px rgba(251,191,36,0.14), 0 0 16px rgba(251,191,36,0.12)",
      } as const;
    case "rose":
      return {
        background: "linear-gradient(135deg, rgba(251,113,133,0.26), rgba(244,63,94,0.12))",
        borderColor: "rgba(251,113,133,0.86)",
        color: "rgba(255,241,242,0.98)",
        boxShadow: "0 0 0 1px rgba(251,113,133,0.14), 0 0 16px rgba(251,113,133,0.12)",
      } as const;
    default:
      return {
        background: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.88)",
      } as const;
  }
}

// Token helpers (sometimes handy in UI)
export const units = { parseUnits, formatUnits };
