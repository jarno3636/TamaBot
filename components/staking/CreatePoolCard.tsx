"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "viem/chains";
import { decodeEventLog, isAddress, parseUnits, type Hex } from "viem";
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
    if (anyE.cause && typeof anyE.cause.message === "string" && anyE.cause.message.length > 0)
      return anyE.cause.message;
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

const U64_MAX = (1n << 64n) - 1n;

function clampU64(x: bigint) {
  if (x < 0n) return 0n;
  if (x > U64_MAX) return U64_MAX;
  return x;
}

function parseU64FromDecimalString(s: string): bigint | null {
  const t = (s || "").trim();
  if (t === "") return 0n;
  if (!/^\d+$/.test(t)) return null;
  try {
    const b = BigInt(t);
    return clampU64(b);
  } catch {
    return null;
  }
}

type Tone = "teal" | "amber" | "rose" | "sky";

function toneStyle(tone: Tone): React.CSSProperties {
  if (tone === "teal") {
    return {
      background: "linear-gradient(135deg, rgba(121,255,225,0.35), rgba(56,189,248,0.18))",
      borderColor: "rgba(121,255,225,0.95)",
      color: "rgba(240,253,250,0.98)",
      boxShadow: "0 0 0 1px rgba(121,255,225,0.25), 0 0 22px rgba(121,255,225,0.28)",
    };
  }
  if (tone === "amber") {
    return {
      background: "linear-gradient(135deg, rgba(251,191,36,0.30), rgba(245,158,11,0.14))",
      borderColor: "rgba(251,191,36,0.92)",
      color: "rgba(255,251,235,0.98)",
      boxShadow: "0 0 0 1px rgba(251,191,36,0.20), 0 0 20px rgba(251,191,36,0.22)",
    };
  }
  if (tone === "rose") {
    return {
      background: "linear-gradient(135deg, rgba(251,113,133,0.30), rgba(244,63,94,0.14))",
      borderColor: "rgba(251,113,133,0.92)",
      color: "rgba(255,241,242,0.98)",
      boxShadow: "0 0 0 1px rgba(251,113,133,0.20), 0 0 20px rgba(251,113,133,0.22)",
    };
  }
  return {
    background: "linear-gradient(135deg, rgba(56,189,248,0.28), rgba(14,165,233,0.14))",
    borderColor: "rgba(56,189,248,0.92)",
    color: "rgba(240,249,255,0.98)",
    boxShadow: "0 0 0 1px rgba(56,189,248,0.18), 0 0 20px rgba(56,189,248,0.20)",
  };
}

function baseBtnStyle(): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.78)",
  };
}

function PillButton({
  active,
  tone,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  tone: Tone;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-full border px-4 py-2",
        "text-[12px] font-semibold transition-transform active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110",
      ].join(" ")}
      style={active ? toneStyle(tone) : baseBtnStyle()}
    >
      {children}
    </button>
  );
}

function ChipButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
        "transition-transform active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110",
      ].join(" ")}
      style={
        active
          ? {
              background: "linear-gradient(135deg, rgba(121,255,225,0.32), rgba(56,189,248,0.16))",
              borderColor: "rgba(121,255,225,0.90)",
              color: "rgba(240,253,250,0.98)",
              boxShadow: "0 0 0 1px rgba(121,255,225,0.22), 0 0 16px rgba(121,255,225,0.20)",
            }
          : baseBtnStyle()
      }
    >
      {children}
    </button>
  );
}

/**
 * ✅ IMPORTANT FIX:
 * viem decodeEventLog expects:
 * topics: [] | [signature, ...topics]   (MUTABLE tuple)
 *
 * Receipt logs give: unknown / readonly / any[]
 * We must:
 * - validate array
 * - ensure non-empty
 * - return a MUTABLE tuple type: [Hex, ...Hex[]]
 */
function asTopicsTuple(topics: unknown): [Hex, ...Hex[]] | null {
  if (!Array.isArray(topics)) return null;
  if (topics.length === 0) return null;

  // Convert via unknown first; return MUTABLE tuple (not readonly)
  return topics as unknown as [Hex, ...Hex[]];
}

