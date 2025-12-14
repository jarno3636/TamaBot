// components/staking/CreatePoolCard.tsx
"use client";

import { useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "viem/chains";
import { parseUnits } from "viem";
import type { FundTarget } from "@/app/staking/page";
import { CONFIG_STAKING_FACTORY } from "@/lib/stakingContracts";

function getErrText(e: unknown): string {
  if (e && typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage.length > 0) return anyE.shortMessage;
    if (typeof anyE.message === "string" && anyE.message.length > 0) return anyE.message;
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

type FeeMode = "protocol" | "creator";

export default function CreatePoolCard({
  protocolFeePercent,
  onOpenFundModal,
  onLastCreatedPoolResolved,
}: {
  protocolFeePercent: number;
  onOpenFundModal: (target: FundTarget, suggestedAmount?: string) => void;
  onLastCreatedPoolResolved: (poolAddr: `0x${string}`) => void;
}) {
  const { address } = useAccount();
  const { writeContract, data: txHash, error: txErr } = useWriteContract();
  const { isLoading: txPending, isSuccess: txMined } = useWaitForTransactionReceipt({ hash: txHash, chainId: base.id });

  const [nft, setNft] = useState("");
  const [rewardToken, setRewardToken] = useState("");
  const [startTime, setStartTime] = useState(""); // unix seconds
  const [endTime, setEndTime] = useState(""); // unix seconds
  const [rewardAmountHint, setRewardAmountHint] = useState(""); // optional hint for fund modal

  const [feeMode, setFeeMode] = useState<FeeMode>("protocol");
  const [creatorFeeBps, setCreatorFeeBps] = useState("0");
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => {
    return !!address && !txPending;
  }, [address, txPending]);

  function feePill(active: boolean) {
    return [
      "px-3 py-2 rounded-2xl border text-[12px] font-semibold transition-all active:scale-[0.99]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
      active
        ? "border-[#79ffe1]/60 bg-gradient-to-r from-[#031c1b] to-[#071a2c] text-[#79ffe1] shadow-[0_0_18px_rgba(121,255,225,0.35)]"
        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
    ].join(" ");
  }

  async function onCreate() {
    try {
      setMsg("");
      if (!address) return setMsg("Connect your wallet.");
      if (!nft.startsWith("0x") || nft.length !== 42) return setMsg("Enter a valid NFT address.");
      if (!rewardToken.startsWith("0x") || rewardToken.length !== 42) return setMsg("Enter a valid reward token address.");

      const st = startTime.trim() ? BigInt(startTime.trim()) : 0n;
      const et = endTime.trim() ? BigInt(endTime.trim()) : 0n;

      // fee bps selection: if creator mode, use creatorFeeBps, else 0 (protocol fee handled by factory anyway)
      const feeBps = feeMode === "creator" ? BigInt(Math.max(0, Math.min(10_000, Number(creatorFeeBps || "0")))) : 0n;

      // NOTE: you MUST match your factory's actual function signature here.
      // If your function differs, paste the ABI snippet and I’ll adjust.
      writeContract({
        ...CONFIG_STAKING_FACTORY,
        chainId: base.id,
        functionName: "createPool",
        args: [nft as `0x${string}`, rewardToken as `0x${string}`, st, et, feeBps],
      } as any);

      setMsg("Create submitted. Confirm in your wallet.");
    } catch (e) {
      setMsg(getErrText(e));
    }
  }

  // If your app already resolves the created pool address elsewhere, keep that.
  // Here we just show a “Fund” call to action once tx is mined (pool addr must be resolved by parent)
  // so we don't guess it incorrectly.
  return (
    <section className="glass glass-pad relative overflow-hidden rounded-3xl border border-white/10 bg-[#020617]/85">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 420px at 10% -20%, rgba(121,255,225,0.14), transparent 60%), radial-gradient(900px 520px at 90% 0%, rgba(56,189,248,0.12), transparent 55%)",
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold">Create a pool</h2>
            <p className="mt-1 text-[11px] text-white/60">
              After creating, you’ll <span className="text-[#79ffe1] font-semibold">fund the pool</span> with reward tokens.
              Protocol fee: <span className="text-white/80 font-semibold">{protocolFeePercent}%</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNft("");
                setRewardToken("");
                setStartTime("");
                setEndTime("");
                setCreatorFeeBps("0");
                setRewardAmountHint("");
                setMsg("");
              }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-white/75 hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <label>
            <span className="text-[11px] uppercase tracking-wide text-white/60">NFT address (ERC-721)</span>
            <input value={nft} onChange={(e) => setNft(e.target.value)} className={inputBase} placeholder="0x…" />
          </label>

          <label>
            <span className="text-[11px] uppercase tracking-wide text-white/60">Reward token (ERC-20)</span>
            <input value={rewardToken} onChange={(e) => setRewardToken(e.target.value)} className={inputBase} placeholder="0x…" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">Start time (unix seconds)</span>
              <input value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputBase} placeholder="e.g. 1730000000" inputMode="numeric" />
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">End time (unix seconds)</span>
              <input value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputBase} placeholder="e.g. 1735000000" inputMode="numeric" />
            </label>
          </div>

          <label>
            <span className="text-[11px] uppercase tracking-wide text-white/60">Suggested fund amount (optional)</span>
            <input
              value={rewardAmountHint}
              onChange={(e) => setRewardAmountHint(e.target.value)}
              className={inputBase}
              placeholder="e.g. 10000"
            />
            <p className="mt-1 text-[11px] text-white/50">Just a helper — it pre-fills the Fund modal after creation.</p>
          </label>

          {/* Fee mode selector (NOW VISUAL) */}
          <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/60">Fee mode</div>
                <div className="text-[11px] text-white/60 mt-1">
                  Choose a creator fee (optional) or stick to protocol-only.
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFeeMode("protocol")} className={feePill(feeMode === "protocol")}>
                Protocol only
                <div className="text-[10px] font-normal text-white/60 mt-0.5">Creator fee: 0 bps</div>
              </button>

              <button type="button" onClick={() => setFeeMode("creator")} className={feePill(feeMode === "creator")}>
                Creator fee
                <div className="text-[10px] font-normal text-white/60 mt-0.5">Set bps below</div>
              </button>
            </div>

            <div className="mt-3">
              <span className="text-[11px] uppercase tracking-wide text-white/60">Creator fee (bps)</span>
              <input
                value={creatorFeeBps}
                onChange={(e) => setCreatorFeeBps(e.target.value)}
                className={inputBase}
                placeholder="0"
                inputMode="numeric"
                disabled={feeMode !== "creator"}
              />
              <p className="mt-1 text-[11px] text-white/50">
                100 bps = 1%. (Disabled unless Creator fee is selected.)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCreate}
            disabled={!canSubmit}
            className={[
              "mt-1 w-full rounded-full py-3 text-[13px] font-semibold transition-all active:scale-[0.98]",
              canSubmit
                ? "bg-gradient-to-r from-[#79ffe1] to-sky-400 text-slate-950 shadow-[0_10px_30px_rgba(121,255,225,0.35)] hover:brightness-110"
                : "bg-white/10 text-white/40 cursor-not-allowed",
            ].join(" ")}
          >
            {txPending ? "Creating…" : "Create pool"}
          </button>

          {/* status */}
          <div className="text-[11px] text-white/70 space-y-1">
            {(msg || txErr) && <div className={(txErr ? "text-rose-300" : "text-white/70")}>{msg || getErrText(txErr)}</div>}
            {txMined && (
              <div className="text-emerald-300">
                Confirmed ✔ Pool created. Now fund it from your Pools list.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
