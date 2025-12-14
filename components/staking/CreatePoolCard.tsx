"use client";

import { useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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

type StartMode = "now" | "inHours" | "inDays";
type DurUnit = "hours" | "days";

function clampU16(n: number) {
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/** Stronger pill styles so active is VERY obvious */
function pill(active: boolean, tone: "teal" | "amber" | "rose" | "sky" = "teal") {
  const activeTone =
    tone === "teal"
      ? "border-[#79ffe1] bg-[#063b37] text-[#bffdf4] shadow-[0_0_0_1px_rgba(121,255,225,0.35),0_0_24px_rgba(121,255,225,0.30)]"
      : tone === "amber"
      ? "border-amber-300 bg-amber-500/20 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.22),0_0_22px_rgba(251,191,36,0.22)]"
      : tone === "rose"
      ? "border-rose-300 bg-rose-500/20 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.22),0_0_22px_rgba(251,113,133,0.22)]"
      : "border-sky-300 bg-sky-500/20 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_0_22px_rgba(56,189,248,0.22)]";

  const inactive =
    "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/20";

  return [
    "inline-flex items-center justify-center px-4 py-2 rounded-full border",
    "text-[12px] font-semibold transition-all active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
    active ? activeTone : inactive,
  ].join(" ");
}

/** Small chips for quick fee picks */
function feeChip(active: boolean, disabled: boolean) {
  if (disabled) {
    return "px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[12px] font-semibold text-white/35 cursor-not-allowed";
  }
  return [
    "px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
    active
      ? "border-[#79ffe1] bg-[#063b37] text-[#bffdf4] shadow-[0_0_0_1px_rgba(121,255,225,0.30),0_0_18px_rgba(121,255,225,0.22)]"
      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/20",
  ].join(" ");
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
  const { writeContract, data: txHash, error: txErr } = useWriteContract();
  const { isLoading: txPending, isSuccess: txMined } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  const [nft, setNft] = useState("");
  const [rewardToken, setRewardToken] = useState("");

  // tokens/sec entry
  const [rewardRate, setRewardRate] = useState("0");
  const [rewardDecimals, setRewardDecimals] = useState("18");

  // Friendly schedule controls
  const [startMode, setStartMode] = useState<StartMode>("now");
  const [startOffset, setStartOffset] = useState("0"); // hours or days based on startMode
  const [durationValue, setDurationValue] = useState("7");
  const [durationUnit, setDurationUnit] = useState<DurUnit>("days");

  const [maxStaked, setMaxStaked] = useState("0");

  // Fee mode toggles
  const [feeMode, setFeeMode] = useState<FeeMode>("feeOnClaim");

  // Creator fee percent (0-10) — now via slider + chips
  const [creatorFeePct, setCreatorFeePct] = useState<number>(0);

  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => !!address && !txPending, [address, txPending]);

  const takeFeeOnClaim = feeMode === "feeOnClaim" || feeMode === "feeOnBoth";
  const takeFeeOnUnstake = feeMode === "feeOnUnstake" || feeMode === "feeOnBoth";

  const creatorFeeBpsU16 = useMemo(() => {
    if (feeMode === "noCreatorFee") return 0;
    const pct = clampInt(creatorFeePct, 0, 10);
    return clampU16(pct * 100);
  }, [creatorFeePct, feeMode]);

  const computedTimes = useMemo(() => {
    const now = nowSeconds();

    const offsetRaw = Number(startOffset || "0");
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const start =
      startMode === "now"
        ? now
        : startMode === "inHours"
        ? now + offset * 3600
        : now + offset * 86400;

    const durRaw = Number(durationValue || "0");
    const dur = Number.isFinite(durRaw) ? Math.max(1, Math.floor(durRaw)) : 1;

    const seconds = durationUnit === "hours" ? dur * 3600 : dur * 86400;
    const end = start + seconds;

    return { start, end, seconds };
  }, [startMode, startOffset, durationValue, durationUnit]);

  const suggestedFund = useMemo(() => {
    const rate = Number(rewardRate || "0");
    if (!rate || rate <= 0) return "";
    const total = rate * computedTimes.seconds;
    if (!Number.isFinite(total) || total <= 0) return "";
    return total.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }, [rewardRate, computedTimes.seconds]);

  const feeSummary = useMemo(() => {
    if (feeMode === "noCreatorFee" || creatorFeeBpsU16 === 0) return "No creator fee";
    const pct = (creatorFeeBpsU16 / 100).toFixed(0);
    const where =
      feeMode === "feeOnClaim"
        ? "on claim"
        : feeMode === "feeOnUnstake"
        ? "on unstake"
        : "on claim + unstake";
    return `${pct}% creator fee ${where}`;
  }, [creatorFeeBpsU16, feeMode]);

  async function onCreate() {
    try {
      setMsg("");

      if (!address) return setMsg("Connect your wallet.");
      if (!nft.startsWith("0x") || nft.length !== 42) return setMsg("Enter a valid NFT address.");
      if (!rewardToken.startsWith("0x") || rewardToken.length !== 42) return setMsg("Enter a valid reward token address.");

      const dec = Math.max(0, Math.min(36, Number(rewardDecimals || "18")));
      const rateWei = parseUnits(rewardRate.trim() || "0", dec);

      const maxS = BigInt(maxStaked.trim() || "0");

      const startTime = computedTimes.start;
      const endTime = computedTimes.end;

      if (endTime <= startTime) return setMsg("Duration must be > 0.");

      const p = {
        nft: nft as `0x${string}`,
        rewardToken: rewardToken as `0x${string}`,
        rewardRate: rateWei,
        startTime: startTime as any, // uint64
        endTime: endTime as any, // uint64
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

  const feeDisabled = feeMode === "noCreatorFee";

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
              After creating, you must fund the pool. Protocol fee:{" "}
              <span className="text-white/80 font-semibold">{protocolFeePercent}%</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNft("");
              setRewardToken("");
              setRewardRate("0");
              setRewardDecimals("18");
              setStartMode("now");
              setStartOffset("0");
              setDurationValue("7");
              setDurationUnit("days");
              setMaxStaked("0");
              setFeeMode("feeOnClaim");
              setCreatorFeePct(0);
              setMsg("");
            }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-white/75 hover:bg-white/10"
          >
            Clear
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label>
            <span className="text-[11px] uppercase tracking-wide text-white/60">NFT address</span>
            <input value={nft} onChange={(e) => setNft(e.target.value)} className={inputBase} placeholder="0x…" />
          </label>

          <label>
            <span className="text-[11px] uppercase tracking-wide text-white/60">Reward token</span>
            <input
              value={rewardToken}
              onChange={(e) => setRewardToken(e.target.value)}
              className={inputBase}
              placeholder="0x…"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">Reward rate (tokens / sec)</span>
              <input
                value={rewardRate}
                onChange={(e) => setRewardRate(e.target.value)}
                className={inputBase}
                placeholder="e.g. 0.01"
              />
              {suggestedFund && (
                <p className="mt-1 text-[11px] text-white/55">
                  Suggested funding: <span className="text-[#79ffe1] font-semibold">{suggestedFund}</span>
                </p>
              )}
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">Reward decimals</span>
              <input
                value={rewardDecimals}
                onChange={(e) => setRewardDecimals(e.target.value)}
                className={inputBase}
                placeholder="18"
                inputMode="numeric"
              />
            </label>
          </div>

          {/* Friendly Start + Duration */}
          <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/60">Schedule</div>
                <div className="mt-1 text-[11px] text-white/70">
                  Starts{" "}
                  <span className="font-semibold text-white">
                    {startMode === "now"
                      ? "now"
                      : `in ${startOffset || 0} ${startMode === "inHours" ? "hour(s)" : "day(s)"}`}
                  </span>{" "}
                  • Duration{" "}
                  <span className="font-semibold text-white">
                    {durationValue} {durationUnit}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-white/55">
                Start: <span className="text-white/70">{computedTimes.start}</span> • End:{" "}
                <span className="text-white/70">{computedTimes.end}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <span className="text-[11px] uppercase tracking-wide text-white/60">Start</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setStartMode("now")} className={pill(startMode === "now", "teal")}>
                    Now
                  </button>
                  <button type="button" onClick={() => setStartMode("inHours")} className={pill(startMode === "inHours", "sky")}>
                    In hours
                  </button>
                  <button type="button" onClick={() => setStartMode("inDays")} className={pill(startMode === "inDays", "amber")}>
                    In days
                  </button>
                </div>

                {startMode !== "now" && (
                  <input
                    value={startOffset}
                    onChange={(e) => setStartOffset(e.target.value)}
                    className={inputBase}
                    placeholder={startMode === "inHours" ? "e.g. 2" : "e.g. 1"}
                    inputMode="numeric"
                  />
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <span className="text-[11px] uppercase tracking-wide text-white/60">Duration</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDurationUnit("hours")} className={pill(durationUnit === "hours", "sky")}>
                    Hours
                  </button>
                  <button type="button" onClick={() => setDurationUnit("days")} className={pill(durationUnit === "days", "teal")}>
                    Days
                  </button>
                </div>

                <input
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className={inputBase}
                  placeholder={durationUnit === "hours" ? "e.g. 12" : "e.g. 7"}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <label>
            <span className="text-[11px] uppercase tracking-wide text-white/60">Max staked (0 = no cap)</span>
            <input
              value={maxStaked}
              onChange={(e) => setMaxStaked(e.target.value)}
              className={inputBase}
              placeholder="0"
              inputMode="numeric"
            />
          </label>

          {/* Fee settings */}
          <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/60">Fees</div>
                <div className="text-[12px] text-white/80 mt-1 font-semibold">{feeSummary}</div>
              </div>
              <div className="text-[11px] text-white/50">
                (Protocol fee {protocolFeePercent}%)
              </div>
            </div>

            {/* Fee mode pills (stronger selected state) */}
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeeMode("noCreatorFee");
                    setCreatorFeePct(0);
                  }}
                  className={pill(feeMode === "noCreatorFee", "sky")}
                >
                  No fee
                </button>
                <button type="button" onClick={() => setFeeMode("feeOnClaim")} className={pill(feeMode === "feeOnClaim", "teal")}>
                  Fee on claim
                </button>
                <button type="button" onClick={() => setFeeMode("feeOnUnstake")} className={pill(feeMode === "feeOnUnstake", "amber")}>
                  Fee on unstake
                </button>
                <button type="button" onClick={() => setFeeMode("feeOnBoth")} className={pill(feeMode === "feeOnBoth", "rose")}>
                  Fee on both
                </button>
              </div>
            </div>

            {/* Percent selector: chips + slider (NO BPS wording) */}
            <div className={classNames("mt-3 rounded-2xl border border-white/10 bg-black/25 p-3", feeDisabled && "opacity-60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Creator fee percent</div>
                <div className="text-[12px] font-semibold text-white/85">
                  {feeDisabled ? "—" : `${clampInt(creatorFeePct, 0, 10)}%`}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {[0, 1, 2, 5, 10].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={feeDisabled}
                    onClick={() => setCreatorFeePct(p)}
                    className={feeChip(!feeDisabled && creatorFeePct === p, feeDisabled)}
                  >
                    {p === 0 ? "0%" : `${p}%`}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  disabled={feeDisabled}
                  value={clampInt(creatorFeePct, 0, 10)}
                  onChange={(e) => setCreatorFeePct(clampInt(Number(e.target.value), 0, 10))}
                  className={classNames(
                    "w-full accent-[#79ffe1]",
                    feeDisabled && "cursor-not-allowed",
                  )}
                />
                <div className="mt-1 flex justify-between text-[10px] text-white/45">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                </div>
              </div>
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
