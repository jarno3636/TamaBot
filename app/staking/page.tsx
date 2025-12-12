// app/staking/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "viem/chains";
import { parseUnits, type Hex } from "viem";

import {
  CONFIG_STAKING_FACTORY,
  BASEBOTS_STAKING_POOL,
  BOTS_TOKEN,
  BASEBOTS_NFT,
} from "@/lib/stakingContracts";

import CreatePoolCard from "@/components/staking/CreatePoolCard";

/* ──────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────── */
type FilterTab = "all" | "live" | "closed" | "my-staked" | "my-pools";

type FactoryPoolMeta = {
  pool: `0x${string}`;
  creator: `0x${string}`;
  nft: `0x${string}`;
  rewardToken: `0x${string}`;
};

type FactoryPoolDetails = FactoryPoolMeta & {
  startTime: number;
  endTime: number;
  totalStaked: bigint;
  hasMyStake: boolean;
};

type TokenMeta = {
  symbol: string;
  name: string;
  decimals: number;
};

type PublicClientType = ReturnType<typeof usePublicClient>;

type FundTarget = {
  pool: `0x${string}`;
  rewardToken: `0x${string}`;
};

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function shortenAddress(addr?: string, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= 2 + chars * 2) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

// Helper to build app URL both on client and during build
function getAppUrl(path: string) {
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  const origin = (process.env.NEXT_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!origin) return path;
  return `${origin}${path}`;
}

