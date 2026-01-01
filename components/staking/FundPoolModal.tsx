"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "viem/chains";
import { formatUnits, isAddress, parseUnits } from "viem";
import type { FundTarget, TokenMeta } from "./stakingUtils";
import { getErrText } from "./stakingUtils";

const ERC20_METADATA_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8", name: "" }] },
] as const;

const ERC20_BALANCE_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256", name: "" }] },
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

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toneStyle(tone: "teal" | "emerald" | "sky" | "amber" | "rose" | "white") {
  switch (tone) {
    case "teal":
      return {
        background: "linear-gradient(135deg, rgba(121,255,225,0.30), rgba(56,189,248,0.14))",
        borderColor: "rgba(121,255,225,0.92)",
        color: "rgba(240,253,250,0.98)",
        boxShadow: "0 0 0 1px rgba(121,255,225,0.18), 0 0 18px rgba(121,255,225,0.20)",
      } as React.CSSProperties;
    case "emerald":
      return {
        background: "linear-gradient(135deg, rgba(52,211,153,0.26), rgba(16,185,129,0.12))",
        borderColor: "rgba(52,211,153,0.88)",
        color: "rgba(236,253,245,0.98)",
        boxShadow: "0 0 0 1px rgba(52,211,153,0.16), 0 0 16px rgba(52,211,153,0.16)",
      } as React.CSSProperties;
    case "sky":
      return {
        background: "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(14,165,233,0.12))",
        borderColor: "rgba(56,189,248,0.86)",
        color: "rgba(240,249,255,0.98)",
        boxShadow: "0 0 0 1px rgba(56,189,248,0.14), 0 0 16px rgba(56,189,248,0.14)",
      } as React.CSSProperties;
    case "amber":
      return {
        background: "linear-gradient(135deg, rgba(251,191,36,0.26), rgba(245,158,11,0.12))",
        borderColor: "rgba(251,191,36,0.86)",
        color: "rgba(255,251,235,0.98)",
        boxShadow: "0 0 0 1px rgba(251,191,36,0.14), 0 0 16px rgba(251,191,36,0.14)",
      } as React.CSSProperties;
    case "rose":
      return {
        background: "linear-gradient(135deg, rgba(251,113,133,0.26), rgba(244,63,94,0.12))",
        borderColor: "rgba(251,113,133,0.86)",
        color: "rgba(255,241,242,0.98)",
        boxShadow: "0 0 0 1px rgba(251,113,133,0.14), 0 0 16px rgba(251,113,133,0.14)",
      } as React.CSSProperties;
    default:
      return {
        background: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.88)",
      } as React.CSSProperties;
  }
}

function Chip({
  tone,
  children,
}: {
  tone: "teal" | "emerald" | "sky" | "amber" | "rose" | "white";
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold" style={toneStyle(tone)}>
      {children}
    </span>
  );
}

function Btn({
  tone,
  children,
  onClick,
  disabled,
}: {
  tone: "teal" | "emerald" | "sky" | "amber" | "rose" | "white";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-transform active:scale-95 shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={toneStyle(tone)}
    >
      {children}
    </button>
  );
}

const inputBase =
  "mt-1 w-full max-w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

function sanitizeAmountInput(v: string) {
  // keep digits + single dot, strip commas/spaces
  const raw = v.replace(/,/g, "").replace(/\s+/g, "");
  let out = "";
  let seenDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !seenDot) {
      out += ".";
      seenDot = true;
    }
  }
  return out;
}

