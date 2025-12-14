"use client";

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

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type PoolExtra = {
  rewardBal: bigint;     // reward token balance held by pool
  rewardRate: bigint;    // tokens/sec (raw)
  myAmount: bigint;      // user.amount (NFT count in many implementations)
};

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

  const now = nowSec();
  const basebotsNftLower = basebotsNftAddress.toLowerCase();

  const sorted = useMemo(() => {
    const copy = [...pools];

    copy.sort((a, b) => {
      const aIsBots = a.nft.toLowerCase() === basebotsNftLower;
      const bIsBots = b.nft.toLowerCase() === basebotsNftLower;
      if (aIsBots !== bIsBots) return aIsBots ? -1 : 1;

      const rank = (p: FactoryPoolDetails) => {
        if (p.startTime === 0) return 1;
        if (now < p.startTime) return 1;
        if (p.endTime !== 0 && now > p.endTime) return 3;
        return 0;
      };
      return rank(a) - rank(b);
    });

    return copy;
  }, [pools, basebotsNftLower, now]);

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

        // 1) rewardRate for each pool
        const rewardRateRes = await pc.multicall({
          contracts: poolAddrs.map((addr) => ({
            address: addr,
            abi: POOL_STATS_ABI,
            functionName: "rewardRate",
          })),
        });

        // 2) reward token balances held by pool (ERC20.balanceOf(pool))
        const balanceRes = await pc.multicall({
          contracts: sorted.map((p) => ({
            address: p.rewardToken,
            abi: ERC20_BALANCE_ABI,
            functionName: "balanceOf",
            args: [p.pool],
          })),
        });

        // 3) user amount per pool if connected
        const userRes = address
          ? await pc.multicall({
              contracts: poolAddrs.map((addr) => ({
                address: addr,
                abi: POOL_STATS_ABI,
                functionName: "users",
                args: [address],
              })),
            })
          : null;

        if (cancelled) return;

        const next: Record<string, PoolExtra> = {};
        for (let i = 0; i < sorted.length; i++) {
          const p = sorted[i];
          const key = p.pool.toLowerCase();

          const rr = (rewardRateRes as any)?.[i]?.result as bigint | undefined;
          const bal = (balanceRes as any)?.[i]?.result as bigint | undefined;

          let myAmount = 0n;
          if (address && userRes) {
            const u = (userRes as any)?.[i]?.result as any;
            const amt = u?.amount as bigint | undefined;
            myAmount = amt ?? 0n;
          }

          next[key] = {
            rewardRate: rr ?? 0n,
            rewardBal: bal ?? 0n,
            myAmount,
          };
        }

        setExtraByPool(next);
      } catch (e) {
        // don’t hard-fail the list on stats issues
        console.error("PoolsList extras load failed", e);
      } finally {
        if (!cancelled) setExtraLoading(false);
      }
    }

    void loadExtras();
    return () => {
      cancelled = true;
    };
  }, [pc, sorted, address]);

  return (
    <section className="glass glass-pad rounded-3xl border border-white/10 bg-[#020617]/85 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 420px at 10% -40%, rgba(121,255,225,0.12), transparent 60%), radial-gradient(900px 520px at 90% -20%, rgba(56,189,248,0.10), transparent 55%)",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-semibold">Staking Pools</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[2px] text-[10px] text-white/60">
                {sorted.length} total
              </span>
              {extraLoading && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[2px] text-[10px] text-white/55">
                  loading stats…
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] md:text-xs text-white/60 max-w-[720px]">
              Enter any pool if you hold the NFT collection. Creators can fund rewards and share the pool link.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={poolsLoading}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
          >
            {poolsLoading ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white/70" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-white/30 bg-white/5" />
            )}
            <span>{poolsLoading ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {poolsError && <p className="text-xs text-rose-300 break-words">{poolsError}</p>}

      {sorted.length === 0 && !poolsLoading && !poolsError && (
        <p className="text-xs text-white/60">No pools yet. Create one above to launch the first pool.</p>
      )}

      {/* List */}
      {sorted.length > 0 && (
        <div className="grid gap-3">
          {sorted.map((pool) => {
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

            // Reward balance (formatted)
            const rewardBalTokens = extra ? Number(formatUnits(extra.rewardBal, decimals)) : NaN;

            // rewardRate (tokens/sec)
            const rewardRateTokensSec = extra ? Number(formatUnits(extra.rewardRate, decimals)) : NaN;

            const totalPerHour = rewardRateTokensSec * 3600;
            const stakedCount = Number(pool.totalStaked ?? 0n);
            const perNftPerHour =
              stakedCount > 0 ? totalPerHour / stakedCount : NaN;

            // remaining time (seconds)
            const remainingSeconds =
              pool.endTime && pool.endTime > 0 ? Math.max(0, pool.endTime - now) : NaN;

            const estRemainingHours =
              Number.isFinite(rewardRateTokensSec) && rewardRateTokensSec > 0 && Number.isFinite(remainingSeconds)
                ? remainingSeconds / 3600
                : NaN;

            // Estimate how long rewards last given current balance and rate
            const estHoursLeftFromBalance =
              Number.isFinite(rewardBalTokens) && Number.isFinite(rewardRateTokensSec) && rewardRateTokensSec > 0
                ? rewardBalTokens / (rewardRateTokensSec * 3600) * 3600 // simplify -> rewardBal / rateSec / 3600? (oops)
                : NaN;

            // Correct: seconds left = rewardBal / rateSec. hours left = /3600
            const hoursLeftFromBalance =
              Number.isFinite(rewardBalTokens) && Number.isFinite(rewardRateTokensSec) && rewardRateTokensSec > 0
                ? (rewardBalTokens / rewardRateTokensSec) / 3600
                : NaN;

            const myAmt = extra?.myAmount ?? 0n;
            const myAmtNum = Number(myAmt);
            const myEstPerHour =
              Number.isFinite(perNftPerHour) && myAmtNum > 0 ? perNftPerHour * myAmtNum : NaN;

            const statusChip =
              status === "live"
                ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"
                : status === "upcoming"
                ? "border-sky-400/70 bg-sky-500/10 text-sky-300"
                : "border-rose-400/70 bg-rose-500/10 text-rose-300";

            return (
              <div
                key={pool.pool}
                className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/35 p-4 md:p-5"
              >
                {/* subtle glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    background:
                      isBasebotsNft
                        ? "radial-gradient(600px 240px at 10% 0%, rgba(121,255,225,0.12), transparent 60%)"
                        : "radial-gradient(600px 240px at 10% 0%, rgba(56,189,248,0.10), transparent 60%)",
                  }}
                />

                <div className="relative">
                  {/* Top row */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white/90">
                          {isBasebotsNft ? "Basebots NFT Pool" : "NFT Pool"}
                        </span>

                        {isBasebotsNft && (
                          <span className="rounded-full border border-[#79ffe1]/70 bg-[#031c1b] px-2 py-[1px] text-[10px] font-semibold text-[#79ffe1]">
                            Featured
                          </span>
                        )}

                        <span className={classNames("px-2 py-[1px] rounded-full text-[10px] font-semibold border", statusChip)}>
                          {status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Closed"}
                        </span>

                        {isCreator && (
                          <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-[1px] text-[10px] font-semibold text-amber-200">
                            Creator
                          </span>
                        )}

                        {pool.hasMyStake && (
                          <span className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-2 py-[1px] text-[10px] font-semibold text-emerald-200">
                            You’re staked
                          </span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/65 font-mono">
                        <span>Pool: {shortenAddress(pool.pool, 4)}</span>
                        <span>NFT: {shortenAddress(pool.nft, 4)}</span>
                        <span>Reward: {rewardLabel}</span>
                        <span>Staked: {pool.totalStaked.toString()}</span>
                      </div>
                    </div>

                    {/* Right CTAs */}
                    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                      <Link
                        href={`https://basescan.org/address/${pool.pool}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:bg-white/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        Basescan ↗
                      </Link>

                      {/* Primary action is "Enter" */}
                      <Link
                        href={`/staking?pool=${pool.pool}`}
                        className="rounded-full border border-[#79ffe1]/55 bg-[#031c1b] px-3 py-1 text-[11px] font-semibold text-[#79ffe1] hover:bg-[#052b29] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
                      >
                        Enter
                      </Link>

                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => openFundModalForPool({ pool: pool.pool, rewardToken: pool.rewardToken })}
                          className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80"
                        >
                          Fund
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats strip */}
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-white/55">Rewards in pool</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {extra ? `${fmtNumber(rewardBalTokens, 4)} ${rewardLabel}` : "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-white/55">
                        Left (est):{" "}
                        <span className="text-white/75 font-medium">
                          {extra && Number.isFinite(hoursLeftFromBalance)
                            ? `${fmtNumber(hoursLeftFromBalance, 1)} hr`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-white/55">Reward rate</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {extra ? `${fmtCompact(totalPerHour)} ${rewardLabel}/hr` : "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-white/55">
                        Per NFT/hr:{" "}
                        <span className="text-white/75 font-medium">
                          {extra
                            ? stakedCount > 0
                              ? `${fmtNumber(perNftPerHour, 4)}`
                              : "be first"
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-white/55">Your estimate</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {address
                          ? myAmtNum > 0
                            ? `${fmtNumber(myEstPerHour, 4)} ${rewardLabel}/hr`
                            : "Not staked"
                          : "Connect wallet"}
                      </div>
                      <div className="mt-1 text-[11px] text-white/55">
                        Your NFTs:{" "}
                        <span className="text-white/75 font-medium">
                          {address ? (extra ? myAmt.toString() : "…") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Creator tools */}
                  {isCreator && (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-white/60">
                          <span className="font-semibold text-white/75">Creator tools:</span>{" "}
                          share your pool link so others can stake.
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const url = getAppUrl(`/staking?pool=${pool.pool}`);
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
                            className="rounded-full border border-purple-400/60 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-100 hover:bg-purple-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/80"
                          >
                            Share Farcaster
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = getAppUrl(`/staking?pool=${pool.pool}`);
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
                            className="rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
                          >
                            Share X
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Small footnote */}
                  <div className="mt-3 text-[10px] text-white/45">
                    Estimates assume rewards are shared evenly across staked NFTs using the current staked count and current reward rate.
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