function extractPoolCreatedFromReceipt(params: {
  receipt: any;
  factory: `0x${string}`;
  expectedCreator?: `0x${string}`;
}) {
  const { receipt, factory, expectedCreator } = params;

  const logs: any[] = receipt?.logs ?? [];
  const factoryLc = factory.toLowerCase();
  const creatorLc = expectedCreator?.toLowerCase();

  for (const log of logs) {
    const logAddr = String(log.address || "").toLowerCase();
    if (!logAddr || logAddr !== factoryLc) continue;

    const topicsTuple = asTopicsTuple(log.topics);
    if (!topicsTuple) continue;

    try {
      const decoded = decodeEventLog({
        abi: (CONFIG_STAKING_FACTORY as any).abi,
        data: log.data as Hex,
        topics: topicsTuple,
      });

      if (decoded.eventName !== "PoolCreated") continue;

      const args: any = decoded.args ?? {};
      const pool = args.pool;
      const creator = args.creator;
      const nft = args.nft;
      const rewardToken = args.rewardToken;

      if (!isAddress(pool) || !isAddress(creator) || !isAddress(nft) || !isAddress(rewardToken)) continue;
      if (creatorLc && String(creator).toLowerCase() !== creatorLc) continue;

      return {
        pool: pool as `0x${string}`,
        creator: creator as `0x${string}`,
        nft: nft as `0x${string}`,
        rewardToken: rewardToken as `0x${string}`,
      };
    } catch {
      continue;
    }
  }

  return null;
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
  const { data: receipt, isLoading: txPending, isSuccess: txMined } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  const [nft, setNft] = useState("");
  const [rewardToken, setRewardToken] = useState("");
  const [rewardRate, setRewardRate] = useState("0");
  const [rewardDecimals, setRewardDecimals] = useState("18");

  const [startMode, setStartMode] = useState<StartMode>("now");
  const [startOffset, setStartOffset] = useState("0");
  const [durationValue, setDurationValue] = useState("7");
  const [durationUnit, setDurationUnit] = useState<DurUnit>("days");

  const [maxStaked, setMaxStaked] = useState("0");

  const [feeMode, setFeeMode] = useState<FeeMode>("feeOnClaim");
  const [creatorFeePct, setCreatorFeePct] = useState<number>(0);

  const [msg, setMsg] = useState("");

  const [createdPool, setCreatedPool] = useState<`0x${string}` | null>(null);
  const notifiedRef = useRef<string | null>(null);

  const canSubmit = useMemo(() => !!address && !txPending, [address, txPending]);

  const takeFeeOnClaim = feeMode === "feeOnClaim" || feeMode === "feeOnBoth";
  const takeFeeOnUnstake = feeMode === "feeOnUnstake" || feeMode === "feeOnBoth";

  const creatorFeeBpsU16 = useMemo(() => {
    if (feeMode === "noCreatorFee") return 0;
    const pct = clampInt(creatorFeePct, 0, 10);
    return clampU16(pct * 100);
  }, [creatorFeePct, feeMode]);

  const computedTimes = useMemo(() => {
    const now = BigInt(nowSeconds());

    const offsetRaw = Number(startOffset || "0");
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const start =
      startMode === "now"
        ? now
        : startMode === "inHours"
        ? now + BigInt(offset) * 3600n
        : now + BigInt(offset) * 86400n;

    const durRaw = Number(durationValue || "0");
    const dur = Number.isFinite(durRaw) ? Math.max(1, Math.floor(durRaw)) : 1;

    const seconds = durationUnit === "hours" ? BigInt(dur) * 3600n : BigInt(dur) * 86400n;
    const end = start + seconds;

    return { start: clampU64(start), end: clampU64(end), seconds };
  }, [startMode, startOffset, durationValue, durationUnit]);

  const suggestedFund = useMemo(() => {
    const rate = Number(rewardRate || "0");
    if (!rate || rate <= 0) return "";
    const seconds = Number(computedTimes.seconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const total = rate * seconds;
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

  useEffect(() => {
    if (!txMined || !receipt) return;

    const hit = extractPoolCreatedFromReceipt({
      receipt,
      factory: CONFIG_STAKING_FACTORY.address,
      expectedCreator: address ? (address as `0x${string}`) : undefined,
    });

    if (hit?.pool) setCreatedPool(hit.pool);
  }, [txMined, receipt, address]);

  useEffect(() => {
    if (!createdPool) return;
    const key = createdPool.toLowerCase();
    if (notifiedRef.current === key) return;
    notifiedRef.current = key;

    try {
      onLastCreatedPoolResolved(createdPool);

      if (isAddress(rewardToken)) {
        onOpenFundModal({ pool: createdPool, rewardToken: rewardToken as `0x${string}` }, suggestedFund || undefined);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdPool]);

  async function onCreate() {
    try {
      setMsg("");
      setCreatedPool(null);
      notifiedRef.current = null;

      if (!address) return setMsg("Connect your wallet.");
      if (!isAddress(nft)) return setMsg("Enter a valid NFT (ERC-721) address.");
      if (!isAddress(rewardToken)) return setMsg("Enter a valid reward token (ERC-20) address.");

      const decRaw = Number(rewardDecimals || "18");
      const dec = clampInt(decRaw, 0, 36);

      let rateWei: bigint;
      try {
        rateWei = parseUnits((rewardRate || "0").trim(), dec);
      } catch {
        return setMsg("Reward rate is invalid. Example: 0.01");
      }

      const maxS = parseU64FromDecimalString(maxStaked);
      if (maxS === null) return setMsg("Max staked must be an integer (0 = no cap).");

      const startTime = computedTimes.start;
      const endTime = computedTimes.end;
      if (endTime <= startTime) return setMsg("Duration must be > 0.");

      const p = {
        nft: nft as `0x${string}`,
        rewardToken: rewardToken as `0x${string}`,
        rewardRate: rateWei,
        startTime,
        endTime,
        maxStaked: maxS,
        creatorFeeBps: feeMode === "noCreatorFee" ? 0 : creatorFeeBpsU16,
        takeFeeOnClaim: feeMode === "noCreatorFee" ? false : takeFeeOnClaim,
        takeFeeOnUnstake: feeMode === "noCreatorFee" ? false : takeFeeOnUnstake,
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
              setCreatedPool(null);
              notifiedRef.current = null;
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
            <input value={rewardToken} onChange={(e) => setRewardToken(e.target.value)} className={inputBase} placeholder="0x…" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">Reward rate (tokens / sec)</span>
              <input value={rewardRate} onChange={(e) => setRewardRate(e.target.value)} className={inputBase} placeholder="e.g. 0.01" />
              {suggestedFund && (
                <p className="mt-1 text-[11px] text-white/55">
                  Suggested funding: <span className="text-[#79ffe1] font-semibold">{suggestedFund}</span>
                </p>
              )}
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-wide text-white/60">Reward decimals</span>
              <input value={rewardDecimals} onChange={(e) => setRewardDecimals(e.target.value)} className={inputBase} placeholder="18" inputMode="numeric" />
            </label>
          </div>

          {/* Schedule */}
          <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/60">Schedule</div>
                <div className="mt-1 text-[11px] text-white/70">
                  Starts{" "}
                  <span className="font-semibold text-white">
                    {startMode === "now" ? "now" : `in ${startOffset || 0} ${startMode === "inHours" ? "hour(s)" : "day(s)"}`}
                  </span>{" "}
                  • Duration{" "}
                  <span className="font-semibold text-white">
                    {durationValue} {durationUnit}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-white/55">
                Start: <span className="text-white/70">{computedTimes.start.toString()}</span> • End:{" "}
                <span className="text-white/70">{computedTimes.end.toString()}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <span className="text-[11px] uppercase tracking-wide text-white/60">Start</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PillButton active={startMode === "now"} tone="teal" onClick={() => setStartMode("now")}>
                    Now
                  </PillButton>
                  <PillButton active={startMode === "inHours"} tone="sky" onClick={() => setStartMode("inHours")}>
                    In hours
                  </PillButton>
                  <PillButton active={startMode === "inDays"} tone="amber" onClick={() => setStartMode("inDays")}>
                    In days
                  </PillButton>
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
                  <PillButton active={durationUnit === "hours"} tone="sky" onClick={() => setDurationUnit("hours")}>
                    Hours
                  </PillButton>
                  <PillButton active={durationUnit === "days"} tone="teal" onClick={() => setDurationUnit("days")}>
                    Days
                  </PillButton>
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
            <input value={maxStaked} onChange={(e) => setMaxStaked(e.target.value)} className={inputBase} placeholder="0" inputMode="numeric" />
          </label>

          {/* Fees */}
          <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-white/60">Fees</div>
                <div className="text-[12px] text-white/80 mt-1 font-semibold">{feeSummary}</div>
              </div>
              <div className="text-[11px] text-white/50">(Protocol fee {protocolFeePercent}%)</div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-2">
              <div className="flex flex-wrap gap-2">
                <PillButton
                  active={feeMode === "noCreatorFee"}
                  tone="sky"
                  onClick={() => {
                    setFeeMode("noCreatorFee");
                    setCreatorFeePct(0);
                  }}
                >
                  No fee
                </PillButton>

                <PillButton active={feeMode === "feeOnClaim"} tone="teal" onClick={() => setFeeMode("feeOnClaim")}>
                  Fee on claim
                </PillButton>

                <PillButton active={feeMode === "feeOnUnstake"} tone="amber" onClick={() => setFeeMode("feeOnUnstake")}>
                  Fee on unstake
                </PillButton>

                <PillButton active={feeMode === "feeOnBoth"} tone="rose" onClick={() => setFeeMode("feeOnBoth")}>
                  Fee on both
                </PillButton>
              </div>
            </div>

            <div className={"mt-3 rounded-2xl border border-white/10 bg-black/25 p-3" + (feeDisabled ? " opacity-60" : "")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Creator fee percent</div>
                <div className="text-[12px] font-semibold text-white/85">{feeDisabled ? "—" : `${clampInt(creatorFeePct, 0, 10)}%`}</div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {[0, 1, 2, 5, 10].map((p) => (
                  <ChipButton key={p} disabled={feeDisabled} active={!feeDisabled && creatorFeePct === p} onClick={() => setCreatorFeePct(p)}>
                    {p === 0 ? "0%" : `${p}%`}
                  </ChipButton>
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
                  className="w-full"
                  style={{ accentColor: "#79ffe1", opacity: feeDisabled ? 0.5 : 1 }}
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

          {createdPool && (
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/35 p-3 text-[11px] text-white/75">
              <div className="font-semibold text-white/90">Pool created</div>
              <div className="mt-1 break-all font-mono text-white/80">{createdPool}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`https://basescan.org/address/${createdPool}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 transition-all active:scale-95"
                >
                  Basescan ↗
                </a>
              </div>
            </div>
          )}

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

            {txMined && <div className="text-emerald-300">Confirmed ✔ Pool created. Funding modal should open automatically.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
