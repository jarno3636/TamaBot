"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import { base } from "viem/chains";
import { formatUnits } from "viem";

import type { FactoryPoolDetails, TokenMeta } from "./stakingUtils";
import { shortenAddress, getAppUrl } from "./stakingUtils";

/* ──────────────────────────────────────────────────────────────
 * Minimal ABIs for extra pool stats
 * ──────────────────────────────────────────────────────────── */
const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const POOL_STATS_ABI = [
  { name: "rewardRate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "users",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "rewardDebt", type: "uint256" },
      { name: "pending", type: "uint256" },
    ],
  },
] as const;

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function fmtCompact(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

function fmtNumber(n: number, max = 4) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(n);
}

function safeNumFromUnits(v: bigint, decimals: number) {
  try {
    const s = formatUnits(v, decimals);
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  } catch {
    return NaN;
  }
}

type Tone = "teal" | "emerald" | "amber" | "rose" | "sky" | "purple" | "white";

function toneStyle(tone: Tone): React.CSSProperties {
  switch (tone) {
    case "teal":
      return {
        background: "linear-gradient(135deg, rgba(121,255,225,0.32), rgba(56,189,248,0.14))",
        borderColor: "rgba(121,255,225,0.90)",
        color: "rgba(240,253,250,0.98)",
        boxShadow: "0 0 0 1px rgba(121,255,225,0.20), 0 0 18px rgba(121,255,225,0.20)",
      };
    case "emerald":
      return {
        background: "linear-gradient(135deg, rgba(52,211,153,0.26), rgba(16,185,129,0.12))",
        borderColor: "rgba(52,211,153,0.88)",
        color: "rgba(236,253,245,0.98)",
        boxShadow: "0 0 0 1px rgba(52,211,153,0.18), 0 0 16px rgba(52,211,153,0.18)",
      };
    case "amber":
      return {
        background: "linear-gradient(135deg, rgba(251,191,36,0.28), rgba(245,158,11,0.12))",
        borderColor: "rgba(251,191,36,0.88)",
        color: "rgba(255,251,235,0.98)",
        boxShadow: "0 0 0 1px rgba(251,191,36,0.18), 0 0 16px rgba(251,191,36,0.18)",
      };
    case "rose":
      return {
        background: "linear-gradient(135deg, rgba(251,113,133,0.28), rgba(244,63,94,0.12))",
        borderColor: "rgba(251,113,133,0.88)",
        color: "rgba(255,241,242,0.98)",
        boxShadow: "0 0 0 1px rgba(251,113,133,0.18), 0 0 16px rgba(251,113,133,0.18)",
      };
    case "sky":
      return {
        background: "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(14,165,233,0.12))",
        borderColor: "rgba(56,189,248,0.86)",
        color: "rgba(240,249,255,0.98)",
        boxShadow: "0 0 0 1px rgba(56,189,248,0.16), 0 0 16px rgba(56,189,248,0.16)",
      };
    case "purple":
      return {
        background: "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(99,102,241,0.12))",
        borderColor: "rgba(168,85,247,0.80)",
        color: "rgba(250,245,255,0.98)",
        boxShadow: "0 0 0 1px rgba(168,85,247,0.16), 0 0 16px rgba(168,85,247,0.16)",
      };
    default:
      return {
        background: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.85)",
      };
  }
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold" style={toneStyle(tone)}>
      {children}
    </span>
  );
}

