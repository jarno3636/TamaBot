// components/staking/CreatePoolCard.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { base } from "viem/chains";
import {
  parseUnits,
  parseAbiItem,
  decodeEventLog,
  type Hex,
} from "viem";

import { CONFIG_STAKING_FACTORY, BASEBOTS_STAKING_POOL, BOTS_TOKEN, BASEBOTS_NFT } from "@/lib/stakingContracts";
import type { FeeMode, FundTarget } from "./stakingUtils";
import { nowSeconds, shortenAddress, getErrText } from "./stakingUtils";

type PublicClientType = ReturnType<typeof usePublicClient>;

const primaryBtn =
  "w-full inline-flex items-center justify-center rounded-full bg-[#79ffe1] text-slate-950 text-sm font-semibold py-2.5 shadow-[0_10px_30px_rgba(121,255,225,0.45)] hover:bg-[#a5fff0] transition-all active:scale-[0.97] active:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/70 disabled:opacity-60 disabled:cursor-not-allowed";

const inputBase =
  "mt-1 w-full max-w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

export type CreatePoolFormState = {
  nftAddress: string;
  rewardToken: string;
  totalRewards: string;
  durationDays: string;
  startDelayHours: string;
  maxStaked: string;
  creatorFeePercent: string; // UI percent
  feeMode: FeeMode;
};

