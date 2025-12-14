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

    const sRank = (p: FactoryPoolDetails) => {
      if (p.startTime === 0) return 1;
      if (now < p.startTime) return 1;
      if (p.endTime !== 0 && now > p.endTime) return 3;
      return 0;
    };
    return sRank(a) - sRank(b);
  });

  return (
    <section className="glass glass-pad rounded-3xl border border-white/10 bg-[#020617]/80 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold">Staking Pools</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[2px] text-[10px] text-white/60">
              {sorted.length} total
            </span>
          </div>
          <p className="mt-1 text-[11px] md:text-xs text-white/60 max-w-[680px]">
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

      {poolsError && <p className="text-xs text-rose-300 break-words">{poolsError}</p>}

      {sorted.length === 0 && !poolsLoading && !poolsError && (
        <p className="text-xs text-white/60">
          No pools yet. Create one above to launch the first pool.
        </p>
      )}

      {/* List */}
      {sorted.length > 0 && (
        <div className="grid gap-3">
          {sorted.map((pool) => {
            const isCreator =
              !!address && pool.creator.toLowerCase() === address.toLowerCase();
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

            const statusChip =
              status === "live"
                ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"
                : status === "upcoming"
                ? "border-sky-400/70 bg-sky-500/10 text-sky-300"
                : "border-rose-400/70 bg-rose-500/10 text-rose-300";

            return (
              <div
                key={pool.pool}
                className="rounded-2xl border border-white/12 bg-black/35 p-4 md:p-5"
              >
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

                      <span
                        className={[
                          "px-2 py-[1px] rounded-full text-[10px] font-semibold border",
                          statusChip,
                        ].join(" ")}
                      >
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

                    {/* Primary action is "Enter" - your page handles ?pool= modal */}
                    <Link
                      href={`/staking?pool=${pool.pool}`}
                      className="rounded-full border border-[#79ffe1]/50 bg-[#031c1b] px-3 py-1 text-[11px] font-semibold text-[#79ffe1] hover:bg-[#052b29] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
                    >
                      Enter
                    </Link>

                    {isCreator && (
                      <button
                        type="button"
                        onClick={() =>
                          openFundModalForPool({ pool: pool.pool, rewardToken: pool.rewardToken })
                        }
                        className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80"
                      >
                        Fund
                      </button>
                    )}
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
                              `https://warpcast.com/~/compose?text=${encodeURIComponent(
                                text,
                              )}&embeds[]=${encodeURIComponent(url)}`;
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
                              `https://x.com/intent/tweet?text=${encodeURIComponent(
                                text,
                              )}&url=${encodeURIComponent(url)}`;
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