function getErrText(e: unknown): string {
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

const inputBase =
  "mt-1 w-full max-w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

const primaryBtn =
  "w-full inline-flex items-center justify-center rounded-full bg-[#79ffe1] text-slate-950 text-sm font-semibold py-2.5 shadow-[0_10px_30px_rgba(121,255,225,0.45)] hover:bg-[#a5fff0] transition-all active:scale-[0.97] active:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/70 disabled:opacity-60 disabled:cursor-not-allowed";

/* ──────────────────────────────────────────────────────────────
 * Minimal ERC-20 ABIs for funding modal
 * ──────────────────────────────────────────────────────────── */
const ERC20_METADATA_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8", name: "" }] },
] as const;

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/* ──────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────── */
export default function StakingPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [poolSearch, setPoolSearch] = useState("");

  /* ───────────────── Protocol fee (shown in Create card) ───────────────── */
  const { data: protocolFeeBpsRaw } = (require("wagmi") as typeof import("wagmi")).useReadContract({
    ...CONFIG_STAKING_FACTORY,
    functionName: "protocolFeeBps",
  });

  const protocolFeeBps = Number(protocolFeeBpsRaw ?? 0);
  const protocolFeePercent = protocolFeeBps / 100;

  /* ───────────────── Pools discovery from /api/pools ───────────────── */
  const [factoryPools, setFactoryPools] = useState<FactoryPoolMeta[]>([]);
  const [factoryPoolDetails, setFactoryPoolDetails] = useState<FactoryPoolDetails[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPools() {
      try {
        setPoolsLoading(true);
        setPoolsError(null);

        const params = new URLSearchParams();
        if (activeFilter === "my-pools" && address) params.set("creator", address);

        const url = `/api/pools${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Pools API failed (${res.status})`);

        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error ?? "Failed to load pools");

        const pools = (json.pools ?? []) as Array<{
          pool: string;
          creator: string;
          nft: string;
          rewardToken: string;
        }>;

        const items: FactoryPoolMeta[] = pools
          .filter((p) => p?.pool && p?.creator && p?.nft && p?.rewardToken)
          .map((p) => ({
            pool: p.pool as `0x${string}`,
            creator: p.creator as `0x${string}`,
            nft: p.nft as `0x${string}`,
            rewardToken: p.rewardToken as `0x${string}`,
          }));

        // Dedup by pool address
        const unique = new Map<string, FactoryPoolMeta>();
        for (const p of items) {
          const key = p.pool.toLowerCase();
          if (!unique.has(key)) unique.set(key, p);
        }

        if (!cancelled) setFactoryPools(Array.from(unique.values()));
      } catch (err) {
        console.error("Pools API load error", err);
        if (!cancelled) {
          setPoolsError(`Failed to load pools. ${getErrText(err)}`);
          setFactoryPools([]);
        }
      } finally {
        if (!cancelled) setPoolsLoading(false);
      }
    }

    void loadPools();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce, activeFilter, address]);

  /* ───────────────── Pool details via multicall (status + my stake + total) ───────────────── */
  useEffect(() => {
    if (!publicClient || factoryPools.length === 0) {
      setFactoryPoolDetails([]);
      return;
    }

    const client = publicClient as NonNullable<PublicClientType>;
    let cancelled = false;

    async function loadDetails() {
      try {
        const contractsBase = factoryPools.map((p) => ({
          address: p.pool,
          abi: BASEBOTS_STAKING_POOL.abi, // pool implementation ABI
        })) as any[];

        const [startRes, endRes, stakedRes, userRes] = await Promise.all([
          client.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "startTime" })),
          }),
          client.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "endTime" })),
          }),
          client.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "totalStaked" })),
          }),
          address
            ? client.multicall({
                contracts: contractsBase.map((c) => ({ ...c, functionName: "users", args: [address] })),
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const details: FactoryPoolDetails[] = factoryPools.map((p, i) => {
          const st = (startRes as any)[i]?.result as bigint | undefined;
          const et = (endRes as any)[i]?.result as bigint | undefined;
          const ts = (stakedRes as any)[i]?.result as bigint | undefined;

          let hasMyStake = false;
          if (address && userRes) {
            const u = (userRes as any)[i]?.result as any;
            const amt = u?.amount as bigint | undefined;
            hasMyStake = !!amt && amt > 0n;
          }

          return {
            ...p,
            startTime: st ? Number(st) : 0,
            endTime: et ? Number(et) : 0,
            totalStaked: ts ?? 0n,
            hasMyStake,
          };
        });

        setFactoryPoolDetails(details);
      } catch (err) {
        console.error("Error loading pool details", err);
        if (!cancelled) setPoolsError(getErrText(err));
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [publicClient, factoryPools, address]);

  /* ───────────────── Token meta (reward token) via /api/token-info ───────────────── */
  const [tokenMetaMap, setTokenMetaMap] = useState<Record<string, TokenMeta>>({});

  useEffect(() => {
    if (factoryPoolDetails.length === 0) return;
    let cancelled = false;

    const uniqueRewards = Array.from(new Set(factoryPoolDetails.map((p) => p.rewardToken.toLowerCase())));
    const missing = uniqueRewards.filter((a) => !tokenMetaMap[a]);
    if (missing.length === 0) return;

    async function loadMeta() {
      try {
        const updates: Record<string, TokenMeta> = {};
        for (const addr of missing) {
          try {
            const url = getAppUrl(`/api/token-info?address=${addr}`);
            const res = await fetch(url);
            if (!res.ok) throw new Error("Token info request failed");
            const json = await res.json();
            if (!json.ok) throw new Error(json.error ?? "Token lookup failed");

            updates[addr] = {
              symbol: json.symbol || shortenAddress(addr, 4),
              name: json.name || shortenAddress(addr, 4),
              decimals:
                typeof json.decimals === "number" && Number.isFinite(json.decimals)
                  ? json.decimals
                  : 18,
            };
          } catch {
            // ignore; fallback is short address
          }
        }

        if (!cancelled && Object.keys(updates).length > 0) {
          setTokenMetaMap((prev) => ({ ...prev, ...updates }));
        }
      } catch (e) {
        console.error("Failed to fetch token metadata", e);
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [factoryPoolDetails, tokenMetaMap]);

  /* ───────────────── Filters + search ───────────────── */
  const filteredPools = useMemo(() => {
    if (factoryPoolDetails.length === 0) return [];
    const now = nowSeconds();

    const byTab = factoryPoolDetails.filter((p) => {
      const status: "upcoming" | "live" | "closed" = (() => {
        if (p.startTime === 0) return "upcoming";
        if (now < p.startTime) return "upcoming";
        if (p.endTime !== 0 && now > p.endTime) return "closed";
        return "live";
      })();

      if (activeFilter === "all") return true;
      if (activeFilter === "live") return status === "live";
      if (activeFilter === "closed") return status === "closed";
      if (activeFilter === "my-pools") {
        return !!address && p.creator.toLowerCase() === address.toLowerCase();
      }
      if (activeFilter === "my-staked") return p.hasMyStake;
      return true;
    });

    const term = poolSearch.trim().toLowerCase();
    if (!term) return byTab;

    return byTab.filter((p) => {
      const poolAddr = p.pool.toLowerCase();
      const nftAddr = p.nft.toLowerCase();
      const rewardAddr = p.rewardToken.toLowerCase();
      return poolAddr.includes(term) || nftAddr.includes(term) || rewardAddr.includes(term);
    });
  }, [factoryPoolDetails, activeFilter, poolSearch, address]);

  /* ───────────────── Fund modal state ───────────────── */
  const [fundTarget, setFundTarget] = useState<FundTarget | null>(null);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundSuggestedAmount, setFundSuggestedAmount] = useState<string>("");

  function openFundModal(target: FundTarget, suggestedAmount?: string) {
    setFundTarget(target);
    setFundSuggestedAmount(suggestedAmount ?? "");
    setFundModalOpen(true);
  }

  /* ───────────────── Render ───────────────── */
  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer overflow-x-hidden">
      <div className="container pt-6 px-5 stack space-y-6">
        {/* ───────────────── Intro ───────────────── */}
        <section className="glass glass-pad relative overflow-hidden rounded-3xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 400px at 10% -20%, rgba(58,166,216,0.18), transparent 60%), radial-gradient(900px 500px at 90% -30%, rgba(121,255,225,0.14), transparent 70%)",
              maskImage:
                "radial-gradient(120% 120% at 50% 0%, #000 55%, transparent 100%)",
            }}
          />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-[28px] bg-gradient-to-tr from-[#79ffe1] via-sky-500 to-indigo-500 shadow-[0_0_36px_rgba(121,255,225,0.8)]">
                <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[24px] bg-black/85">
                  <Image src="/icon.png" alt="Basebots" width={96} height={96} className="object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  NFT Staking Pools
                </h1>
                <p className="mt-1 text-white/80 text-sm md:text-base max-w-md">
                  Create pools for any ERC-721 on Base and stream rewards in any ERC-20.
                </p>
                <p className="mt-2 text-[11px] text-white/60 max-w-md">
                  Creating a pool sets the schedule —{" "}
                  <span className="font-semibold text-[#79ffe1]">it does not automatically pull reward tokens</span>.
                </p>
              </div>
            </div>

            <div className="mt-2 md:mt-0 text-sm text-white/75 max-w-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">
                How it works
              </h3>
              <ul className="space-y-1.5">
                <li>• Choose an NFT collection (ERC-721 on Base).</li>
                <li>• Choose a reward token (ERC-20 on Base).</li>
                <li>• Set total rewards, duration, optional caps, and creator fee.</li>
                <li>• After creation, send reward tokens to the pool address.</li>
              </ul>
              <p className="mt-3 text-[11px] text-white/60">
                Protocol fee is currently{" "}
                <span className="font-semibold text-[#79ffe1]">{protocolFeePercent}%</span>{" "}
                of earned rewards (plus any creator fee).
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────── Create Pool (component) ───────────────── */}
        <CreatePoolCard
          protocolFeePercent={protocolFeePercent}
          onOpenFundModal={(target, suggestedAmount) => openFundModal(target, suggestedAmount)}
        />

        {/* ───────────────── Filters ───────────────── */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All pools" },
              { key: "live", label: "Live" },
              { key: "closed", label: "Closed" },
              { key: "my-staked", label: "My staked" },
              { key: "my-pools", label: "My pools" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveFilter(t.key as FilterTab)}
                className={[
                  "px-3 py-1.5 rounded-full border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
                  activeFilter === t.key
                    ? "border-[#79ffe1] bg-[#031c1b] text-[#79ffe1] shadow-[0_0_14px_rgba(121,255,225,0.6)]"
                    : "border-white/15 bg-[#020617] text-white/70 hover:border-white/40",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-auto">
            <input
              type="text"
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              placeholder="Search by pool / NFT / token address…"
              className={inputBase + " text-xs md:text-[13px]"}
            />
          </div>
        </section>

        {/* ───────────────── Pools List ───────────────── */}
        <section className="glass glass-pad rounded-3xl border border-white/10 bg-[#020617]/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-semibold">Pools</h3>
              <p className="text-[11px] md:text-xs text-white/60">
                Pools are returned by your server API (indexing{" "}
                <span className="font-mono">PoolCreated</span> events). Any Basebots-NFT pool gets a special badge.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={poolsLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
            >
              {poolsLoading && (
                <span className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white/70" />
              )}
              <span>{poolsLoading ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>

          {poolsError && <p className="text-xs text-rose-300 break-words">{poolsError}</p>}

          {factoryPools.length === 0 && !poolsLoading && !poolsError && (
            <p className="text-xs text-white/60">
              No pools yet. Create the first one above.
            </p>
          )}

          {factoryPools.length > 0 && filteredPools.length === 0 && !poolsLoading && !poolsError && (
            <p className="text-xs text-white/60">No pools match this filter/search yet.</p>
          )}

          {filteredPools.length > 0 && (
            <div className="mt-1 grid gap-2 text-xs">
              {filteredPools.map((pool) => {
                const now = nowSeconds();

                const isCreator = !!address && pool.creator.toLowerCase() === address.toLowerCase();
                const isBasebotsNft =
                  pool.nft.toLowerCase() === (BASEBOTS_NFT.address as `0x${string}`).toLowerCase();

                const status: "upcoming" | "live" | "closed" = (() => {
                  if (pool.startTime === 0) return "upcoming";
                  if (now < pool.startTime) return "upcoming";
                  if (pool.endTime !== 0 && now > pool.endTime) return "closed";
                  return "live";
                })();

                const rewardLower = pool.rewardToken.toLowerCase();
                const meta = tokenMetaMap[rewardLower];
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
                          {isBasebotsNft ? "Basebots NFT staking pool" : "NFT staking pool"}
                        </span>

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
                          {status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Closed"}
                        </span>

                        {isBasebotsNft && (
                          <span className="rounded-full border border-[#79ffe1]/70 bg-[#031c1b] px-2 py-[1px] text-[10px] font-semibold text-[#79ffe1]">
                            Basebots NFT
                          </span>
                        )}

                        {isCreator && (
                          <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-[1px] text-[10px] font-semibold text-amber-200">
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
                        View ↗
                      </Link>

                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => openFundModal({ pool: pool.pool, rewardToken: pool.rewardToken })}
                          className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80"
                        >
                          Fund pool
                        </button>
                      )}

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
                                `Stake, earn rewards, and join the ecosystem.`;
                              const shareUrl =
                                `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
                              if (typeof window !== "undefined") window.open(shareUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="rounded-full border border-purple-400/60 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-100 hover:bg-purple-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/80"
                          >
                            Share (Farcaster)
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
                                `Stake, earn rewards, and join the ecosystem.`;
                              const shareUrl =
                                `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                              if (typeof window !== "undefined") window.open(shareUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
                          >
                            Share (X)
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
      </div>

      {/* ───────────────── Fund Pool Modal ───────────────── */}
      <FundPoolModal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        target={fundTarget}
        publicClient={publicClient}
        suggestedAmount={fundSuggestedAmount || undefined}
      />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────
 * FUND POOL MODAL
 * ──────────────────────────────────────────────────────────── */
type FundPoolModalProps = {
  open: boolean;
  onClose: () => void;
  target: FundTarget | null;
  publicClient: PublicClientType;
  suggestedAmount?: string;
};

function FundPoolModal({ open, onClose, target, publicClient, suggestedAmount }: FundPoolModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaErr, setMetaErr] = useState<string | null>(null);

  const { writeContract: writeFund, data: fundTxHash, error: fundErr } = useWriteContract();
  const { isLoading: fundPending, isSuccess: fundMined } = useWaitForTransactionReceipt({
    hash: fundTxHash,
    chainId: base.id,
  });

  const [fundMsg, setFundMsg] = useState("");

  // Reset when open
  useEffect(() => {
    if (open) {
      setFundMsg("");
      setMetaErr(null);
      setAmount(suggestedAmount || "");
    }
  }, [open, suggestedAmount]);

  // Auto-close after mined
  useEffect(() => {
    if (!open || !fundMined) return;
    const id = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(id);
  }, [open, fundMined, onClose]);

  // Load metadata on-chain for exact decimals
  useEffect(() => {
    if (!open || !target || !publicClient) return;
    const client = publicClient as NonNullable<PublicClientType>;
    const currentTarget = target;

    let cancelled = false;

    async function load() {
      try {
        setMetaLoading(true);
        setMetaErr(null);

        const [symbol, name, decimals] = await Promise.all([
          client.readContract({
            address: currentTarget.rewardToken,
            abi: ERC20_METADATA_ABI,
            functionName: "symbol",
          }),
          client.readContract({
            address: currentTarget.rewardToken,
            abi: ERC20_METADATA_ABI,
            functionName: "name",
          }),
          client.readContract({
            address: currentTarget.rewardToken,
            abi: ERC20_METADATA_ABI,
            functionName: "decimals",
          }),
        ]);

        if (!cancelled) {
          setTokenMeta({
            symbol: (symbol as string) || "TOKEN",
            name: (name as string) || "Token",
            decimals: Number(decimals ?? 18),
          });
        }
      } catch {
        if (!cancelled) {
          setMetaErr("Could not load token metadata; using 18 decimals.");
          setTokenMeta({ symbol: "TOKEN", name: "Token", decimals: 18 });
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, target, publicClient]);

  async function handleFund() {
    try {
      setFundMsg("");
      if (!target) return setFundMsg("Missing pool info.");
      if (!address) return setFundMsg("Connect your wallet to fund the pool.");

      const v = amount.trim();
      if (!v) return setFundMsg("Enter an amount to send.");

      const decimals = tokenMeta?.decimals ?? 18;
      const amountWei = parseUnits(v, decimals);
      if (amountWei <= 0n) return setFundMsg("Amount must be greater than 0.");

      await writeFund({
        address: target.rewardToken,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [target.pool, amountWei],
        chainId: base.id,
      });

      setFundMsg("Funding transaction submitted. Confirm in your wallet.");
    } catch (e) {
      setFundMsg(getErrText(e));
    }
  }

  if (!open || !target) return null;
  const symbol = tokenMeta?.symbol ?? "TOKEN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#050815] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-xs text-white/60 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-sm font-semibold mb-1">Fund staking pool</h2>
        <p className="text-[11px] text-white/60 mb-3">
          Send reward tokens directly to the pool contract on Base.
        </p>

        <div className="space-y-2 text-[11px] text-white/70 font-mono mb-3">
          <div className="break-all">Pool: <span className="text-white">{target.pool}</span></div>
          <div className="break-all">Reward token: <span className="text-white">{target.rewardToken}</span></div>
        </div>

        <label className="block mb-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-white/60">
            Amount to send ({symbol})
          </span>
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={suggestedAmount || "e.g. 1000"}
            className={inputBase}
          />
          {metaLoading && <p className="mt-1 text-[11px] text-white/50">Loading token info…</p>}
          {metaErr && <p className="mt-1 text-[11px] text-amber-200">{metaErr}</p>}
        </label>

        <button type="button" onClick={handleFund} disabled={fundPending} className={primaryBtn}>
          {fundPending ? "Sending…" : `Send ${symbol} to pool`}
        </button>

        <div className="mt-3 space-y-1 text-[11px] text-white/65">
          {fundTxHash && (
            <div>
              Funding tx:{" "}
              <Link
                href={`https://basescan.org/tx/${fundTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#79ffe1] underline decoration-dotted underline-offset-4"
              >
                view on Basescan ↗
              </Link>
            </div>
          )}
          {fundMined && <div className="text-emerald-300">Funding confirmed ✔ (closing…)</div>}
          {(fundMsg || fundErr) && <div className="text-rose-300">{fundMsg || getErrText(fundErr)}</div>}
          {!fundMined && (
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