export default function CreatePoolCard({
  protocolFeePercent,
  onOpenFundModal,
  onLastCreatedPoolResolved,
}: {
  protocolFeePercent: number;
  onOpenFundModal: (target: FundTarget, suggestedAmount?: string) => void;
  onLastCreatedPoolResolved?: (poolAddr: `0x${string}`) => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });

  const [createForm, setCreateForm] = useState<CreatePoolFormState>({
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

  const [lastCreatedPoolAddr, setLastCreatedPoolAddr] =
    useState<`0x${string}` | null>(null);
  const [lastCreatedTotalRewards, setLastCreatedTotalRewards] =
    useState<string>("");
  const [lastCreatedRewardToken, setLastCreatedRewardToken] =
    useState<`0x${string}` | null>(null);

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreateMsg("");
      setLastCreatedPoolAddr(null);
      setLastCreatedRewardToken(null);

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

      const rewardRateCalc = totalRewardsWei / durationSec;
      if (rewardRateCalc === 0n) {
        setCreateMsg("Total rewards too low for the selected duration.");
        return;
      }

      const startOffset = Number(startDelayHours || "0") * 60 * 60;
      const startTimeCalc = BigInt(nowSeconds() + startOffset);
      const endTimeCalc = startTimeCalc + durationSec;
      const maxStakedBig = BigInt(maxStaked || "0");

      const creatorFeePercentNum = Number(creatorFeePercent || "0");
      if (Number.isNaN(creatorFeePercentNum) || creatorFeePercentNum < 0) {
        setCreateMsg("Creator fee must be a valid percentage.");
        return;
      }
      const creatorFeeBpsNum = Math.round(creatorFeePercentNum * 100);

      const takeFeeOnClaim = feeMode === "claim" || feeMode === "both";
      const takeFeeOnUnstake = feeMode === "unstake" || feeMode === "both";

      setLastCreatedTotalRewards(totalRewards || "");
      setLastCreatedRewardToken(rewardToken as `0x${string}`);

      await writeFactory({
        ...CONFIG_STAKING_FACTORY,
        functionName: "createPool",
        args: [
          {
            nft: nftAddress as `0x${string}`,
            rewardToken: rewardToken as `0x${string}`,
            rewardRate: rewardRateCalc,
            startTime: startTimeCalc,
            endTime: endTimeCalc,
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

  // Decode PoolCreated from receipt once mined
  useEffect(() => {
    if (!publicClient || !createMined || !createTxHash) return;
    const client = publicClient as NonNullable<PublicClientType>;
    let cancelled = false;

    async function run() {
      try {
        const receipt = await client.getTransactionReceipt({
          hash: createTxHash as Hex,
        });

        const eventAbi = parseAbiItem(
          "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)",
        );

        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: [eventAbi],
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "PoolCreated") {
              const args = decoded.args as {
                pool: `0x${string}`;
                rewardToken: `0x${string}`;
              };
              if (!cancelled) {
                setLastCreatedPoolAddr(args.pool);
                // reward token already in state, but keeping consistent
                setLastCreatedRewardToken(args.rewardToken);
                onLastCreatedPoolResolved?.(args.pool);
              }
              break;
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.error("Failed to decode PoolCreated from tx receipt", e);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, createMined, createTxHash, onLastCreatedPoolResolved]);

  const creatorFee = createForm.creatorFeePercent || "0";

  return (
    <section className="glass glass-pad bg-[#0f1320]/70 border border-white/10 rounded-3xl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        <div className="md:w-[32%] space-y-3">
          <h2 className="text-xl md:text-2xl font-bold">Create your pool</h2>
          <p className="text-sm text-white/80">
            Launch a staking pool for any NFT collection on Base and reward
            stakers with any ERC-20.
          </p>

          <div className="rounded-2xl border border-white/15 bg-black/40 p-3 text-xs text-white/70 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span>Protocol fee</span>
              <span className="font-semibold text-[#79ffe1]">
                {protocolFeePercent}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Your creator fee</span>
              <span className="font-semibold">{creator}%</span>
            </div>

            <div className="mt-2 rounded-xl border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
              <span className="font-semibold">Important:</span> Creating a pool
              does <span className="font-semibold">not move tokens</span>. After
              creation, you must{" "}
              <span className="font-semibold">fund the pool</span> by sending
              rewards to the pool contract address.
            </div>
          </div>
        </div>

        <form
          onSubmit={handleCreatePool}
          className="md:w-[68%] grid gap-4 md:grid-cols-2 text-sm"
        >
          <label className="block col-span-2">
            <span className="text-xs uppercase tracking-wide text-white/60">
              NFT collection (ERC-721 on Base)
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
              Basebots NFT: {shortenAddress(BASEBOTS_NFT.address, 4)}
            </p>
          </label>

          <label className="block col-span-2 md:col-span-1">
            <span className="text-xs uppercase tracking-wide text-white/60">
              Reward token (ERC-20 on Base)
            </span>
            <input
              type="text"
              value={createForm.rewardToken}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, rewardToken: e.target.value }))
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
                setCreateForm((f) => ({ ...f, totalRewards: e.target.value }))
              }
              className={inputBase}
            />
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
              className={inputBase}
            />
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
          </label>

          {/* Fee mode buttons */}
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
                      "px-3 py-1.5 rounded-full border text-xs transition-all duration-150 flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/70",
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
            <button type="submit" disabled={createPending} className={primaryBtn}>
              {createPending ? "Creating pool…" : "Create pool"}
            </button>

            {createTxHash && (
              <Link
                href={`https://basescan.org/tx/${createTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#79ffe1] underline decoration-dotted underline-offset-4"
              >
                View creation tx ↗
              </Link>
            )}
          </div>

          {(createMsg || createErr) && (
            <p className="col-span-2 mt-1 text-xs text-rose-300">
              {createMsg || getErrText(createErr)}
            </p>
          )}

          {createMined && (
            <div className="col-span-2 mt-2 rounded-2xl border border-emerald-400/60 bg-emerald-500/10 p-3 text-[11px] text-emerald-100 space-y-2">
              <p className="font-semibold text-emerald-200">
                ✅ Pool created successfully on Base.
              </p>

              {lastCreatedPoolAddr ? (
                <>
                  <p className="break-words">
                    Pool address:{" "}
                    <span className="font-mono">{lastCreatedPoolAddr}</span>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`https://basescan.org/address/${lastCreatedPoolAddr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-emerald-300/70 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500/30"
                    >
                      View pool on Basescan ↗
                    </Link>

                    {lastCreatedRewardToken && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenFundModal(
                            {
                              pool: lastCreatedPoolAddr,
                              rewardToken: lastCreatedRewardToken,
                            },
                            lastCreatedTotalRewards || createForm.totalRewards,
                          )
                        }
                        className="rounded-full border border-emerald-300/70 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500/30 active:scale-95"
                      >
                        Fund this pool now
                      </button>
                    )}
                  </div>

                  <p className="text-white/70">
                    Next: send{" "}
                    <span className="font-semibold">
                      {lastCreatedTotalRewards || createForm.totalRewards} tokens
                    </span>{" "}
                    to the pool address.
                  </p>
                </>
              ) : (
                <p className="text-white/70">
                  Refresh the pools list below and look for a pool where you are
                  the creator.
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