function ActionBtn({
  tone,
  href,
  onClick,
  children,
  external,
}: {
  tone: Tone;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60 hover:brightness-110";
  const style = toneStyle(tone);

  if (href) {
    return (
      <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cls} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}

type PoolExtra = {
  rewardBal: bigint;
  rewardRate: bigint;
  myAmount: bigint;
};

type UsersRowTuple = readonly [bigint, bigint, bigint];

export default function PoolsList({
  pools,
  poolsLoading,
  poolsError,
  onRefresh,
  address,
  tokenMetaByAddr,
  basebotsNftAddress,
  openFundModalForPool,
}: {
  pools: FactoryPoolDetails[];
  poolsLoading: boolean;
  poolsError: string | null;
  onRefresh: () => void;
  address?: `0x${string}`;
  tokenMetaByAddr: Record<string, TokenMeta>;
  basebotsNftAddress: `0x${string}`;
  openFundModalForPool: (p: { pool: `0x${string}`; rewardToken: `0x${string}` }) => void;
}) {
  const pc = usePublicClient({ chainId: base.id });

  // ok to use now for UI-only status labels; do NOT let it drive fetches
  const now = nowSec();
  const basebotsNftLower = basebotsNftAddress.toLowerCase();

  // ✅ STABLE sorting (does NOT depend on `now`)
  const sorted = useMemo(() => {
    const copy = [...pools];

    copy.sort((a, b) => {
      const aIsBots = a.nft.toLowerCase() === basebotsNftLower;
      const bIsBots = b.nft.toLowerCase() === basebotsNftLower;
      if (aIsBots !== bIsBots) return aIsBots ? -1 : 1;

      const bucket = (p: FactoryPoolDetails) => {
        if (!p.startTime) return 1; // upcoming-ish
        if (!p.endTime) return 0; // long-live-ish
        return 0;
      };

      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;

      return (b.startTime ?? 0) - (a.startTime ?? 0);
    });

    return copy;
  }, [pools, basebotsNftLower]);

  const poolsKey = useMemo(() => sorted.map((p) => p.pool.toLowerCase()).join("|"), [sorted]);

  /* ──────────────────────────────────────────────────────────────
   * Extra stats: reward balance + rewardRate + my amount
   * ──────────────────────────────────────────────────────────── */
  const [extraByPool, setExtraByPool] = useState<Record<string, PoolExtra>>({});
  const [extraLoading, setExtraLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadExtras() {
      if (!pc) return;
      if (sorted.length === 0) return;

      setExtraLoading(true);

      try {
        const poolAddrs = sorted.map((p) => p.pool);

        const [rewardRateRes, balanceRes, userRes] = await Promise.all([
          pc.multicall({
            contracts: poolAddrs.map((addr) => ({
              address: addr,
              abi: POOL_STATS_ABI,
              functionName: "rewardRate",
            })),
            allowFailure: true,
          }),

          pc.multicall({
            contracts: sorted.map((p) => ({
              address: p.rewardToken,
              abi: ERC20_BALANCE_ABI,
              functionName: "balanceOf",
              args: [p.pool],
            })),
            allowFailure: true,
          }),

          address
            ? pc.multicall({
                contracts: poolAddrs.map((addr) => ({
                  address: addr,
                  abi: POOL_STATS_ABI,
                  functionName: "users",
                  args: [address],
                })),
                allowFailure: true,
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const next: Record<string, PoolExtra> = {};
        for (let i = 0; i < sorted.length; i++) {
          const p = sorted[i];
          const key = p.pool.toLowerCase();

          const rr = (rewardRateRes as any)?.[i]?.result as bigint | undefined;
          const bal = (balanceRes as any)?.[i]?.result as bigint | undefined;

          let myAmount = 0n;
          if (address && userRes) {
            const u = (userRes as any)?.[i]?.result as UsersRowTuple | undefined;
            myAmount = u?.[0] ?? 0n;
          }

          next[key] = { rewardRate: rr ?? 0n, rewardBal: bal ?? 0n, myAmount };
        }

        setExtraByPool(next);
      } catch (e) {
        console.error("PoolsList extras load failed", e);
      } finally {
        if (!cancelled) setExtraLoading(false);
      }
    }

    void loadExtras();
    return () => {
      cancelled = true;
    };
  }, [pc, poolsKey, address]);

  return (
    <section className="glass glass-pad relative overflow-hidden rounded-3xl border border-white/10 bg-[#020617]/85 space-y-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(900px 420px at 10% -40%, rgba(121,255,225,0.14), transparent 60%), radial-gradient(900px 520px at 90% -20%, rgba(56,189,248,0.12), transparent 55%)",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold">Staking Pools</h3>
            <Chip tone="white">{sorted.length} total</Chip>
            {extraLoading && <Chip tone="sky">loading stats…</Chip>}
          </div>

          <p className="mt-1 text-[11px] md:text-xs text-white/60 max-w-[760px]">
            Enter any pool if you hold the NFT collection. Creators can fund rewards and share the pool link.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={poolsLoading}
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
        >
          {poolsLoading ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white/70" />
          ) : (
            <span className="h-3 w-3 rounded-full border border-white/30 bg-white/5" />
          )}
          <span>{poolsLoading ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {poolsError && <p className="relative text-xs text-rose-300 break-words">{poolsError}</p>}

      {sorted.length === 0 && !poolsLoading && !poolsError && (
        <p className="relative text-xs text-white/60">No pools yet. Create one above to launch the first pool.</p>
      )}

      {sorted.length > 0 && (
        <div className="relative grid gap-4">
          {sorted.map((pool, idx) => {
            const poolKey = pool.pool.toLowerCase();
            const extra = extraByPool[poolKey];

            const isCreator = !!address && pool.creator.toLowerCase() === address.toLowerCase();
            const isBasebotsNft = pool.nft.toLowerCase() === basebotsNftLower;

            const status: "upcoming" | "live" | "closed" = (() => {
              if (pool.startTime === 0) return "upcoming";
              if (now < pool.startTime) return "upcoming";
              if (pool.endTime !== 0 && now > pool.endTime) return "closed";
              return "live";
            })();

            const rewardLower = pool.rewardToken.toLowerCase();
            const meta = tokenMetaByAddr[rewardLower];
            const rewardLabel = meta ? meta.symbol : shortenAddress(pool.rewardToken, 4);
            const decimals = meta?.decimals ?? 18;

            const rewardBalTokens = extra ? safeNumFromUnits(extra.rewardBal, decimals) : NaN;
            const rewardRateTokensSec = extra ? safeNumFromUnits(extra.rewardRate, decimals) : NaN;
            const totalPerHour = Number.isFinite(rewardRateTokensSec) ? rewardRateTokensSec * 3600 : NaN;

            const stakedCount = Number(pool.totalStaked ?? 0n);
            const perNftPerHour = stakedCount > 0 && Number.isFinite(totalPerHour) ? totalPerHour / stakedCount : NaN;

            const hoursLeftFromBalance =
              Number.isFinite(rewardBalTokens) && Number.isFinite(rewardRateTokensSec) && rewardRateTokensSec > 0
                ? (rewardBalTokens / rewardRateTokensSec) / 3600
                : NaN;

            const myAmt = extra?.myAmount ?? 0n;
            const myAmtNum = Number(myAmt);
            const myEstPerHour = myAmtNum > 0 && Number.isFinite(perNftPerHour) ? perNftPerHour * myAmtNum : NaN;

            const statusTone: Tone = status === "live" ? "emerald" : status === "upcoming" ? "sky" : "rose";

            const enterHref = `/staking?pool=${pool.pool}&nft=${pool.nft}&rewardToken=${pool.rewardToken}`;

            // ✅ INLINE alternating card backgrounds (strong + visible)
            const isBlue = idx % 2 === 0;

            const cardBorder = isBlue ? "rgba(56,189,248,0.30)" : "rgba(251,191,36,0.30)";
            const cardGlow = isBlue ? "rgba(56,189,248,0.22)" : "rgba(251,191,36,0.18)";
            const cardBg = isBlue
              ? "linear-gradient(180deg, rgba(2,6,23,0.78), rgba(2,20,45,0.55))"
              : "linear-gradient(180deg, rgba(2,6,23,0.78), rgba(45,25,0,0.42))";

            const washBg = isBlue
              ? "radial-gradient(900px 340px at 10% 0%, rgba(56,189,248,0.28), transparent 62%), radial-gradient(900px 380px at 90% 0%, rgba(99,102,241,0.16), transparent 58%)"
              : "radial-gradient(900px 340px at 10% 0%, rgba(251,191,36,0.26), transparent 62%), radial-gradient(900px 380px at 90% 0%, rgba(245,158,11,0.16), transparent 58%)";

            return (
              <div
                key={pool.pool}
                className="relative overflow-hidden rounded-3xl border p-4 md:p-5"
                style={{
                  borderColor: isBasebotsNft ? "rgba(121,255,225,0.38)" : cardBorder,
                  background: cardBg,
                  boxShadow: `0 28px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.05), 0 0 26px ${cardGlow}`,
                }}
              >
                {/* inline wash for obvious color */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: isBasebotsNft
                      ? "radial-gradient(900px 340px at 10% 0%, rgba(121,255,225,0.24), transparent 62%), radial-gradient(900px 380px at 90% 0%, rgba(56,189,248,0.16), transparent 58%)"
                      : washBg,
                    opacity: 0.95,
                  }}
                />

                {/* shine strip */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-14 left-[-20%] right-[-20%] h-28"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
                    transform: "rotate(-7deg)",
                    opacity: 0.55,
                  }}
                />

                <div className="relative">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white/90">{isBasebotsNft ? "Basebots NFT Pool" : "NFT Pool"}</span>

                        {isBasebotsNft && <Chip tone="teal">Featured</Chip>}
                        <Chip tone={statusTone}>{status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Closed"}</Chip>

                        {isCreator && <Chip tone="amber">Creator</Chip>}
                        {pool.hasMyStake && <Chip tone="emerald">You’re staked</Chip>}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70 font-mono">
                        <span>Pool: {shortenAddress(pool.pool, 4)}</span>
                        <span>NFT: {shortenAddress(pool.nft, 4)}</span>
                        <span>Reward: {rewardLabel}</span>
                        <span>Staked: {pool.totalStaked.toString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                      <ActionBtn tone="white" href={`https://basescan.org/address/${pool.pool}`} external>
                        Basescan ↗
                      </ActionBtn>

                      <ActionBtn tone="teal" href={enterHref}>
                        Enter
                      </ActionBtn>

                      {isCreator && (
                        <ActionBtn tone="emerald" onClick={() => openFundModalForPool({ pool: pool.pool, rewardToken: pool.rewardToken })}>
                          Fund
                        </ActionBtn>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/12 bg-black/25 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-white/55">Rewards in pool</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">{extra ? `${fmtNumber(rewardBalTokens, 4)} ${rewardLabel}` : "—"}</div>
                      <div className="mt-1 text-[11px] text-white/55">
                        Est. left:{" "}
                        <span className="text-white/75 font-medium">
                          {extra && Number.isFinite(hoursLeftFromBalance) ? `${fmtNumber(hoursLeftFromBalance, 1)} hr` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/12 bg-black/25 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-white/55">Reward rate</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">{extra ? `${fmtCompact(totalPerHour)} ${rewardLabel}/hr` : "—"}</div>
                      <div className="mt-1 text-[11px] text-white/55">
                        Per NFT/hr:{" "}
                        <span className="text-white/75 font-medium">
                          {extra ? (stakedCount > 0 ? fmtNumber(perNftPerHour, 6) : "be first") : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/12 bg-black/25 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-white/55">Your estimate</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {address ? (myAmtNum > 0 ? `${fmtNumber(myEstPerHour, 6)} ${rewardLabel}/hr` : "Not staked") : "Connect wallet"}
                      </div>
                      <div className="mt-1 text-[11px] text-white/55">
                        Your NFTs: <span className="text-white/75 font-medium">{address ? (extra ? myAmt.toString() : "…") : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {isCreator && (
                    <div className="mt-3 rounded-2xl border border-white/12 bg-black/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-white/60">
                          <span className="font-semibold text-white/75">Creator tools:</span> share your pool link so others can stake.
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <ActionBtn
                            tone="purple"
                            onClick={() => {
                              const url = getAppUrl(enterHref);
                              const text =
                                `I just launched an NFT staking pool on Base 🚀\n\n` +
                                `Pool: ${shortenAddress(pool.pool, 4)}\n` +
                                `NFT: ${shortenAddress(pool.nft, 4)}\n` +
                                `Reward token: ${shortenAddress(pool.rewardToken, 4)}\n\n` +
                                `Stake + earn rewards here:`;
                              const shareUrl =
                                `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
                              window.open(shareUrl, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Share Farcaster
                          </ActionBtn>

                          <ActionBtn
                            tone="sky"
                            onClick={() => {
                              const url = getAppUrl(enterHref);
                              const text =
                                `I just launched an NFT staking pool on Base 🚀\n\n` +
                                `Pool: ${shortenAddress(pool.pool, 4)}\n` +
                                `NFT: ${shortenAddress(pool.nft, 4)}\n` +
                                `Reward token: ${shortenAddress(pool.rewardToken, 4)}\n\n` +
                                `Stake + earn rewards here:`;
                              const shareUrl =
                                `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                              window.open(shareUrl, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Share X
                          </ActionBtn>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-[10px] text-white/45">
                    Estimates assume rewards are shared evenly across staked NFTs at the current rate and current staked count.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