export default function FundPoolModal({
  open,
  onClose,
  target,
  suggestedAmount,
}: {
  open: boolean;
  onClose: () => void;
  target: FundTarget | null;
  suggestedAmount?: string;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });

  const [amount, setAmount] = useState("");
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaErr, setMetaErr] = useState<string | null>(null);

  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [balLoading, setBalLoading] = useState(false);
  const [balErr, setBalErr] = useState<string | null>(null);

  const { writeContract, data: fundTxHash, error: fundErr } = useWriteContract();
  const { isLoading: fundPending, isSuccess: fundMined } = useWaitForTransactionReceipt({
    hash: fundTxHash,
    chainId: base.id,
  });

  const [fundMsg, setFundMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  const [copiedPool, setCopiedPool] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setFundMsg("");
    setMetaErr(null);
    setTokenMeta(null);
    setBalErr(null);
    setBalanceWei(null);

    setAmount(sanitizeAmountInput((suggestedAmount || "").toString()));

    setCopiedPool(false);
    setCopiedToken(false);
  }, [open, suggestedAmount]);

  useEffect(() => {
    if (!open || !fundMined) return;
    const id = setTimeout(() => onClose(), 1400);
    return () => clearTimeout(id);
  }, [open, fundMined, onClose]);

  useEffect(() => {
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  // Load metadata
  useEffect(() => {
    if (!open || !target || !publicClient) return;
    let cancelled = false;

    (async () => {
      try {
        setMetaLoading(true);
        setMetaErr(null);

        const [symbol, name, decimals] = await Promise.all([
          publicClient.readContract({ address: target.rewardToken, abi: ERC20_METADATA_ABI, functionName: "symbol" }),
          publicClient.readContract({ address: target.rewardToken, abi: ERC20_METADATA_ABI, functionName: "name" }),
          publicClient.readContract({ address: target.rewardToken, abi: ERC20_METADATA_ABI, functionName: "decimals" }),
        ]);

        if (cancelled) return;

        const d = Number(decimals ?? 18);
        const safeD = Number.isFinite(d) ? Math.max(0, Math.min(36, d)) : 18;

        setTokenMeta({
          symbol: (symbol as string) || "TOKEN",
          name: (name as string) || "Token",
          decimals: safeD,
        });
      } catch {
        if (cancelled) return;
        setMetaErr("Could not load token metadata; using 18 decimals.");
        setTokenMeta({ symbol: "TOKEN", name: "Token", decimals: 18 });
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, target, publicClient]);

  const symbol = tokenMeta?.symbol ?? "TOKEN";
  const decimals = tokenMeta?.decimals ?? 18;

  // Load balance (after metadata so decimals formatting is right)
  useEffect(() => {
    if (!open || !target || !publicClient || !address) return;
    let cancelled = false;

    (async () => {
      try {
        setBalLoading(true);
        setBalErr(null);

        const bal = await publicClient.readContract({
          address: target.rewardToken,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address],
        });

        if (cancelled) return;
        setBalanceWei(bal as bigint);
      } catch {
        if (cancelled) return;
        setBalErr("Could not load wallet balance.");
        setBalanceWei(null);
      } finally {
        if (!cancelled) setBalLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, target, publicClient, address]);

  const balanceText = useMemo(() => {
    if (balanceWei === null) return "";
    try {
      return formatUnits(balanceWei, decimals);
    } catch {
      return "";
    }
  }, [balanceWei, decimals]);

  const suggestedNum = useMemo(() => {
    const s = (suggestedAmount || "").trim();
    if (!s) return NaN;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }, [suggestedAmount]);

  function setPctOfSuggested(pct: number) {
    if (!Number.isFinite(suggestedNum) || suggestedNum <= 0) return;
    const v = (suggestedNum * pct).toLocaleString("en-US", { maximumFractionDigits: 6 }).replace(/,/g, "");
    setAmount(v);
  }

  async function copy(text: string, which: "pool" | "token") {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "pool") {
        setCopiedPool(true);
        setTimeout(() => setCopiedPool(false), 900);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 900);
      }
    } catch {
      // ignore
    }
  }

  function setMaxFromBalance() {
    if (balanceWei === null) return;
    try {
      const v = formatUnits(balanceWei, decimals);
      setAmount(sanitizeAmountInput(v));
    } catch {
      // ignore
    }
  }

  const targetOk = useMemo(() => {
    if (!target) return false;
    return isAddress(target.pool) && isAddress(target.rewardToken);
  }, [target]);

  const amountWeiPreview = useMemo(() => {
    const v = sanitizeAmountInput(amount);
    if (!v) return null;
    try {
      const wei = parseUnits(v, decimals);
      return wei > 0n ? wei : null;
    } catch {
      return null;
    }
  }, [amount, decimals]);

  const exceedsBalance = useMemo(() => {
    if (balanceWei === null) return false;
    if (!amountWeiPreview) return false;
    return amountWeiPreview > balanceWei;
  }, [amountWeiPreview, balanceWei]);

  function handleFund() {
    try {
      setFundMsg("");

      if (!targetOk || !target) return setFundMsg("Missing or invalid pool/token info.");
      if (!address) return setFundMsg("Connect your wallet.");

      const v = sanitizeAmountInput(amount);
      if (!v) return setFundMsg("Enter an amount.");
      if (v.startsWith("-")) return setFundMsg("Amount must be > 0.");

      let amountWei: bigint;
      try {
        amountWei = parseUnits(v, decimals);
      } catch {
        return setFundMsg("Invalid amount format.");
      }

      if (amountWei <= 0n) return setFundMsg("Amount must be > 0.");
      if (balanceWei !== null && amountWei > balanceWei) return setFundMsg("Amount exceeds wallet balance.");

      writeContract({
        address: target.rewardToken,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [target.pool, amountWei],
        chainId: base.id,
      });

      setFundMsg("Submitted. Confirm in your wallet.");
    } catch (e) {
      setFundMsg(getErrText(e));
    }
  }

  if (!open || !target || !mounted) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black" />

      <div
        className={cx(
          "relative overflow-hidden rounded-[28px] border border-white/15 bg-[#070A16]",
          "shadow-[0_40px_120px_rgba(0,0,0,0.95)] ring-1 ring-white/10",
          "w-[min(92vw,28rem)]",
          "max-h-[calc(100svh-2rem)]",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(800px 320px at 12% -10%, rgba(121,255,225,0.20), transparent 60%), radial-gradient(800px 320px at 90% 0%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(700px 320px at 50% 115%, rgba(168,85,247,0.12), transparent 55%)",
          }}
        />

        <div className="relative px-5 pt-5 pb-4 border-b border-white/10 bg-[#070A16]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl border" style={toneStyle("teal")} aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Fund pool</h2>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    Send reward tokens directly to the pool contract.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Chip tone="sky">Base</Chip>
                {metaLoading ? <Chip tone="white">Loading token…</Chip> : <Chip tone="teal">{symbol}</Chip>}
                {fundPending && <Chip tone="amber">Pending…</Chip>}
                {fundMined && <Chip tone="emerald">Confirmed</Chip>}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 hover:bg-white/15 transition-transform active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="relative px-5 py-4 overflow-y-auto overflow-x-hidden overscroll-contain max-h-[calc(100svh-2rem-84px)]">
          <div className="grid gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[10px] uppercase tracking-wide text-white/55">
                  Pool address
                </div>
                <Btn tone={copiedPool ? "emerald" : "white"} onClick={() => copy(target.pool, "pool")} disabled={fundPending}>
                  {copiedPool ? "Copied" : "Copy"}
                </Btn>
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-white/80">{target.pool}</div>
              <div className="mt-2">
                <Link
                  href={`https://basescan.org/address/${target.pool}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#79ffe1] underline decoration-dotted underline-offset-4"
                >
                  View on Basescan ↗
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[10px] uppercase tracking-wide text-white/55">
                  Reward token
                </div>
                <Btn tone={copiedToken ? "emerald" : "white"} onClick={() => copy(target.rewardToken, "token")} disabled={fundPending}>
                  {copiedToken ? "Copied" : "Copy"}
                </Btn>
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-white/80">{target.rewardToken}</div>

              {address && (
                <div className="mt-2 text-[11px] text-white/60">
                  Balance:{" "}
                  {balLoading ? (
                    <span className="text-white/70 font-semibold">loading…</span>
                  ) : balanceWei !== null ? (
                    <span className="text-white/80 font-semibold">{balanceText}</span>
                  ) : (
                    <span className="text-amber-200">{balErr || "unknown"}</span>
                  )}{" "}
                  <span className="text-white/50">{symbol}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white/85">Amount</div>
                <div className="text-[11px] text-white/55">Choose how many {symbol} to send.</div>
              </div>

              <div className="flex items-center gap-2">
                {suggestedAmount && (
                  <button
                    type="button"
                    onClick={() => setAmount(sanitizeAmountInput(String(suggestedAmount)))}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-transform active:scale-95"
                    style={toneStyle("teal")}
                    disabled={fundPending}
                  >
                    Use: {suggestedAmount}
                  </button>
                )}

                <Btn tone="white" onClick={setMaxFromBalance} disabled={fundPending || balanceWei === null}>
                  Max
                </Btn>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="text-[11px] uppercase tracking-wide text-white/60">Amount ({symbol})</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                placeholder={suggestedAmount ? sanitizeAmountInput(String(suggestedAmount)) : "e.g. 1000"}
                className={inputBase}
                disabled={fundPending}
              />
              {metaErr && <p className="mt-1 text-[11px] text-amber-200">{metaErr}</p>}

              {exceedsBalance && (
                <p className="mt-1 text-[11px] text-rose-200">
                  Amount exceeds your wallet balance.
                </p>
              )}

              <p className="mt-1 text-[11px] text-white/45">
                Uses <span className="text-white/70 font-semibold">{decimals}</span> decimals.
              </p>
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <Btn tone="white" onClick={() => setAmount("")} disabled={fundPending}>
                Clear
              </Btn>
              <Btn tone="sky" onClick={() => setPctOfSuggested(0.25)} disabled={fundPending || !Number.isFinite(suggestedNum) || suggestedNum <= 0}>
                25%
              </Btn>
              <Btn tone="sky" onClick={() => setPctOfSuggested(0.5)} disabled={fundPending || !Number.isFinite(suggestedNum) || suggestedNum <= 0}>
                50%
              </Btn>
              <Btn tone="sky" onClick={() => setPctOfSuggested(0.75)} disabled={fundPending || !Number.isFinite(suggestedNum) || suggestedNum <= 0}>
                75%
              </Btn>
              <Btn tone="teal" onClick={() => setPctOfSuggested(1)} disabled={fundPending || !Number.isFinite(suggestedNum) || suggestedNum <= 0}>
                100%
              </Btn>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleFund}
              disabled={fundPending || !targetOk || exceedsBalance || !amountWeiPreview}
              className={cx(
                "w-full inline-flex items-center justify-center rounded-full py-3 text-sm font-semibold transition-transform active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/70",
                fundPending || !targetOk || exceedsBalance || !amountWeiPreview
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:brightness-110",
              )}
              style={{
                background: "linear-gradient(90deg, rgba(121,255,225,1) 0%, rgba(56,189,248,1) 100%)",
                color: "#07121b",
                boxShadow: "0 14px 40px rgba(121, 255, 225, 0.28)",
              }}
            >
              {fundPending ? "Sending…" : `Send ${symbol}`}
            </button>
          </div>

          <div className="mt-3 space-y-1 text-[11px] text-white/75">
            {fundTxHash && (
              <div>
                Tx:{" "}
                <Link
                  href={`https://basescan.org/tx/${fundTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#79ffe1] underline decoration-dotted underline-offset-4"
                >
                  view ↗
                </Link>
              </div>
            )}

            {fundMined && <div className="text-emerald-300 font-semibold">Confirmed ✔ Closing…</div>}

            {(fundMsg || fundErr) && (
              <div className={fundErr ? "text-rose-300" : "text-white/80"}>{fundMsg || getErrText(fundErr)}</div>
            )}

            {!targetOk && <div className="text-rose-200">Invalid target addresses.</div>}
            {!address && <div className="text-amber-200">Tip: connect your wallet to send rewards.</div>}
          </div>

          <div className="mt-3 text-[10px] text-white/45">
            Rewards must already be in your wallet. This sends tokens directly to the pool contract address.
          </div>
        </div>
      </div>
    </div>
  );
}
