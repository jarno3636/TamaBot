// app/staking/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatUnits } from "viem";

import useFid from "@/hooks/useFid";
import {
  CONFIG_STAKING_FACTORY,
  BASEBOTS_STAKING_POOL,
  BASEBOTS_NFT,
} from "@/lib/stakingContracts";

import CreatePoolCard from "@/components/staking/CreatePoolCard";
import FundPoolModal from "@/components/staking/FundPoolModal";
import PoolsList from "@/components/staking/PoolsList";

// ✅ ADD THIS (your existing How-To component)
import HowToStaking from "@/components/staking/HowToStaking";

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

export type FundTarget = {
  pool: `0x${string}`;
  rewardToken: `0x${string}`;
};

type PoolUserRow = readonly [bigint, bigint, bigint];

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function shortenAddress(addr?: string, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= 2 + chars * 2) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

function getErrText(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage) return anyE.shortMessage;
    if (typeof anyE.message === "string" && anyE.message) return anyE.message;
    if (anyE.cause && typeof anyE.cause.message === "string" && anyE.cause.message) return anyE.cause.message;
  }
  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}

function fmtNumber(n: number, max = 6) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(n);
}

function safeFormatUnitsToNumber(value: bigint, decimals: number): number {
  // Avoid Number() on huge bigints. formatUnits returns a string, then parseFloat.
  try {
    const s = formatUnits(value, decimals);
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  } catch {
    return NaN;
  }
}

const inputBase =
  "mt-1 w-full max-w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

/* ──────────────────────────────────────────────────────────────
 * Minimal ERC-20 metadata ABI
 * ────────────────────────────────────────────────────────────── */
const ERC20_METADATA_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8", name: "" }] },
] as const;

/* ──────────────────────────────────────────────────────────────
 * Pool interaction ABIs (Enter modal)
 * ────────────────────────────────────────────────────────────── */
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

