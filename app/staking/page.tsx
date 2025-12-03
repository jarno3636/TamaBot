"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { base } from "viem/chains";
import { formatUnits, parseUnits, parseAbiItem } from "viem";
import Link from "next/link";
import Image from "next/image";

import {
  CONFIG_STAKING_FACTORY,
  BASEBOTS_STAKING_POOL,
  BOTS_TOKEN,
} from "@/lib/stakingContracts";

// If you have this already somewhere, you can remove this local copy
const BASEBOTS_NFT_ADDRESS =
  "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as `0x${string}`;

type FilterTab = "all" | "live" | "closed" | "my-staked" | "my-pools";
type FeeMode = "claim" | "unstake" | "both";

type FactoryPoolMeta = {
  pool: `0x${string}`;
  creator: `0x${string}`;
  nft: `0x${string}`;
  rewardToken: `0x${string}`;
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function shortenAddress(addr?: string, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= 2 + chars * 2) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export default function StakingPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  /* ──────────────────────────────────────────────────────────────
   * READ FACTORY PROTOCOL FEE
   * ──────────────────────────────────────────────────────────── */
  const { data: protocolFeeBpsRaw } = useReadContract({
    ...CONFIG_STAKING_FACTORY,
    functionName: "protocolFeeBps",
  });

  const protocolFeeBps = Number(protocolFeeBpsRaw ?? 0);
  const protocolFeePercent = protocolFeeBps / 100;

  /* ──────────────────────────────────────────────────────────────
   * READ BASEBOTS POOL CORE STATE
   * ──────────────────────────────────────────────────────────── */
  const { data: startTimeRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "startTime",
  });

  const { data: endTimeRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "endTime",
  });

  const { data: totalStakedRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "totalStaked",
  });

  const { data: rewardRateRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "rewardRate",
  });

  const { data: creatorFeeBpsRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "creatorFeeBps",
  });

  const { data: takeFeeOnClaimRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "takeFeeOnClaim",
  });

  const { data: takeFeeOnUnstakeRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "takeFeeOnUnstake",
  });

  const { data: creatorAddress } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "creator",
  });

  const startTime = Number(startTimeRaw ?? 0);
  const endTime = Number(endTimeRaw ?? 0);
  const totalStaked = (totalStakedRaw ?? 0n) as bigint;
  const rewardRate = (rewardRateRaw ?? 0n) as bigint;
  const creatorFeeBps = Number(creatorFeeBpsRaw ?? 0);
  const creatorFeePercentOnChain = creatorFeeBps / 100;
  const takeFeeOnClaim = Boolean(takeFeeOnClaimRaw);
  const takeFeeOnUnstake = Boolean(takeFeeOnUnstakeRaw);

  const now = nowSeconds();

  const poolStatus: "upcoming" | "live" | "closed" = useMemo(() => {
    if (startTime === 0) return "upcoming";
    if (now < startTime) return "upcoming";
    if (endTime !== 0 && now > endTime) return "closed";
    return "live";
  }, [startTime, endTime, now]);

  /* ──────────────────────────────────────────────────────────────
   * READ USER POSITION
   * ──────────────────────────────────────────────────────────── */
  const { data: userInfoRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "users",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: pendingRaw } = useReadContract({
    ...BASEBOTS_STAKING_POOL,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const userStaked = address ? ((userInfoRaw as any)?.amount ?? 0n) as bigint : 0n;
  const pendingGross = address ? ((pendingRaw ?? 0n) as bigint) : 0n;

  const isMyStaked = address && userStaked > 0n;
  const isMyPool =
    address &&
    creatorAddress &&
    address.toLowerCase() === (creatorAddress as string).toLowerCase();

  /* ──────────────────────────────────────────────────────────────
   * FEE PREVIEW
   * ──────────────────────────────────────────────────────────── */
  const feePreview = useMemo(() => {
    if (pendingGross === 0n) {
      return {
        gross: 0n,
        protocolFee: 0n,
        creatorFee: 0n,
        net: 0n,
      };
    }
    const gross = pendingGross;
    const protocolFee = (gross * BigInt(protocolFeeBps)) / 10000n;
    const creatorFee = (gross * BigInt(creatorFeeBps)) / 10000n;
    const net = gross - protocolFee - creatorFee;
    return { gross, protocolFee, creatorFee, net };
  }, [pendingGross, protocolFeeBps, creatorFeeBps]);

  /* ──────────────────────────────────────────────────────────────
   * APR ESTIMATE
   * ──────────────────────────────────────────────────────────── */
  const assumedStakeValuePerNft = parseUnits("0.01", BOTS_TOKEN.decimals); // example value

  const aprPercent = useMemo(() => {
    if (totalStaked === 0n || rewardRate === 0n) return 0;
    const yearlyReward = rewardRate * BigInt(365 * 24 * 60 * 60);
    const tvl = totalStaked * assumedStakeValuePerNft;
    if (tvl === 0n) return 0;
    const aprBps = (yearlyReward * 10000n) / tvl;
    return Number(aprBps) / 100;
  }, [totalStaked, rewardRate, assumedStakeValuePerNft]);

  /* ──────────────────────────────────────────────────────────────
   * STAKE / UNSTAKE / CLAIM
   * ──────────────────────────────────────────────────────────── */
  const [stakeTokenId, setStakeTokenId] = useState("");
  const [unstakeTokenId, setUnstakeTokenId] = useState("");

  const {
    writeContract: writePool,
    data: txHash,
    error: writeErr,
  } = useWriteContract();
  const { isLoading: txPending, isSuccess: txMined } =
    useWaitForTransactionReceipt({
      hash: txHash,
      chainId: base.id,
    });

  const [txMessage, setTxMessage] = useState<string>("");

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

  async function handleStake() {
    try {
      setTxMessage("");
      if (!address) {
        setTxMessage("Connect your wallet to stake.");
        return;
      }
      const id = stakeTokenId.trim();
      if (!id) {
        setTxMessage("Enter a token ID to stake.");
        return;
      }
      const tokenId = BigInt(id);
      await writePool({
        ...BASEBOTS_STAKING_POOL,
        functionName: "stake",
        args: [tokenId],
        chainId: base.id,
      });
      setTxMessage("Transaction submitted. Confirm in your wallet.");
    } catch (e) {
      setTxMessage(getErrText(e));
    }
  }

  async function handleUnstake() {
    try {
      setTxMessage("");
      if (!address) {
        setTxMessage("Connect your wallet to unstake.");
        return;
      }
      const id = unstakeTokenId.trim();
      if (!id) {
        setTxMessage("Enter a token ID to unstake.");
        return;
      }
      const tokenId = BigInt(id);
      await writePool({
        ...BASEBOTS_STAKING_POOL,
        functionName: "unstake",
        args: [tokenId],
        chainId: base.id,
      });
      setTxMessage("Unstake transaction submitted.");
    } catch (e) {
      setTxMessage(getErrText(e));
    }
  }

  async function handleClaim() {
    try {
      setTxMessage("");
      if (!address) {
        setTxMessage("Connect your wallet to claim rewards.");
        return;
      }
      await writePool({
        ...BASEBOTS_STAKING_POOL,
        functionName: "claim",
        args: [],
        chainId: base.id,
      });
      setTxMessage("Claim transaction submitted.");
    } catch (e) {
      setTxMessage(getErrText(e));
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * CREATE POOL FORM
   * ──────────────────────────────────────────────────────────── */
  const [createForm, setCreateForm] = useState<{
    nftAddress: string;
    rewardToken: string;
    totalRewards: string;
    durationDays: string;
    startDelayHours: string;
    maxStaked: string;
    creatorFeePercent: string; // whole-number percent in the UI
    feeMode: FeeMode;
  }>({
    nftAddress: "",
    rewardToken: BOTS_TOKEN.address as string,
    totalRewards: "1000",
    durationDays: "30",
    startDelayHours: "0",
    maxStaked: "0",
    creatorFeePercent: "2",
    feeMode: "claim",
  });

  const {
    writeContract: writeFactory,
    data: createTxHash,
    error: createErr,
  } = useWriteContract();
  const { isLoading: createPending, isSuccess: createMined } =
    useWaitForTransactionReceipt({
      hash: createTxHash,
      chainId: base.id,
    });
  const [createMsg, setCreateMsg] = useState<string>("");

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreateMsg("");

      if (!address) {
        setCreateMsg("Connect your wallet to create a pool.");
        return;
      }

      const {
        nftAddress,
        rewardToken,
        totalRewards,
        durationDays,
        startDelayHours,
        maxStaked,
        creatorFeePercent,
        feeMode,
      } = createForm;

      if (!nftAddress || !rewardToken) {
        setCreateMsg("Enter both NFT collection and reward token addresses.");
        return;
      }

      const totalRewardsWei = parseUnits(
        totalRewards || "0",
        BOTS_TOKEN.decimals,
      );
      const durationSec = BigInt(Number(durationDays || "0") * 24 * 60 * 60);
      if (durationSec === 0n) {
        setCreateMsg("Duration must be greater than 0 days.");
        return;
      }

      const rewardRate = totalRewardsWei / durationSec;
      if (rewardRate === 0n) {
        setCreateMsg("Total rewards too low for the selected duration.");
        return;
      }

      const startOffset = Number(startDelayHours || "0") * 60 * 60;
      const startTime = BigInt(nowSeconds() + startOffset);
      const endTime = startTime + durationSec;
      const maxStakedBig = BigInt(maxStaked || "0");

      const creatorFeePercentNum = Number(creatorFeePercent || "0");
      if (Number.isNaN(creatorFeePercentNum) || creatorFeePercentNum < 0) {
        setCreateMsg("Creator fee must be a valid percentage.");
        return;
      }
      const creatorFeeBpsNum = Math.round(creatorFeePercentNum * 100);

      const takeFeeOnClaim = feeMode === "claim" || feeMode === "both";
      const takeFeeOnUnstake = feeMode === "unstake" || feeMode === "both";

      await writeFactory({
        ...CONFIG_STAKING_FACTORY,
        functionName: "createPool",
        args: [
          {
            nft: nftAddress as `0x${string}`,
            rewardToken: rewardToken as `0x${string}`,
            rewardRate,
            startTime,
            endTime,
            maxStaked: maxStakedBig,
            creatorFeeBps: creatorFeeBpsNum,
            takeFeeOnClaim,
            takeFeeOnUnstake,
          },
        ],
        chainId: base.id,
      });

      setCreateMsg("Pool creation transaction submitted.");
    } catch (err) {
      setCreateMsg(getErrText(err));
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * FACTORY POOL DISCOVERY (PoolCreated logs)
   * ──────────────────────────────────────────────────────────── */
  const [factoryPools, setFactoryPools] = useState<FactoryPoolMeta[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function loadPools() {
      try {
        setPoolsLoading(true);
        setPoolsError(null);

        const eventAbi = parseAbiItem(
          "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)"
        );

        const logs = await publicClient.getLogs({
          address: CONFIG_STAKING_FACTORY.address as `0x${string}`,
          event: eventAbi,
          // You can narrow this fromBlock if you know the deploy block
          fromBlock: 0n,
          toBlock: "latest",
        });

        if (cancelled) return;

        const items: FactoryPoolMeta[] = logs
          .map((log) => {
            const args = log.args as unknown as {
              pool: `0x${string}`;
              creator: `0x${string}`;
              nft: `0x${string}`;
              rewardToken: `0x${string}`;
            };
            return {
              pool: args.pool,
              creator: args.creator,
              nft: args.nft,
              rewardToken: args.rewardToken,
            };
          })
          // newest first
          .reverse();

        setFactoryPools(items);
      } catch (err) {
        if (!cancelled) {
          setPoolsError(getErrText(err));
        }
      } finally {
        if (!cancelled) {
          setPoolsLoading(false);
        }
      }
    }

    void loadPools();

    return () => {
      cancelled = true;
    };
  }, [publicClient, refreshNonce]);

  const myCreatedPools = useMemo(() => {
    if (!address) return [];
    return factoryPools.filter(
      (p) => p.creator.toLowerCase() === address.toLowerCase(),
    );
  }, [factoryPools, address]);

  /* ──────────────────────────────────────────────────────────────
   * FILTER LOGIC (for featured Basebots pool)
   * ──────────────────────────────────────────────────────────── */
  const poolVisible = useMemo(() => {
    if (activeFilter === "all") return true;
    if (activeFilter === "live") return poolStatus === "live";
    if (activeFilter === "closed") return poolStatus === "closed";
    if (activeFilter === "my-staked") return !!isMyStaked;
    if (activeFilter === "my-pools")
      return !!isMyPool || (myCreatedPools.length > 0);
    return true;
  }, [activeFilter, poolStatus, isMyStaked, isMyPool, myCreatedPools.length]);

  /* ──────────────────────────────────────────────────────────────
   * BUTTON STYLES
   * ──────────────────────────────────────────────────────────── */
  const primaryBtn =
    "w-full inline-flex items-center justify-center rounded-full bg-[#79ffe1] text-slate-950 text-sm font-semibold py-2.5 shadow-[0_10px_30px_rgba(121,255,225,0.45)] hover:bg-[#a5fff0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const secondaryBtn =
    "w-full inline-flex items-center justify-center rounded-full bg-white/5 text-white text-sm font-semibold py-2.5 border border-white/30 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const successBtn =
    "w-full inline-flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200 text-sm font-semibold py-2.5 border border-emerald-400/60 hover:bg-emerald-500/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  const inputBase =
    "mt-1 w-full max-w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

  /* ──────────────────────────────────────────────────────────────
   * RENDER
   * ──────────────────────────────────────────────────────────── */
  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer overflow-x-hidden">
      <div className="container pt-6 px-5 stack space-y-6">
        {/* ───────────────── Introduction ───────────────── */}
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
              {/* BIGGER INTRO ICON */}
              <div className="relative flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-[28px] bg-gradient-to-tr from-[#79ffe1] via-sky-500 to-indigo-500 shadow-[0_0_36px_rgba(121,255,225,0.8)]">
                <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[24px] bg-black/85">
                  <Image
                    src="/icon.png"
                    alt="Basebots"
                    width={96}
                    height={96}
                    className="object-contain"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  NFT Staking Pools
                </h1>
                <p className="mt-1 text-white/80 text-sm md:text-base max-w-md">
                  Stake NFTs and stream rewards in any ERC-20 on Base. You
                  configure timing, caps, and your creator fee.
                </p>
              </div>
            </div>

            <div className="mt-2 md:mt-0 text-sm text-white/75 max-w-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">
                How it works
              </h3>
              <ul className="space-y-1.5">
                <li>• Choose an NFT collection and reward token.</li>
                <li>• Set total rewards, duration, and max stakers.</li>
                <li>• Add your creator fee on top of the protocol fee.</li>
                <li>
                  • Rewards stream over time and can be claimed or taken on
                  unstake.
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-white/60">
                Protocol fee is currently{" "}
                <span className="font-semibold text-[#79ffe1]">
                  {protocolFeePercent}%
                </span>{" "}
                of earned rewards and routes back to the BOTS rewards pot.
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────── Create Pool ───────────────── */}
        <section className="glass glass-pad bg-[#0f1320]/70 border border-white/10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="md:w-[32%] space-y-3">
              <h2 className="text-xl md:text-2xl font-bold">Create your pool</h2>
              <p className="text-sm text-white/80">
                Launch a staking pool for any NFT collection on Base and reward
                stakers with any ERC-20 (like BOTS).
              </p>
              <div className="rounded-2xl border border-white/15 bg-black/40 p-3 text-xs text-white/70 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span>Protocol fee</span>
                  <span className="font-semibold text-[#79ffe1]">
                    {protocolFeePercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Your creator fee</span>
                  <span className="font-semibold">
                    {createForm.creatorFeePercent || "0"}%
                  </span>
                </div>
                <p className="text-[11px] text-white/55 pt-1">
                  Creator fee is charged on top of the protocol fee.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCreatePool}
              className="md:w-[68%] grid gap-4 md:grid-cols-2 text-sm"
            >
              <label className="block col-span-2">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  NFT collection (ERC-721)
                </span>
                <input
                  type="text"
                  value={createForm.nftAddress}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, nftAddress: e.target.value }))
                  }
                  placeholder="0x..."
                  className={inputBase}
                />
                <p className="mt-1 text-[11px] text-white/50 font-mono">
                  For Basebots, use: {shortenAddress(BASEBOTS_NFT_ADDRESS, 4)}
                </p>
              </label>

              <label className="block col-span-2 md:col-span-1">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Reward token (ERC-20)
                </span>
                <input
                  type="text"
                  value={createForm.rewardToken}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      rewardToken: e.target.value,
                    }))
                  }
                  placeholder="0x..."
                  className={inputBase}
                />
                <p className="mt-1 text-[11px] text-white/50 font-mono">
                  Default: BOTS ({shortenAddress(BOTS_TOKEN.address, 4)})
                </p>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Total rewards (tokens)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={createForm.totalRewards}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      totalRewards: e.target.value,
                    }))
                  }
                  className={inputBase}
                />
                <p className="mt-1 text-[11px] text-white/50">
                  Total amount streamed to stakers over the pool duration.
                </p>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Duration (days)
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={createForm.durationDays}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      durationDays: e.target.value,
                    }))
                  }
                  className={inputBase}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Start delay (hours)
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={createForm.startDelayHours}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      startDelayHours: e.target.value,
                    }))
                  }
                  className={inputBase}
                />
                <p className="mt-1 text-[11px] text-white/50">
                  0 = start as soon as the transaction confirms.
                </p>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Max NFTs staked (optional)
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={createForm.maxStaked}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      maxStaked: e.target.value,
                    }))
                  }
                  className={inputBase}
                />
                <p className="mt-1 text-[11px] text-white/50">
                  0 = unlimited participants.
                </p>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Creator fee (%)
                </span>
                <input
                  type="number"
                  min="0"
                  max="19"
                  step="0.25"
                  value={createForm.creatorFeePercent}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      creatorFeePercent: e.target.value,
                    }))
                  }
                  className={inputBase}
                />
                <p className="mt-1 text-[11px] text-white/50">
                  Your cut of rewards (e.g. 2 = 2%) on top of the protocol fee.
                </p>
              </label>

              {/* Fee mode with stronger active styling */}
              <div className="col-span-2">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Fee mode
                </span>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {[
                    { key: "claim", label: "On claim" },
                    { key: "unstake", label: "On unstake" },
                    { key: "both", label: "Both" },
                  ].map((opt) => {
                    const isActive = createForm.feeMode === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          setCreateForm((f) => ({
                            ...f,
                            feeMode: opt.key as FeeMode,
                          }))
                        }
                        className={[
                          "px-3 py-1.5 rounded-full border text-xs transition-all duration-150 flex items-center gap-1.5",
                          isActive
                            ? [
                                "border-[#79ffe1]",
                                "bg-gradient-to-r from-[#0f172a] via-[#031c1b] to-[#0f172a]",
                                "text-[#79ffe1]",
                                "shadow-[0_0_18px_rgba(121,255,225,0.7)]",
                                "scale-[1.04]",
                              ].join(" ")
                            : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10",
                        ].join(" ")}
                      >
                        {isActive && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#79ffe1] shadow-[0_0_10px_rgba(121,255,225,0.9)]" />
                        )}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 mt-3">
                <button
                  type="submit"
                  disabled={createPending}
                  className={primaryBtn}
                >
                  {createPending ? "Creating pool…" : "Create pool"}
                </button>
                {createTxHash && (
                  <Link
                    href={`https://basescan.org/tx/${createTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#79ffe1] underline decoration-dotted underline-offset-4"
                  >
                    View transaction ↗
                  </Link>
                )}
              </div>

              {(createMsg || createErr) && (
                <p className="col-span-2 mt-1 text-xs text-rose-300">
                  {createMsg || getErrText(createErr)}
                </p>
              )}
              {createMined && (
                <p className="col-span-2 mt-1 text-xs text-emerald-300">
                  Pool created successfully. Share this staking page with your
                  community so they can join.
                </p>
              )}
            </form>
          </div>
        </section>

        {/* ───────────────── Filters ───────────────── */}
        <section className="flex flex-wrap gap-2 justify-between items-center text-xs">
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
                  "px-3 py-1.5 rounded-full border transition-all",
                  activeFilter === t.key
                    ? "border-[#79ffe1] bg-[#031c1b] text-[#79ffe1] shadow-[0_0_14px_rgba(121,255,225,0.6)]"
                    : "border-white/15 bg-[#020617] text-white/70 hover:border-white/40",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* ───────────────── Featured Basebots Pool ───────────────── */}
        {poolVisible ? (
          <section className="glass glass-pad relative overflow-hidden bg-[#050714]/80 rounded-3xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-28 -right-40 h-72 w-72 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(121,255,225,0.4) 0%, transparent 60%)",
              }}
            />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-3">
                {/* BIGGER POOL ICON */}
                <div className="relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-[26px] bg-gradient-to-tr from-[#79ffe1] via-sky-500 to-indigo-500 border border-[#79ffe1]/50 shadow-[0_0_32px_rgba(121,255,225,0.8)]">
                  <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[22px] bg-black/85">
                    <Image
                      src="/icon.png"
                      alt="Basebots x BOTS"
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold">
                      Basebots x BOTS Staking
                    </h2>
                    <span
                      className={[
                        "px-2 py-[2px] rounded-full text-[11px] font-semibold border",
                        poolStatus === "live"
                          ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"
                          : poolStatus === "upcoming"
                          ? "border-sky-400/70 bg-sky-500/10 text-sky-300"
                          : "border-rose-400/70 bg-rose-500/10 text-rose-300",
                      ].join(" ")}
                    >
                      {poolStatus === "live"
                        ? "Live"
                        : poolStatus === "upcoming"
                        ? "Upcoming"
                        : "Closed"}
                    </span>
                    {isMyPool && (
                      <span className="px-2 py-[2px] rounded-full text-[11px] font-semibold border border-[#79ffe1]/60 bg-[#031c1b] text-[#79ffe1]">
                        My pool
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/70 max-w-xl">
                    Stake your Basebots and earn BOTS. Rewards stream over time;
                    protocol fee {protocolFeePercent}% + creator fee{" "}
                    {creatorFeePercentOnChain}%.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-xs md:text-sm md:text-right">
                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                    APR approx:{" "}
                    <span className="font-semibold">
                      {aprPercent ? `${aprPercent.toFixed(1)}%` : "—"}
                    </span>
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80">
                    Total staked:{" "}
                    <span className="font-semibold">
                      {totalStaked.toString()} NFTs
                    </span>
                  </span>
                </div>
                <div className="text-[11px] text-white/60">
                  Reward rate:{" "}
                  <span className="font-mono">
                    {rewardRate === 0n
                      ? "—"
                      : `${formatUnits(
                          rewardRate,
                          BOTS_TOKEN.decimals,
                        )} BOTS/s`}
                  </span>
                </div>
              </div>
            </div>

            {/* Your position + fee preview + actions */}
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <h3 className="text-sm font-semibold">Your position</h3>
                <div className="mt-3 grid gap-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Staked NFTs</span>
                    <span className="font-mono">
                      {address ? userStaked.toString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Pending rewards</span>
                    <span className="font-mono">
                      {address
                        ? `${formatUnits(
                            feePreview.gross,
                            BOTS_TOKEN.decimals,
                          )} BOTS`
                        : "—"}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3 space-y-1 text-xs text-white/70">
                    <div className="flex justify-between">
                      <span>Protocol fee ({protocolFeePercent}%):</span>
                      <span className="font-mono">
                        {address
                          ? `${formatUnits(
                              feePreview.protocolFee,
                              BOTS_TOKEN.decimals,
                            )} BOTS`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Creator fee ({creatorFeePercentOnChain}%):</span>
                      <span className="font-mono">
                        {address
                          ? `${formatUnits(
                              feePreview.creatorFee,
                              BOTS_TOKEN.decimals,
                            )} BOTS`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-[#79ffe1] pt-1">
                      <span>You receive (net):</span>
                      <span className="font-mono">
                        {address
                          ? `${formatUnits(
                              feePreview.net,
                              BOTS_TOKEN.decimals,
                            )} BOTS`
                          : "—"}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-white/60">
                      Fees are applied on{" "}
                      {takeFeeOnClaim && takeFeeOnUnstake
                        ? "claim and unstake"
                        : takeFeeOnClaim
                        ? "claim"
                        : takeFeeOnUnstake
                        ? "unstake"
                        : "this pool’s chosen action"}
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3 text-sm">
                <h3 className="text-sm font-semibold">Actions</h3>

                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-white/60">
                    Stake token ID
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={stakeTokenId}
                    onChange={(e) => setStakeTokenId(e.target.value)}
                    placeholder="e.g. 123"
                    className={inputBase}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleStake}
                  disabled={txPending || poolStatus === "closed"}
                  className={primaryBtn}
                >
                  {txPending ? "Confirming…" : "Stake Basebot"}
                </button>

                <label className="block mt-3">
                  <span className="text-xs uppercase tracking-wide text-white/60">
                    Unstake token ID
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={unstakeTokenId}
                    onChange={(e) => setUnstakeTokenId(e.target.value)}
                    placeholder="e.g. 123"
                    className={inputBase}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUnstake}
                  disabled={txPending}
                  className={secondaryBtn}
                >
                  Unstake Basebot
                </button>

                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={txPending || feePreview.net === 0n}
                  className={successBtn}
                >
                  Claim rewards
                </button>

                <div className="mt-2 text-[11px] text-white/60 space-y-1 break-words">
                  {txHash && (
                    <div>
                      Latest action:{" "}
                      <Link
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#79ffe1] underline decoration-dotted underline-offset-4"
                      >
                        view on Basescan ↗
                      </Link>
                    </div>
                  )}
                  {txMined && (
                    <div className="text-emerald-300">
                      Transaction confirmed ✔
                    </div>
                  )}
                  {(txMessage || writeErr) && (
                    <div className="text-rose-300">
                      {txMessage || getErrText(writeErr)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="glass glass-pad text-sm text-white/70 rounded-3xl">
            No featured pool matches this filter yet.
          </section>
        )}

        {/* ───────────────── Factory Pools List + Refresh ───────────────── */}
        <section className="glass glass-pad rounded-3xl border border-white/10 bg-[#020617]/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-semibold">
                All pools created via factory
              </h3>
              <p className="text-[11px] md:text-xs text-white/60">
                These are pools emitted by the factory&apos;s{" "}
                <span className="font-mono">PoolCreated</span> event. Anyone can
                stake if they have the right NFT.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={poolsLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {poolsLoading && (
                <span className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white/70" />
              )}
              <span>{poolsLoading ? "Refreshing…" : "Refresh pools"}</span>
            </button>
          </div>

          {poolsError && (
            <p className="text-xs text-rose-300 break-words">
              {poolsError}
            </p>
          )}

          {factoryPools.length === 0 && !poolsLoading && !poolsError && (
            <p className="text-xs text-white/60">
              No pools created via this factory yet. Use the form above to
              create the first one.
            </p>
          )}

          {factoryPools.length > 0 && (
            <div className="mt-1 grid gap-2 text-xs">
              {factoryPools.map((pool) => {
                const isCreator =
                  address &&
                  pool.creator.toLowerCase() === address.toLowerCase();
                const isBasebots =
                  pool.pool.toLowerCase() ===
                  (BASEBOTS_STAKING_POOL.address as `0x${string}`).toLowerCase();

                return (
                  <div
                    key={pool.pool}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl border border-white/12 bg-black/35 px-3 py-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white/90">
                          {isBasebots
                            ? "Basebots x BOTS Pool"
                            : "Custom NFT staking pool"}
                        </span>
                        {isCreator && (
                          <span className="rounded-full border border-[#79ffe1]/70 bg-[#031c1b] px-2 py-[1px] text-[10px] font-semibold text-[#79ffe1]">
                            You created this
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-white/65 font-mono">
                        <span>
                          Pool: {shortenAddress(pool.pool, 4)}
                        </span>
                        <span>
                          NFT: {shortenAddress(pool.nft, 4)}
                        </span>
                        <span>
                          Reward: {shortenAddress(pool.rewardToken, 4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                      <Link
                        href={`https://basescan.org/address/${pool.pool}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:bg-white/10"
                      >
                        View pool ↗
                      </Link>
                      {isBasebots && (
                        <Link
                          href="/staking"
                          className="rounded-full border border-[#79ffe1]/70 bg-[#031c1b] px-3 py-1 text-[11px] font-semibold text-[#79ffe1] hover:bg-[#052725]"
                        >
                          Open in app
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
