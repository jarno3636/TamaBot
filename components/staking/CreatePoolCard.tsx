// components/staking/CreatePoolCard.tsx
"use client";

import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "viem/chains";
import { parseUnits } from "viem";
import { CONFIG_STAKING_FACTORY } from "@/lib/stakingContracts";

type FundTarget = {
  pool: `0x${string}`;
  rewardToken: `0x${string}`;
};

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

type FeeMode = "noCreatorFee" | "feeOnClaim" | "feeOnUnstake" | "feeOnBoth";

function clampU16(n: number) {
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

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
  const publicClient = usePublicClient({ chainId: base.id });

  const { writeContract, data: txHash, error: txErr } = useWriteContract();
  const { isLoading: txPending, isSuccess: txMined } = useWaitForTransactionReceipt({ hash: txHash, chainId: base.id });

  const [nft, setNft] = useState("");
  const [rewardToken, setRewardToken] = useState("");

  // core pool params
  const [rewardRate, setRewardRate] = useState("0"); // tokens/sec (human units)
  const [rewardDecimals, setRewardDecimals] = useState("18"); // used only for parseUnits
  const [startTime, setStartTime] = useState(""); // unix seconds
  const [endTime, setEndTime] = useState(""); // unix seconds
  const [maxStaked, setMaxStaked] = useState("0"); // 0 = unlimited (your contract might treat 0 as unlimited; if not, set a number)

  // fee toggles (this is what your ABI actually supports)
  const [feeMode, setFeeMode] = useState<FeeMode>("feeOnClaim");
  const [creatorFeeBps, setCreatorFeeBps] = useState("0");

  const [msg, setMsg] = useState("");
  const [lastCreatedPool, setLastCreatedPool] = useState<`0x${string}` | null>(null);

  const canSubmit = useMemo(() => !!address && !txPending, [address, txPending]);

  function pill(active: boolean, tone: "teal" | "amber" | "rose" | "sky" = "teal") {
    const toneClasses =
      tone === "teal"
        ? "border-[#79ffe1]/60 bg-[#031c1b] text-[#79ffe1] shadow-[0_0_18px_rgba(121,255,225,0.35)]"
        : tone === "amber"
        ? "border-amber-400/60 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
        : tone === "rose"
        ? "border-rose-400/60 bg-rose-500/10 text-rose-200 shadow-[0_0_18px_rgba(251,113,133,0.18)]"
        : "border-sky-400/60 bg-sky-500/10 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.18)]";

    return [
      "px-3 py-2 rounded-2xl border text-[12px] font-semibold transition-all active:scale-[0.99]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
      active ? toneClasses : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
    ].join(" ");
  }

  const takeFeeOnClaim = feeMode === "feeOnClaim" || feeMode === "feeOnBoth";
  const takeFeeOnUnstake = feeMode === "feeOnUnstake" || feeMode === "feeOnBoth";
  const creatorFeeBpsU16 = clampU16(Number(creatorFeeBps || "0"));

  const suggestedFund = useMemo(() => {
    // If user gives start/end and rate, suggest total tokens = rate * duration
    const st = Number(startTime || "0");
    const et = Number(endTime || "0");
    const rate = Number(rewardRate || "0");
    if (!st || !et || et <= st || !rate || rate <= 0) return "";
    const secs = et - st;
    const total = rate * secs;
    if (!Number.isFinite(total) || total <= 0) return "";
    // keep it readable (no exponent)
    return total.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }, [startTime, endTime, rewardRate]);

  async function resolveCreatedPoolFromReceipt() {
    if (!publicClient || !txHash) return null;
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      // find PoolCreated(pool, creator, nft, rewardToken)
      for (const log of receipt.logs) {
        try {
          const decoded = publicClient.chain?.id
            ? // viem decode via parseEventLogs would be cleaner, but this avoids importing more helpers.
              null
            : null;
        } catch {}
      }

      // Easiest + reliable: call simulate? But we already broadcasted.
      // Alternative: read return value is not available post-tx from wagmi.
      // So: call your /api/pools refresh and match by creator + nft + rewardToken newest.
      // We'll do the lightweight approach: ask parent to refresh and open by pool query param.
      return null;
    } catch {
      return null;
    }
  }

  async function onCreate() {
    try {
      setMsg("");
      setLastCreatedPool(null);

      if (!address) return setMsg("Connect your wallet.");
      if (!nft.startsWith("0x") || nft.length !== 42) return setMsg("Enter a valid NFT address.");
      if (!rewardToken.startsWith("0x") || rewardToken.length !== 42) return setMsg("Enter a valid reward token address.");

      const st = BigInt(startTime.trim() || "0");
      const et = BigInt(endTime.trim() || "0");
      if (st === 0n || et === 0n || et <= st) return setMsg("Start/end time must be valid unix seconds (end > start).");

      const maxS = BigInt(maxStaked.trim() || "0"); // 0 = unlimited (if your pool treats 0 as unlimited)
      const dec = Math.max(0, Math.min(36, Number(rewardDecimals || "18")));
      const rateWei = parseUnits(rewardRate.trim() || "0", dec);

      // ABI EXACT: createPool((nft,rewardToken,rewardRate,startTime,endTime,maxStaked,creatorFeeBps,takeFeeOnClaim,takeFeeOnUnstake))
      const p = {
        nft: nft as `0x${string}`,
        rewardToken: rewardToken as `0x${string}`,
        rewardRate: rateWei,
        startTime: Number(st) as any, // uint64
        endTime: Number(et) as any, // uint64
        maxStaked: Number(maxS) as any, // uint64
        creatorFeeBps: creatorFeeBpsU16 as any, // uint16
        takeFeeOnClaim,
        takeFeeOnUnstake,
      };

      writeContract({
        ...CONFIG_STAKING_FACTORY,
        chainId: base.id,
        functionName: "createPool",
        args: [p],
      } as any);

      setMsg("Create submitted. Confirm in your wallet.");
    } catch (e) {
      setMsg(getErrText(e));
    }
  }

  // after mined: encourage funding + let user open fund modal (pool address is not known here unless you decode logs or use /api/pools)
  // Your parent page already has /api/pools + “refresh”; so we keep CTA simple and accurate.
  const feeSummary = useMemo(() => {
    if (creatorFeeBpsU16 === 0) return "No creator fee.";
    const pct = (creatorFeeBpsU16 / 100).toFixed(2);
    const where =
      feeMode === "feeOnClaim" ? "on claim" : feeMode === "feeOnUnstake" ? "on unstake" : feeMode === "feeOnBoth" ? "on claim + unstake" : "disabled";
    return `${pct}% creator fee ${where}.`;
  }, [creatorFeeBpsU16, feeMode]);

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
              After creating, you must fund the pool. Protocol fee: <span className="text-white/80 font-semibold">{protocolFeePercent}%</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNft("");
              setRewardToken("");
              setRewardRate("0");
              setRewardDecimals("18");
              setStartTime("");
              setEndTime("");
              setMaxStaked("0");
              setCreatorFeeBps("0");
              setFeeMode("feeOnClaim");
              setMsg("");
              setLastCreatedPool(null);
            }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-white/75 hover:bg-white/10"
          >
            Clear
          </button>
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
              <span className="text-[11px] uppercase tracking-wide text-white/60">Reward rate (tokens / sec)</span>
              <input value={rewardRate} onChange={(e) => setRewardRate(e.target.value)} className={inputBase} placeholder="e.g. 0.01" />
              {suggestedFund && (
                <p className="mt-1 text-[11px] text-white/55">
                  Suggested funding (rate × duration): <span className="text-[#79ffe1] font-semibold">{suggestedFund}</span>
                </p>
              )}
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">Reward decimals</span>
              <input value={rewardDecimals} onChange={(e) => setRewardDecimals(e.target.value)} className={inputBase} placeholder="18" inputMode="numeric" />
              <p className="mt-1 text-[11px] text-white/50">Used to convert “tokens/sec” into wei via parseUnits.</p>
            </label>
          </div>

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
            <span className="text-[11px] uppercase tracking-wide text-white/60">Max staked (0 = no cap)</span>
            <input value={maxStaked} onChange={(e) => setMaxStaked(e.target.value)} className={inputBase} placeholder="0" inputMode="numeric" />
          </label>

          {/* Fee settings (NOW CLEAR + COLORED WHEN SELECTED) */}
          <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/60">Creator fee + when to charge</div>
                <div className="text-[11px] text-white/60 mt-1">{feeSummary}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFeeMode("noCreatorFee")} className={pill(feeMode === "noCreatorFee", "sky")}>
                No creator fee
                <div className="text-[10px] font-normal text-white/60 mt-0.5">bps forced to 0</div>
              </button>

              <button type="button" onClick={() => setFeeMode("feeOnClaim")} className={pill(feeMode === "feeOnClaim", "teal")}>
                Fee on claim
                <div className="text-[10px] font-normal text-white/60 mt-0.5">takeFeeOnClaim = true</div>
              </button>

              <button type="button" onClick={() => setFeeMode("feeOnUnstake")} className={pill(feeMode === "feeOnUnstake", "amber")}>
                Fee on unstake
                <div className="text-[10px] font-normal text-white/60 mt-0.5">takeFeeOnUnstake = true</div>
              </button>

              <button type="button" onClick={() => setFeeMode("feeOnBoth")} className={pill(feeMode === "feeOnBoth", "rose")}>
                Fee on both
                <div className="text-[10px] font-normal text-white/60 mt-0.5">claim + unstake</div>
              </button>
            </div>

            <div className="mt-3">
              <span className="text-[11px] uppercase tracking-wide text-white/60">Creator fee (bps)</span>
              <input
                value={feeMode === "noCreatorFee" ? "0" : creatorFeeBps}
                onChange={(e) => setCreatorFeeBps(e.target.value)}
                className={inputBase}
                placeholder="0"
                inputMode="numeric"
                disabled={feeMode === "noCreatorFee"}
              />
              <p className="mt-1 text-[11px] text-white/50">100 bps = 1%. Max 10,000. Disabled if “No creator fee”.</p>
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

          <div className="text-[11px] text-white/70 space-y-1">
            {(msg || txErr) && <div className={txErr ? "text-rose-300" : "text-white/70"}>{msg || getErrText(txErr)}</div>}
            {txHash && (
              <div className="text-white/70">
                Tx:{" "}
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#79ffe1] underline decoration-dotted underline-offset-4"
                >
                  view ↗
                </a>
              </div>
            )}
            {txMined && (
              <div className="text-emerald-300">
                Confirmed ✔ Pool created. Now fund it from the Pools list (Creator badge → Fund).
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