const ERC721_ENUMERABLE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const POOL_ACTIONS_ABI = [
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "stake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "unstake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  {
    name: "pendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "userAddr", type: "address" }],
    outputs: [{ name: "pendingGross", type: "uint256" }],
  },
  { name: "rewardRate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const POOL_USERS_ABI = [
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

export default function StakingPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });

  const { fid: fidRaw } = useFid();
  const fid = useMemo<number | null>(() => {
    if (fidRaw === null || fidRaw === undefined) return null;
    const n = typeof fidRaw === "number" ? fidRaw : Number(fidRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [fidRaw]);

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
        if (refreshNonce > 0) params.set("refresh", "1");

        const url = `/api/pools${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Pools API failed (${res.status})`);

        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error ?? "Failed to load pools");

        const pools = (json.pools ?? []) as Array<{ pool: string; creator: string; nft: string; rewardToken: string }>;

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
    const pc = publicClient;
    if (!pc || factoryPools.length === 0) {
      setFactoryPoolDetails([]);
      return;
    }

    let cancelled = false;

    async function loadDetails(client: NonNullable<typeof pc>) {
      try {
        const contractsBase = factoryPools.map((p) => ({
          address: p.pool,
          abi: BASEBOTS_STAKING_POOL.abi,
        })) as any[];

        const [startRes, endRes, stakedRes, userRes] = await Promise.all([
          client.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "startTime" })),
            allowFailure: true,
          }),
          client.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "endTime" })),
            allowFailure: true,
          }),
          client.multicall({
            contracts: contractsBase.map((c) => ({ ...c, functionName: "totalStaked" })),
            allowFailure: true,
          }),
          address
            ? client.multicall({
                contracts: contractsBase.map((c) => ({ ...c, functionName: "users", args: [address] })),
                allowFailure: true,
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
            const u = (userRes as any)[i]?.result as PoolUserRow | undefined;
            const amt = u?.[0];
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

    void loadDetails(pc);
    return () => {
      cancelled = true;
    };
  }, [publicClient, factoryPools, address]);

  /* ───────────────── Token meta map (reward token) ───────────────── */
  const [tokenMetaMap, setTokenMetaMap] = useState<Record<string, TokenMeta>>({});
  const fetchingRewardsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pc = publicClient;
    if (!pc) return;
    if (factoryPoolDetails.length === 0) return;

    const uniqueRewards = Array.from(new Set(factoryPoolDetails.map((p) => p.rewardToken.toLowerCase())));
    const missing = uniqueRewards.filter(
      (a) => !tokenMetaMap[a] && !fetchingRewardsRef.current.has(a)
    );
    if (missing.length === 0) return;

    // mark as in-flight so we don't refire on state changes
    missing.forEach((a) => fetchingRewardsRef.current.add(a));

    let cancelled = false;

    (async () => {
      try {
        const [symRes, nameRes, decRes] = await Promise.all([
          pc.multicall({
            contracts: missing.map((addr) => ({
              address: addr as `0x${string}`,
              abi: ERC20_METADATA_ABI,
              functionName: "symbol",
            })),
            allowFailure: true,
          }),
          pc.multicall({
            contracts: missing.map((addr) => ({
              address: addr as `0x${string}`,
              abi: ERC20_METADATA_ABI,
              functionName: "name",
            })),
            allowFailure: true,
          }),
          pc.multicall({
            contracts: missing.map((addr) => ({
              address: addr as `0x${string}`,
              abi: ERC20_METADATA_ABI,
              functionName: "decimals",
            })),
            allowFailure: true,
          }),
        ]);

        if (cancelled) return;

        const updates: Record<string, TokenMeta> = {};
        for (let i = 0; i < missing.length; i++) {
          const addr = missing[i];
          const symbol = (symRes as any)[i]?.result as string | undefined;
          const name = (nameRes as any)[i]?.result as string | undefined;
          const decimals = (decRes as any)[i]?.result as number | bigint | undefined;

          updates[addr] = {
            symbol: symbol || shortenAddress(addr, 4),
            name: name || shortenAddress(addr, 4),
            decimals: typeof decimals === "bigint" ? Number(decimals) : Number(decimals ?? 18),
          };
        }

        setTokenMetaMap((prev) => ({ ...prev, ...updates }));
      } catch (e) {
        console.error("Failed to fetch token metadata", e);
      } finally {
        // clear in-flight marks
        missing.forEach((a) => fetchingRewardsRef.current.delete(a));
      }
    })();

    return () => {
      cancelled = true;
    };
    // IMPORTANT: do NOT depend on tokenMetaMap (prevents extra loops)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, factoryPoolDetails]);

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
    return (
      factoryPoolDetails.find((p) => p.pool.toLowerCase() === activePoolAddr.toLowerCase()) ?? null
    );
  }, [activePoolAddr, factoryPoolDetails]);

  // Read pool from URL on initial mount
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

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 overflow-x-hidden">
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
                <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[24px] bg-black/90">
                  <Image
                    src="/icon.png"
                    alt="Basebots"
                    width={96}
                    height={96}
                    className="object-contain"
                    priority
                  />
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
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-white/60">Protocol fee</span>
                  <span className="font-semibold text-[#79ffe1]">{protocolFeePercent}%</span>
                </div>
                <p className="mt-2 text-[11px] text-white/60">
                  Tip: after creation, click{" "}
                  <span className="text-white/80 font-semibold">Fund</span> to send reward tokens to the pool address.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ✅ HOW TO STAKING (ADDED) */}
        <HowToStaking />

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
        <PoolsList
          pools={filteredPools}
          poolsLoading={poolsLoading}
          poolsError={poolsError}
          onRefresh={() => setRefreshNonce((n) => n + 1)}
          address={address}
          tokenMetaByAddr={tokenMetaMap}
          basebotsNftAddress={BASEBOTS_NFT.address}
          openFundModalForPool={(t) => openFundModal(t)}
          onEnterPool={(poolAddr) => openPoolModal(poolAddr)}
        />
      </div>

      {/* Fund Pool Modal */}
      <FundPoolModal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        target={fundTarget}
        suggestedAmount={fundSuggestedAmount || undefined}
      />

      {/* Enter Pool Modal */}
      <EnterPoolModal
        open={!!activePool}
        onClose={closePoolModal}
        pool={activePool}
        address={address}
        tokenMetaMap={tokenMetaMap}
        fid={fid}
      />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────
 * ENTER POOL MODAL (NO PORTAL)
 * ──────────────────────────────────────────────────────────── */
