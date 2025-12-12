// components/staking/PoolsList.tsx
"use client";

import Link from "next/link";
import type { FactoryPoolDetails, TokenMeta } from "./stakingUtils";
import { shortenAddress, getAppUrl } from "./stakingUtils";

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
  const now = Math.floor(Date.now() / 1000);
  const basebotsNftLower = basebotsNftAddress.toLowerCase();

  const sorted = [...pools].sort((a, b) => {
    const aIsBots = a.nft.toLowerCase() === basebotsNftLower;
    const bIsBots = b.nft.toLowerCase() === basebotsNftLower;
    if (aIsBots !== bIsBots) return aIsBots ? -1 : 1;
    // then live first, then upcoming, then closed
    const sRank = (p: FactoryPoolDetails) => {
      if (p.startTime === 0) return 1; // upcoming-ish / unknown
      if (now < p.startTime) return 1; // upcoming
      if (p.endTime !== 0 && now > p.endTime) return 3; // closed
      return 0; // live
    };
    return sRank(a) - sRank(b);
  });

  return (
    <section className="glass glass-pad rounded-3xl border border-white/10 bg-[#020617]/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm md:text-base font-semibold">All pools</h3>
          <p className="text-[11px] md:text-xs text-white/60">
            Pools returned by your server API (indexed from{" "}
            <span className="font-mono">PoolCreated</span> events). Any pool may
            be stakeable if you have the right NFT.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={poolsLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
        >
          {poolsLoading && (
            <span className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white/70" />
          )}
          <span>{poolsLoading ? "Refreshing…" : "Refresh pools"}</span>
        </button>
      </div>

      {poolsError && (
        <p className="text-xs text-rose-300 break-words">{poolsError}</p>
      )}

      {sorted.length === 0 && !poolsLoading && !poolsError && (
        <p className="text-xs text-white/60">
          No pools yet. Use “Create your pool” above to launch the first one.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="mt-1 grid gap-2 text-xs">
          {sorted.map((pool) => {
            const isCreator =
              !!address && pool.creator.toLowerCase() === address.toLowerCase();

            const isBasebotsNft =
              pool.nft.toLowerCase() === basebotsNftLower;

            const status: "upcoming" | "live" | "closed" = (() => {
              if (pool.startTime === 0) return "upcoming";
              if (now < pool.startTime) return "upcoming";
              if (pool.endTime !== 0 && now > pool.endTime) return "closed";
              return "live";
            })();

            const rewardLower = pool.rewardToken.toLowerCase();
            const meta = tokenMetaByAddr[rewardLower];
            const rewardLabel = meta
              ? `${meta.symbol} (${shortenAddress(pool.rewardToken, 4)})`
              : shortenAddress(pool.rewardToken, 4);

            return (
              <div
                key={pool.pool}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl border border-white/12 bg-black/35 px-3 py-2.5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white/90">
                      NFT staking pool
                    </span>

                    {/* SPECIAL BADGE FOR BASEBOTS NFT POOLS */}
                    {isBasebotsNft && (
                      <span className="rounded-full border border-[#79ffe1]/70 bg-[#031c1b] px-2 py-[1px] text-[10px] font-semibold text-[#79ffe1]">
                        Basebots NFT
                      </span>
                    )}

                    <span
                      className={[
                        "px-2 py-[1px] rounded-full text-[10px] font-semibold border",
                        status === "live"
                          ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"
                          : status === "upcoming"
                          ? "border-sky-400/70 bg-sky-500/10 text-sky-300"
                          : "border-rose-400/70 bg-rose-500/10 text-rose-300",
                      ].join(" ")}
                    >
                      {status === "live"
                        ? "Live"
                        : status === "upcoming"
                        ? "Upcoming"
                        : "Closed"}
                    </span>

                    {isCreator && (
                      <span className="rounded-full border border-white/25 bg-white/5 px-2 py-[1px] text-[10px] font-semibold text-white/80">
                        You created this
                      </span>
                    )}

                    {pool.hasMyStake && (
                      <span className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-2 py-[1px] text-[10px] font-semibold text-emerald-200">
                        You&apos;re staked
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-white/65 font-mono">
                    <span>Pool: {shortenAddress(pool.pool, 4)}</span>
                    <span>NFT: {shortenAddress(pool.nft, 4)}</span>
                    <span>Reward: {rewardLabel}</span>
                    <span>Staked: {pool.totalStaked.toString()} NFTs</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                  <Link
                    href={`https://basescan.org/address/${pool.pool}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:bg-white/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    View pool ↗
                  </Link>

                  {/* Fund button only for the creator */}
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() =>
                        openFundModalForPool({
                          pool: pool.pool,
                          rewardToken: pool.rewardToken,
                        })
                      }
                      className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80"
                    >
                      Fund pool
                    </button>
                  )}

                  {/* Share buttons only for the creator */}
                  {isCreator && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const url = getAppUrl(`/staking?pool=${pool.pool}`);
                          const text =
                            `I just launched an NFT staking pool on Base 🚀\n\n` +
                            `Pool: ${shortenAddress(pool.pool, 4)}\n` +
                            `NFT: ${shortenAddress(pool.nft, 4)}\n` +
                            `Reward token: ${shortenAddress(pool.rewardToken, 4)}\n\n` +
                            `Stake, earn rewards, and join the Basebots ecosystem.`;
                          const shareUrl =
                            `https://warpcast.com/~/compose?text=${encodeURIComponent(
                              text,
                            )}&embeds[]=${encodeURIComponent(url)}`;
                          window.open(shareUrl, "_blank", "noopener,noreferrer");
                        }}
                        className="rounded-full border border-purple-400/60 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-100 hover:bg-purple-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/80"
                      >
                        Share on Farcaster
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
                            `Stake, earn rewards, and join the Basebots ecosystem.`;
                          const shareUrl =
                            `https://x.com/intent/tweet?text=${encodeURIComponent(
                              text,
                            )}&url=${encodeURIComponent(url)}`;
                          window.open(shareUrl, "_blank", "noopener,noreferrer");
                        }}
                        className="rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
                      >
                        Share on X
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
