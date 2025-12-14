// app/staking/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "viem/chains";

import {
  CONFIG_STAKING_FACTORY,
  BASEBOTS_STAKING_POOL,
  BASEBOTS_NFT,
} from "@/lib/stakingContracts";

import CreatePoolCard from "@/components/staking/CreatePoolCard";
import FundPoolModal from "@/components/staking/FundPoolModal";

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

/* ──────────────────────────────────────────────────────────────
 * Minimal ERC-20 metadata ABI (token-info fallback for modal)
 * ──────────────────────────────────────────────────────────── */
const ERC20_METADATA_ABI = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
  },
] as const;

/* ──────────────────────────────────────────────────────────────
 * Pool interaction ABIs
 * ──────────────────────────────────────────────────────────── */
const ERC721_APPROVAL_ABI = [
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const POOL_ACTIONS_ABI = [
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "stake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unstake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "pendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "userAddr", type: "address" }],
    outputs: [{ name: "pendingGross", type: "uint256" }],
  },
] as const;

export default function StakingPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [poolSearch, setPoolSearch] = useState("");

  /* ───────────────── Protocol fee ───────────────── */
  const { data: protocolFeeBpsRaw } = useReadContract({
    ...CONFIG_STAKING_FACTORY,
    functionName: "protocolFeeBps",
    chainId: base.id,
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

  /* ───────────────── Pool details (multicall) ───────────────── */
  useEffect(() => {
    // ✅ hard narrow: after this line, pcNonNull is NOT undefined
    const pcNonNull = publicClient;
    if (!pcNonNull || factoryPools.length === 0) {
      setFactoryPoolDetails([]);
      return;
    }

    let cancelled = false;

    async function loadDetails(pc: typeof pcNonNull) {
      try {
        const contractsBase = factoryPools.map((p) => ({
          address: p.pool,
          abi: BASEBOTS_STAKING_POOL.abi,
        })) as any[];

        const [startRes, endRes, stakedRes, userRes] = await Promise.all([
          pc.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "startTime" })),
          }),
          pc.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "endTime" })),
          }),
          pc.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "totalStaked" })),
          }),
          address
            ? pc.multicall({
                contracts: contractsBase.map((c) => ({
                  ...c,
                  functionName: "users",
                  args: [address],
                })),
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
        if (!cancelled) setPoolsError(`Failed to load pool details. ${getErrText(err)}`);
      }
    }

    void loadDetails(pcNonNull);
    return () => {
      cancelled = true;
    };
  }, [publicClient, factoryPools, address]);

  /* ───────────────── Token meta map (reward token) ───────────────── */
  const [tokenMetaMap, setTokenMetaMap] = useState<Record<string, TokenMeta>>({});

  useEffect(() => {
    const pcNonNull = publicClient;
    if (!pcNonNull) return;
    if (factoryPoolDetails.length === 0) return;

    let cancelled = false;

    const uniqueRewards = Array.from(new Set(factoryPoolDetails.map((p) => p.rewardToken.toLowerCase())));
    const missing = uniqueRewards.filter((a) => !tokenMetaMap[a]);
    if (missing.length === 0) return;

    (async () => {
      try {
        const updates: Record<string, TokenMeta> = {};

        for (const addr of missing) {
          try {
            const [symbol, name, decimals] = await Promise.all([
              pcNonNull.readContract({
                address: addr as `0x${string}`,
                abi: ERC20_METADATA_ABI,
                functionName: "symbol",
              }),
              pcNonNull.readContract({
                address: addr as `0x${string}`,
                abi: ERC20_METADATA_ABI,
                functionName: "name",
              }),
              pcNonNull.readContract({
                address: addr as `0x${string}`,
                abi: ERC20_METADATA_ABI,
                functionName: "decimals",
              }),
            ]);

            updates[addr] = {
              symbol: (symbol as string) || shortenAddress(addr, 4),
              name: (name as string) || shortenAddress(addr, 4),
              decimals: Number(decimals ?? 18),
            };
          } catch {
            // ignore per-token failures
          }
        }

        if (!cancelled && Object.keys(updates).length > 0) {
          setTokenMetaMap((prev) => ({ ...prev, ...updates }));
        }
      } catch (e) {
        console.error("Failed to fetch token metadata", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, factoryPoolDetails]); // tokenMetaMap intentionally omitted

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
      if (activeFilter === "my-pools") return !!address && p.creator.toLowerCase() === address.toLowerCase();
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

  /* ───────────────── Enter Pool modal state ───────────────── */
  const [activePoolAddr, setActivePoolAddr] = useState<`0x${string}` | null>(null);
  const activePool = useMemo(() => {
    if (!activePoolAddr) return null;
    return factoryPoolDetails.find((p) => p.pool.toLowerCase() === activePoolAddr.toLowerCase()) ?? null;
  }, [activePoolAddr, factoryPoolDetails]);

  // read ?pool= from URL (same-page modal behavior)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const pool = url.searchParams.get("pool");
    if (pool && pool.startsWith("0x") && pool.length === 42) {
      setActivePoolAddr(pool as `0x${string}`);
    }
  }, []);

  function openPoolModal(poolAddr: `0x${string}`) {
    setActivePoolAddr(poolAddr);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("pool", poolAddr);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function closePoolModal() {
    setActivePoolAddr(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("pool");
      window.history.replaceState({}, "", url.toString());
    }
  }

  /* ───────────────── Render ───────────────── */
  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer overflow-x-hidden">
      <div className="container pt-6 px-5 stack space-y-6">
        {/* Intro */}
        <section className="glass glass-pad relative overflow-hidden rounded-3xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 400px at 10% -20%, rgba(58,166,216,0.18), transparent 60%), radial-gradient(900px 500px at 90% -30%, rgba(121,255,225,0.14), transparent 70%)",
              maskImage: "radial-gradient(120% 120% at 50% 0%, #000 55%, transparent 100%)",
            }}
          />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-[28px] bg-gradient-to-tr from-[#79ffe1] via-sky-500 to-indigo-500 shadow-[0_0_36px_rgba(121,255,225,0.8)]">
                <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[24px] bg-black/85">
                  <Image src="/icon.png" alt="Basebots" width={96} height={96} className="object-contain" priority />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">NFT Staking</h1>
                <p className="mt-1 text-white/80 text-sm md:text-base max-w-md">
                  Create pools for any ERC-721 on Base and stream rewards in any ERC-20.
                </p>
                <p className="mt-2 text-[11px] text-white/60 max-w-md">
                  Creating a pool sets the schedule —{" "}
                  <span className="font-semibold text-[#79ffe1]">you must fund it after</span>.
                </p>
              </div>
            </div>

            <div className="mt-2 md:mt-0 text-sm text-white/75 max-w-xl">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-white/60">Protocol fee</span>
                  <span className="font-semibold text-[#79ffe1]">{protocolFeePercent}%</span>
                </div>
                <p className="mt-2 text-[11px] text-white/60">
                  Tip: after creation, click <span className="text-white/80 font-semibold">Fund</span> to send reward
                  tokens to the pool address.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Create Pool */}
        <CreatePoolCard
          protocolFeePercent={protocolFeePercent}
          onOpenFundModal={(target, suggestedAmount) => openFundModal(target, suggestedAmount)}
          onLastCreatedPoolResolved={(poolAddr) => openPoolModal(poolAddr)}
        />

        {/* Filters */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
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
                  "px-3 py-1.5 rounded-full border transition-all active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
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

        {/* Pools List */}
        <section className="glass glass-pad rounded-3xl border border-white/10 bg-[#020617]/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-semibold">Staking Pools</h3>
              <p className="text-[11px] md:text-xs text-white/55">
                Tap <span className="text-white/75 font-semibold">Enter</span> to stake / unstake / claim. Creators can fund.
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
            <p className="text-xs text-white/60">No pools yet. Create one above.</p>
          )}

          {factoryPools.length > 0 && filteredPools.length === 0 && !poolsLoading && !poolsError && (
            <p className="text-xs text-white/60">No pools match your filter/search.</p>
          )}

          {filteredPools.length > 0 && (
            <div className="mt-1 grid gap-3 text-xs">
              {filteredPools.map((pool) => {
                const now = nowSeconds();
                const isCreator = !!address && pool.creator.toLowerCase() === address.toLowerCase();
                const isBasebotsNft = pool.nft.toLowerCase() === BASEBOTS_NFT.address.toLowerCase();

                const status: "upcoming" | "live" | "closed" = (() => {
                  if (pool.startTime === 0) return "upcoming";
                  if (now < pool.startTime) return "upcoming";
                  if (pool.endTime !== 0 && now > pool.endTime) return "closed";
                  return "live";
                })();

                const rewardLower = pool.rewardToken.toLowerCase();
                const meta = tokenMetaMap[rewardLower];
                const rewardLabel = meta ? meta.symbol : shortenAddress(pool.rewardToken, 4);

                return (
                  <div key={pool.pool} className="rounded-2xl border border-white/12 bg-black/35 px-4 py-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white/90">
                            {isBasebotsNft ? "Basebots NFT Pool" : "NFT Pool"}
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

                        <div className="flex flex-wrap gap-4 text-[11px] text-white/65 font-mono">
                          <span>Pool: {shortenAddress(pool.pool, 4)}</span>
                          <span>NFT: {shortenAddress(pool.nft, 4)}</span>
                          <span>Reward: {rewardLabel}</span>
                          <span>Staked: {pool.totalStaked.toString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                        <button
                          type="button"
                          onClick={() => openPoolModal(pool.pool)}
                          className="rounded-full border border-[#79ffe1]/50 bg-[#031c1b] px-3 py-1 text-[11px] font-semibold text-[#79ffe1] hover:bg-[#052b29] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
                        >
                          Enter
                        </button>

                        <Link
                          href={`https://basescan.org/address/${pool.pool}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:bg-white/10 transition-all active:scale-95"
                        >
                          Basescan ↗
                        </Link>

                        {isCreator && (
                          <button
                            type="button"
                            onClick={() => openFundModal({ pool: pool.pool, rewardToken: pool.rewardToken })}
                            className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-all active:scale-95"
                          >
                            Fund
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Fund Pool Modal (portal-based) */}
      <FundPoolModal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        target={fundTarget}
        suggestedAmount={fundSuggestedAmount || undefined}
      />

      {/* Enter Pool Modal (same-page) */}
      <EnterPoolModal open={!!activePool} onClose={closePoolModal} pool={activePool} address={address} />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────
 * ENTER POOL MODAL (same page)
 * - approve NFT (setApprovalForAll)
 * - stake tokenId
 * - unstake tokenId
 * - claim
 * - shows pending rewards
 * - ✅ step indicator + gated buttons
 * ──────────────────────────────────────────────────────────── */
function EnterPoolModal({
  open,
  onClose,
  pool,
  address,
}: {
  open: boolean;
  onClose: () => void;
  pool: FactoryPoolDetails | null;
  address?: `0x${string}`;
}) {
  const publicClient = usePublicClient({ chainId: base.id });
  const { writeContract, data: txHash, error: txErr } = useWriteContract();
  const { isLoading: txPending, isSuccess: txMined } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [approved, setApproved] = useState<boolean | null>(null);
  const [pendingRewards, setPendingRewards] = useState<bigint | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setMsg("");
    setTokenId("");
  }, [open]);

  async function refreshApprovalAndRewards() {
    const pc = publicClient;
    if (!open || !pool || !pc || !address) return;

    try {
      const [isApproved, pending] = await Promise.all([
        pc.readContract({
          address: pool.nft,
          abi: ERC721_APPROVAL_ABI,
          functionName: "isApprovedForAll",
          args: [address, pool.pool],
        }) as Promise<boolean>,
        pc.readContract({
          address: pool.pool,
          abi: POOL_ACTIONS_ABI,
          functionName: "pendingRewards",
          args: [address],
        }) as Promise<bigint>,
      ]);
      setApproved(!!isApproved);
      setPendingRewards(pending ?? 0n);
    } catch {
      setApproved(null);
      setPendingRewards(null);
    }
  }

  useEffect(() => {
    void refreshApprovalAndRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pool?.pool, address, txMined]);

  async function doApprove() {
    try {
      setMsg("");
      if (!pool) return;
      if (!address) return setMsg("Connect your wallet.");

      writeContract({
        address: pool.nft,
        abi: ERC721_APPROVAL_ABI,
        functionName: "setApprovalForAll",
        args: [pool.pool, true],
        chainId: base.id,
      });
      setMsg("Approval submitted. Confirm in your wallet.");
    } catch (e) {
      setMsg(getErrText(e));
    }
  }

  async function doStake() {
    try {
      setMsg("");
      if (!pool) return;
      if (!address) return setMsg("Connect your wallet.");

      const tid = tokenId.trim();
      if (!tid) return setMsg("Enter a tokenId.");
      if (!/^\d+$/.test(tid)) return setMsg("tokenId must be an integer.");

      writeContract({
        address: pool.pool,
        abi: POOL_ACTIONS_ABI,
        functionName: "stake",
        args: [BigInt(tid)],
        chainId: base.id,
      });

      setMsg("Stake submitted. Confirm in your wallet.");
    } catch (e) {
      setMsg(getErrText(e));
    }
  }

  async function doUnstake() {
    try {
      setMsg("");
      if (!pool) return;
      if (!address) return setMsg("Connect your wallet.");

      const tid = tokenId.trim();
      if (!tid) return setMsg("Enter a tokenId.");
      if (!/^\d+$/.test(tid)) return setMsg("tokenId must be an integer.");

      writeContract({
        address: pool.pool,
        abi: POOL_ACTIONS_ABI,
        functionName: "unstake",
        args: [BigInt(tid)],
        chainId: base.id,
      });

      setMsg("Unstake submitted. Confirm in your wallet.");
    } catch (e) {
      setMsg(getErrText(e));
    }
  }

  async function doClaim() {
    try {
      setMsg("");
      if (!pool) return;
      if (!address) return setMsg("Connect your wallet.");

      writeContract({
        address: pool.pool,
        abi: POOL_ACTIONS_ABI,
        functionName: "claim",
        args: [],
        chainId: base.id,
      });

      setMsg("Claim submitted. Confirm in your wallet.");
    } catch (e) {
      setMsg(getErrText(e));
    }
  }

  if (!open || !pool || !mounted) return null;

  const now = nowSeconds();
  const status: "upcoming" | "live" | "closed" = (() => {
    if (pool.startTime === 0) return "upcoming";
    if (now < pool.startTime) return "upcoming";
    if (pool.endTime !== 0 && now > pool.endTime) return "closed";
    return "live";
  })();

  const isConnected = !!address;
  const canAct = approved === true && !txPending;
  const step = !isConnected ? 1 : approved === true ? 3 : 2;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#070A16] shadow-[0_30px_90px_rgba(0,0,0,0.92)] ring-1 ring-white/10">
        <div
          aria-hidden
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(700px 280px at 15% -10%, rgba(121,255,225,0.18), transparent 60%), radial-gradient(700px 280px at 90% 0%, rgba(56,189,248,0.16), transparent 55%)",
          }}
        />

        <div className="relative p-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
          >
            ✕
          </button>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Enter pool</h2>
              <p className="mt-1 text-[11px] text-white/60">
                Pool <span className="font-mono text-white/80">{shortenAddress(pool.pool, 4)}</span> •{" "}
                {status === "live" ? (
                  <span className="text-emerald-300 font-semibold">Live</span>
                ) : status === "upcoming" ? (
                  <span className="text-sky-300 font-semibold">Upcoming</span>
                ) : (
                  <span className="text-rose-300 font-semibold">Closed</span>
                )}
              </p>
            </div>

            <Link
              href={`https://basescan.org/address/${pool.pool}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:bg-white/10"
            >
              Basescan ↗
            </Link>
          </div>

          {/* Step indicator */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-white/60">Steps</span>
              <span className="text-[11px] text-white/70">
                {step === 1 ? "Connect" : step === 2 ? "Approve" : "Stake / Claim"}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { n: 1, label: "Connect" },
                { n: 2, label: "Approve" },
                { n: 3, label: "Stake" },
              ].map((s) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                  <div
                    key={s.n}
                    className={[
                      "rounded-xl border px-2 py-2 text-center",
                      done
                        ? "border-emerald-400/40 bg-emerald-500/10"
                        : active
                        ? "border-[#79ffe1]/40 bg-[#031c1b]"
                        : "border-white/10 bg-white/5",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "text-[10px] font-semibold",
                        done ? "text-emerald-200" : active ? "text-[#79ffe1]" : "text-white/60",
                      ].join(" ")}
                    >
                      {done ? "✓" : s.n}. {s.label}
                    </div>
                    <div className="mt-1 h-[2px] w-full rounded-full bg-white/5">
                      <div
                        className={[
                          "h-[2px] rounded-full transition-all",
                          done ? "w-full bg-emerald-400/60" : active ? "w-2/3 bg-[#79ffe1]/60" : "w-0",
                        ].join(" ")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!isConnected && <p className="mt-2 text-[11px] text-amber-200/80">Connect a wallet to continue.</p>}
            {isConnected && approved !== true && (
              <p className="mt-2 text-[11px] text-white/60">
                Approve this pool to move NFTs in/out for staking (one-time per NFT collection).
              </p>
            )}
            {isConnected && approved === true && (
              <p className="mt-2 text-[11px] text-emerald-200/80">Approved — you can stake, unstake, and claim.</p>
            )}
          </div>

          <div className="mt-3 grid gap-2 text-[11px] text-white/70 font-mono rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="break-all">
              NFT: <span className="text-white">{pool.nft}</span>
            </div>
            <div className="break-all">
              Reward: <span className="text-white">{pool.rewardToken}</span>
            </div>
            <div>
              Pending: <span className="text-white">{pendingRewards === null ? "—" : pendingRewards.toString()}</span>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60 uppercase tracking-wide">Approval</span>
              <span className="text-[11px] text-white/70">{approved === null ? "—" : approved ? "Approved" : "Not approved"}</span>
            </div>

            <button
              type="button"
              onClick={doApprove}
              disabled={txPending || approved === true || !isConnected}
              className={[
                "mt-2 w-full rounded-full px-3 py-2 text-[12px] font-semibold transition-all active:scale-[0.98]",
                !isConnected
                  ? "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                  : approved
                  ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 cursor-not-allowed"
                  : "border border-[#79ffe1]/40 bg-[#031c1b] text-[#79ffe1] hover:bg-[#052b29]",
              ].join(" ")}
            >
              {!isConnected ? "Connect wallet to approve" : approved ? "Approved" : txPending ? "Approving…" : "Approve pool to stake"}
            </button>
          </div>

          <div className="mt-3">
            <span className="text-[11px] text-white/60 uppercase tracking-wide">tokenId</span>
            <input
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g. 123"
              className={inputBase}
              inputMode="numeric"
              disabled={!isConnected}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={doStake}
              disabled={!canAct}
              className={[
                "rounded-full border py-2 text-[12px] font-semibold transition-all active:scale-[0.98]",
                canAct
                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                  : "border-white/10 bg-white/5 text-white/35 cursor-not-allowed",
              ].join(" ")}
              title={approved === true ? "" : "Approve first"}
            >
              {txPending ? "Working…" : "Stake"}
            </button>

            <button
              type="button"
              onClick={doUnstake}
              disabled={!canAct}
              className={[
                "rounded-full border py-2 text-[12px] font-semibold transition-all active:scale-[0.98]",
                canAct
                  ? "border-rose-400/50 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                  : "border-white/10 bg-white/5 text-white/35 cursor-not-allowed",
              ].join(" ")}
              title={approved === true ? "" : "Approve first"}
            >
              {txPending ? "Working…" : "Unstake"}
            </button>
          </div>

          <button
            type="button"
            onClick={doClaim}
            disabled={!canAct}
            className={[
              "mt-2 w-full rounded-full border py-2 text-[12px] font-semibold transition-all active:scale-[0.98]",
              canAct ? "border-white/15 bg-white/5 text-white/85 hover:bg-white/10" : "border-white/10 bg-white/5 text-white/35 cursor-not-allowed",
            ].join(" ")}
            title={approved === true ? "" : "Approve first"}
          >
            {txPending ? "Working…" : "Claim rewards"}
          </button>

          <div className="mt-3 space-y-1 text-[11px] text-white/70">
            {txHash && (
              <div>
                Tx:{" "}
                <Link
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#79ffe1] underline decoration-dotted underline-offset-4"
                >
                  view ↗
                </Link>
              </div>
            )}
            {txMined && <div className="text-emerald-300">Confirmed ✔</div>}
            {(msg || txErr) && <div className="text-rose-300">{msg || getErrText(txErr)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
    }