function EnterPoolModal({
  open,
  onClose,
  pool,
  address,
  tokenMetaMap,
  fid,
}: {
  open: boolean;
  onClose: () => void;
  pool: FactoryPoolDetails | null;
  address?: `0x${string}`;
  tokenMetaMap: Record<string, TokenMeta>;
  fid: number | null;
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
  const [myStakedAmount, setMyStakedAmount] = useState<bigint | null>(null);

  const [ownedTokenIds, setOwnedTokenIds] = useState<string[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedErr, setOwnedErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // lock scroll + esc close
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    setMsg("");
    setOwnedErr(null);

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function refreshApprovalAndRewards() {
    const pc = publicClient;
    if (!open || !pool || !pc || !address) return;

    try {
      const [isApproved, pending, userRow] = await Promise.all([
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
        pc.readContract({
          address: pool.pool,
          abi: POOL_USERS_ABI,
          functionName: "users",
          args: [address],
        }) as Promise<PoolUserRow>,
      ]);

      const amount = userRow?.[0] ?? 0n;

      setApproved(!!isApproved);
      setPendingRewards(pending ?? 0n);
      setMyStakedAmount(amount);
    } catch {
      setApproved(null);
      setPendingRewards(null);
      setMyStakedAmount(null);
    }
  }

  async function refreshOwnedNfts() {
    const pc = publicClient;
    if (!open || !pool || !pc || !address) return;

    setOwnedLoading(true);
    setOwnedErr(null);

    try {
      const bal = (await pc.readContract({
        address: pool.nft,
        abi: ERC721_ENUMERABLE_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      const count = Number(bal ?? 0n);
      const capped = Math.min(count, 50);
      const ids: string[] = [];

      for (let i = 0; i < capped; i++) {
        const tid = (await pc.readContract({
          address: pool.nft,
          abi: ERC721_ENUMERABLE_ABI,
          functionName: "tokenOfOwnerByIndex",
          args: [address, BigInt(i)],
        })) as bigint;

        ids.push(tid.toString());
      }

      setOwnedTokenIds(ids);

      const fidStr = fid ? String(fid) : "";
      setTokenId((prev) => {
        if (prev.trim()) return prev;
        if (fidStr && ids.includes(fidStr)) return fidStr;
        if (fidStr) return fidStr;
        return ids[0] ?? "";
      });
    } catch {
      setOwnedTokenIds([]);
      setOwnedErr("Could not auto-detect tokenIds (collection may not be enumerable). You can still type a tokenId.");
      if (fid) setTokenId((prev) => (prev.trim() ? prev : String(fid)));
    } finally {
      setOwnedLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void refreshApprovalAndRewards();
    void refreshOwnedNfts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pool?.pool, pool?.nft, address, txMined, fid]);

  function doApprove() {
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

  function doStake() {
    try {
      setMsg("");
      if (!pool) return;
      if (!address) return setMsg("Connect your wallet.");

      const tid = tokenId.trim();
      if (!tid) return setMsg("Pick or enter a tokenId.");
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

  function doUnstake() {
    try {
      setMsg("");
      if (!pool) return;
      if (!address) return setMsg("Connect your wallet.");

      const tid = tokenId.trim();
      if (!tid) return setMsg("Pick or enter a tokenId.");
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

  function doClaim() {
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

  const rewardLower = pool.rewardToken.toLowerCase();
  const rewardMeta = tokenMetaMap[rewardLower];
  const rewardSymbol = rewardMeta?.symbol ?? shortenAddress(pool.rewardToken, 4);
  const rewardDecimals = rewardMeta?.decimals ?? 18;

  const pendingPretty =
    pendingRewards === null
      ? "—"
      : fmtNumber(safeFormatUnitsToNumber(pendingRewards, rewardDecimals), 6);

  const stakedPretty = myStakedAmount === null ? "—" : myStakedAmount.toString();

  const neon = "#79ffe1";
  const cardBg = "#070A16";
  const isConnected = !!address;
  const canAct = approved === true && !txPending;

  return (
    <div
      className="fixed inset-0 z-[999999] grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enter pool modal"
      style={{ WebkitTapHighlightColor: "transparent" as any }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: "rgba(255,255,255,0.16)",
          background: cardBg,
          boxShadow: "0 30px 90px rgba(0,0,0,0.95)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(700px 280px at 15% -10%, rgba(121,255,225,0.18), transparent 60%), radial-gradient(700px 280px at 90% 0%, rgba(56,189,248,0.16), transparent 55%)",
          }}
        />

        <div
          className="relative"
          style={{
            maxHeight: "min(78svh, 640px)",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="relative p-5" style={{ background: "rgba(7,10,22,0.92)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Stake / Claim</h2>
                <p className="mt-1 text-[11px] text-white/60 break-all">
                  Pool <span className="font-mono text-white/85">{shortenAddress(pool.pool, 4)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border px-2.5 py-1 text-[11px]"
                style={{
                  borderColor: "rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                ✕
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`https://basescan.org/address/${pool.pool}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-3 py-1 text-[11px]"
                style={{
                  borderColor: "rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.90)",
                }}
              >
                Basescan ↗
              </Link>

              <div className="flex flex-wrap gap-2 justify-end">
                <div
                  className="rounded-full border px-3 py-1 text-[11px] font-mono"
                  style={{
                    borderColor: "rgba(121,255,225,0.30)",
                    background: "rgba(121,255,225,0.08)",
                    color: "rgba(217,255,248,0.95)",
                  }}
                >
                  Pending: {pendingPretty} {rewardSymbol}
                </div>

                <div
                  className="rounded-full border px-3 py-1 text-[11px] font-mono"
                  style={{
                    borderColor: "rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.90)",
                  }}
                >
                  Staked: {stakedPretty}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.38)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/60 uppercase tracking-wide">Approval</span>
                <span className="text-[11px] text-white/70">
                  {approved === null ? "—" : approved ? "Approved" : "Not approved"}
                </span>
              </div>

              <button
                type="button"
                onClick={doApprove}
                disabled={txPending || approved === true || !isConnected}
                className="mt-2 w-full rounded-full border px-3 py-2 text-[12px] font-semibold transition-all active:scale-[0.98]"
                style={{
                  borderColor: !isConnected
                    ? "rgba(255,255,255,0.10)"
                    : approved
                      ? "rgba(52,211,153,0.40)"
                      : "rgba(121,255,225,0.45)",
                  background: !isConnected
                    ? "rgba(255,255,255,0.05)"
                    : approved
                      ? "rgba(16,185,129,0.10)"
                      : "linear-gradient(135deg, rgba(3,28,27,0.92), rgba(6,30,45,0.62))",
                  color: !isConnected ? "rgba(255,255,255,0.35)" : approved ? "rgba(236,253,245,0.92)" : neon,
                  cursor: !isConnected || approved || txPending ? "not-allowed" : "pointer",
                }}
              >
                {!isConnected ? "Connect wallet to approve" : approved ? "Approved" : txPending ? "Approving…" : "Approve pool to stake"}
              </button>
            </div>

            <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.38)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-white/60">Your NFT</span>
                <button
                  type="button"
                  onClick={() => refreshOwnedNfts()}
                  disabled={!isConnected || ownedLoading}
                  className="rounded-full border px-2.5 py-1 text-[11px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.78)",
                    opacity: !isConnected || ownedLoading ? 0.6 : 1,
                  }}
                >
                  {ownedLoading ? "Scanning…" : "Rescan"}
                </button>
              </div>

              {ownedErr && <p className="mt-2 text-[11px]" style={{ color: "rgba(255,211,107,0.95)" }}>{ownedErr}</p>}

              {ownedTokenIds.length > 0 ? (
                <label className="mt-2 block">
                  <span className="text-[11px] text-white/60">Select tokenId</span>
                  <select
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-2"
                    style={{ borderColor: "rgba(255,255,255,0.20)", background: "#0B1022" }}
                    disabled={!isConnected}
                  >
                    {ownedTokenIds.map((id) => (
                      <option key={id} value={id}>
                        #{id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="mt-2 block">
                  <span className="text-[11px] text-white/60">Enter tokenId</span>
                  <input
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    placeholder={fid ? `e.g. ${fid}` : "e.g. 123"}
                    className={inputBase}
                    inputMode="numeric"
                    disabled={!isConnected}
                  />
                </label>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={doStake}
                disabled={!canAct}
                className="rounded-full border py-2 text-[12px] font-semibold transition-all active:scale-[0.98]"
                style={{
                  borderColor: canAct ? "rgba(52,211,153,0.55)" : "rgba(255,255,255,0.10)",
                  background: canAct ? "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(0,0,0,0.20))" : "rgba(255,255,255,0.05)",
                  color: canAct ? "rgba(236,253,245,0.96)" : "rgba(255,255,255,0.35)",
                }}
              >
                {txPending ? "Working…" : "Stake"}
              </button>

              <button
                type="button"
                onClick={doUnstake}
                disabled={!canAct}
                className="rounded-full border py-2 text-[12px] font-semibold transition-all active:scale-[0.98]"
                style={{
                  borderColor: canAct ? "rgba(251,113,133,0.55)" : "rgba(255,255,255,0.10)",
                  background: canAct ? "linear-gradient(135deg, rgba(244,63,94,0.14), rgba(0,0,0,0.20))" : "rgba(255,255,255,0.05)",
                  color: canAct ? "rgba(255,241,242,0.96)" : "rgba(255,255,255,0.35)",
                }}
              >
                {txPending ? "Working…" : "Unstake"}
              </button>
            </div>

            <button
              type="button"
              onClick={doClaim}
              disabled={!canAct}
              className="mt-2 w-full rounded-full border py-2 text-[12px] font-semibold transition-all active:scale-[0.98]"
              style={{
                borderColor: canAct ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
                background: canAct ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                color: canAct ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)",
              }}
            >
              {txPending ? "Working…" : `Claim ${rewardSymbol}`}
            </button>

            <div className="mt-3 space-y-1 text-[11px] text-white/75">
              {txHash && (
                <div>
                  Tx:{" "}
                  <Link
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-4"
                    style={{ color: neon }}
                  >
                    view ↗
                  </Link>
                </div>
              )}
              {txMined && <div className="text-emerald-300">Confirmed ✔</div>}
              {(msg || txErr) && <div className="text-rose-300 break-words">{msg || getErrText(txErr)}</div>}
            </div>

            <div className="mt-4 text-[10px] text-white/45">
              Tip: if tokenId scanning fails, the NFT may not be enumerable — manual tokenId entry still works.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
