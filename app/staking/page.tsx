"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "viem/chains";
import { formatUnits, parseUnits } from "viem";
import Link from "next/link";
import Image from "next/image";

import {
  CONFIG_STAKING_FACTORY,
  BASEBOTS_STAKING_POOL,
  BOTS_TOKEN,
} from "@/lib/stakingContracts";

// If you have this already somewhere, you can remove this local copy
const BASEBOTS_NFT_ADDRESS = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as `0x${string}`;

type FilterTab = "all" | "live" | "closed" | "my-staked" | "my-pools";

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export default function StakingPage() {
  const { address } = useAccount();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  /* ──────────────────────────────────────────────────────────────
   * READ FACTORY PROTOCOL FEE (for explanation + fee preview)
   * ──────────────────────────────────────────────────────────── */
  const { data: protocolFeeBpsRaw } = useReadContract({
    ...CONFIG_STAKING_FACTORY,
    functionName: "protocolFeeBps",
  });

  const protocolFeeBps = Number(protocolFeeBpsRaw ?? 0);

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
   * READ USER POSITION FOR BASEBOTS POOL
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
  const isMyPool = address && creatorAddress && address.toLowerCase() === (creatorAddress as string).toLowerCase();

  /* ──────────────────────────────────────────────────────────────
   * FEE PREVIEW (based on pending rewards)
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
   * APR ESTIMATE (assume each Basebot has some notional value)
   * APR = (rewardRate * 365d) / (totalStaked * assumedStakeValue) * 100%
   * ──────────────────────────────────────────────────────────── */
  const assumedStakeValuePerNft = parseUnits("0.01", BOTS_TOKEN.decimals); // example: 0.01 BOTS per NFT value proxy

  const aprPercent = useMemo(() => {
    if (totalStaked === 0n || rewardRate === 0n) return 0;
    const yearlyReward = rewardRate * BigInt(365 * 24 * 60 * 60); // rewards per year
    const tvl = totalStaked * assumedStakeValuePerNft;
    if (tvl === 0n) return 0;
    const aprBps = (yearlyReward * 10000n) / tvl;
    return Number(aprBps) / 100; // as %
  }, [totalStaked, rewardRate, assumedStakeValuePerNft]);

  /* ──────────────────────────────────────────────────────────────
   * STAKE / UNSTAKE / CLAIM HOOKS
   * ──────────────────────────────────────────────────────────── */
  const [stakeTokenId, setStakeTokenId] = useState("");
  const [unstakeTokenId, setUnstakeTokenId] = useState("");

  const { writeContract: writePool, data: txHash, error: writeErr } = useWriteContract();
  const { isLoading: txPending, isSuccess: txMined } = useWaitForTransactionReceipt({
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
   * CREATE POOL FORM (factory.createPool)
   * ──────────────────────────────────────────────────────────── */
  const [createForm, setCreateForm] = useState({
    nftAddress: "",
    rewardToken: BOTS_TOKEN.address, // default to BOTS
    totalRewards: "1000", // 1000 tokens total
    durationDays: "30",
    startDelayHours: "0",
    maxStaked: "0",
    creatorFeeBps: "200", // 2% creator fee by default
    feeMode: "claim", // "claim" | "unstake" | "both"
  });

  const { writeContract: writeFactory, data: createTxHash, error: createErr } = useWriteContract();
  const { isLoading: createPending, isSuccess: createMined } = useWaitForTransactionReceipt({
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
        creatorFeeBps,
        feeMode,
      } = createForm;

      if (!nftAddress || !rewardToken) {
        setCreateMsg("Enter both NFT collection and reward token addresses.");
        return;
      }

      const totalRewardsWei = parseUnits(totalRewards || "0", BOTS_TOKEN.decimals);
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
      const creatorFeeBpsNum = Number(creatorFeeBps || "0");

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
   * FILTER LOGIC (for when you add more pools later)
   * Right now we only have the Basebots pool, but filters are wired.
   * ──────────────────────────────────────────────────────────── */
  const poolVisible = useMemo(() => {
    if (activeFilter === "all") return true;
    if (activeFilter === "live") return poolStatus === "live";
    if (activeFilter === "closed") return poolStatus === "closed";
    if (activeFilter === "my-staked") return !!isMyStaked;
    if (activeFilter === "my-pools") return !!isMyPool;
    return true;
  }, [activeFilter, poolStatus, isMyStaked, isMyPool]);

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        {/* ───────────────── Introduction ───────────────── */}
        <section className="glass glass-pad relative overflow-hidden">
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
          <div className="relative flex flex-col md:flex-row md:items-center md:gap-8">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-black/60">
                <Image
                  src="/icon.png"
                  alt="BOTS token"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  NFT Staking Pools
                </h1>
                <p className="mt-1 text-white/80 text-sm md:text-base">
                  Stake NFTs, reward any ERC-20 on Base. Configurable timing, caps, and fees.
                </p>
              </div>
            </div>

            <div className="mt-4 md:mt-0 md:ml-auto text-sm text-white/70 max-w-xl">
              <ul className="space-y-1">
                <li>• Choose an NFT collection and reward token.</li>
                <li>• Set total rewards, duration, and max stakers.</li>
                <li>• Add a creator fee on top of the protocol fee.</li>
                <li>• Rewards are streamed over time and can be claimed or taken on unstake.</li>
              </ul>
              <p className="mt-2 text-xs text-white/60">
                Protocol fee is currently{" "}
                <span className="font-semibold text-[#79ffe1]">
                  {protocolFeeBps / 100}%
                </span>{" "}
                of earned rewards and routes back to the BOTS rewards pot.
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────── Create Pool ───────────────── */}
        <section className="glass glass-pad bg-[#0f1320]/70 border border-white/10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="md:w-1/3">
              <h2 className="text-xl md:text-2xl font-bold">Create your pool</h2>
              <p className="mt-2 text-sm text-white/80">
                Launch a staking pool for any NFT collection on Base and reward stakers with
                any ERC-20 (like BOTS). You choose rewards, timing, limits, and your fee.
              </p>
              <p className="mt-3 text-xs text-white/60">
                Protocol fee: {protocolFeeBps / 100}% of rewards (taken on whichever
                action you enable). Creator fee is on top and goes to you.
              </p>
            </div>

            <form
              onSubmit={handleCreatePool}
              className="md:w-2/3 grid gap-3 md:grid-cols-2 text-sm"
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
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
                />
                <p className="mt-1 text-[11px] text-white/50">
                  For Basebots, use: {BASEBOTS_NFT_ADDRESS}
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
                    setCreateForm((f) => ({ ...f, rewardToken: e.target.value }))
                  }
                  placeholder="0x..."
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
                />
                <p className="mt-1 text-[11px] text-white/50">
                  Default: BOTS ({BOTS_TOKEN.address})
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
                    setCreateForm((f) => ({ ...f, totalRewards: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
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
                    setCreateForm((f) => ({ ...f, durationDays: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
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
                    setCreateForm((f) => ({ ...f, startDelayHours: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
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
                    setCreateForm((f) => ({ ...f, maxStaked: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
                />
                <p className="mt-1 text-[11px] text-white/50">
                  0 = unlimited participants.
                </p>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Creator fee (bps)
                </span>
                <input
                  type="number"
                  min="0"
                  max="1900"
                  step="10"
                  value={createForm.creatorFeeBps}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, creatorFeeBps: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
                />
                <p className="mt-1 text-[11px] text-white/50">
                  Your cut on rewards (e.g. 200 = 2%) on top of the protocol fee.
                </p>
              </label>

              <div className="col-span-2">
                <span className="text-xs uppercase tracking-wide text-white/60">
                  Fee mode
                </span>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {[
                    { key: "claim", label: "On claim" },
                    { key: "unstake", label: "On unstake" },
                    { key: "both", label: "Both" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setCreateForm((f) => ({ ...f, feeMode: opt.key }))
                      }
                      className={[
                        "px-3 py-1.5 rounded-full border text-xs",
                        createForm.feeMode === opt.key
                          ? "border-[#79ffe1] bg-[#031c1b] text-[#79ffe1] shadow-[0_0_14px_rgba(121,255,225,0.6)]"
                          : "border-white/20 bg-white/5 text-white/70 hover:border-white/40",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-between gap-3 mt-3">
                <button
                  type="submit"
                  disabled={createPending}
                  className="btn-pill btn-pill--blue !font-bold"
                  style={{ opacity: createPending ? 0.7 : 1 }}
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
                <p className="col-span-2 mt-2 text-xs text-red-300">
                  {createMsg || getErrText(createErr)}
                </p>
              )}
              {createMined && (
                <p className="col-span-2 mt-2 text-xs text-emerald-300">
                  Pool created. Once indexed, you can surface it in the Pools list below.
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
          <section className="glass glass-pad relative overflow-hidden bg-[#050714]/80">
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
                <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-[#79ffe1]/40 bg-black/70">
                  <Image
                    src="/icon.png"
                    alt="Basebots x BOTS"
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
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
                  <p className="mt-1 text-xs text-white/70">
                    Stake your Basebots and earn BOTS. Rewards stream over time;
                    protocol fee {protocolFeeBps / 100}% + creator fee {creatorFeeBps / 100}%.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-xs md:text-sm md:text-right">
                <div className="inline-flex items-center justify-end gap-2">
                  <span className="pill-note pill-note--blue">
                    APR approx:{" "}
                    <span className="font-semibold">
                      {aprPercent ? `${aprPercent.toFixed(1)}%` : "—"}
                    </span>
                  </span>
                  <span className="pill-note">
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
                      : `${formatUnits(rewardRate, BOTS_TOKEN.decimals)} BOTS/s`}
                  </span>
                </div>
              </div>
            </div>

            {/* Your position + fee preview + actions */}
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
                      <span>Protocol fee ({protocolFeeBps / 100}%):</span>
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
                      <span>Creator fee ({creatorFeeBps / 100}%):</span>
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
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleStake}
                  disabled={txPending || poolStatus === "closed"}
                  className="btn-pill btn-pill--blue w-full !font-bold"
                  style={{ opacity: txPending || poolStatus === "closed" ? 0.7 : 1 }}
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
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUnstake}
                  disabled={txPending}
                  className="btn-pill w-full border border-white/30 bg-white/5 text-white hover:bg-white/10"
                  style={{ opacity: txPending ? 0.7 : 1 }}
                >
                  Unstake Basebot
                </button>

                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={txPending || feePreview.net === 0n}
                  className="btn-pill w-full border border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  style={{ opacity: txPending || feePreview.net === 0n ? 0.7 : 1 }}
                >
                  Claim rewards
                </button>

                <div className="mt-2 text-[11px] text-white/60 space-y-1">
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
                    <div className="text-emerald-300">Transaction confirmed ✔</div>
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
          <section className="glass glass-pad text-sm text-white/70">
            No pools match this filter yet. Once more pools are created and indexed,
            they’ll show up here.
          </section>
        )}
      </div>
    </main>
  );
}
