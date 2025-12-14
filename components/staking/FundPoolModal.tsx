// components/staking/FundPoolModal.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { base } from "viem/chains";
import { parseUnits } from "viem";
import type { FundTarget, TokenMeta } from "./stakingUtils";
import { getErrText } from "./stakingUtils";

const ERC20_METADATA_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string", name: "" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8", name: "" }] },
] as const;

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const primaryBtn =
  "w-full inline-flex items-center justify-center rounded-full bg-[#79ffe1] text-slate-950 text-sm font-semibold py-2.5 shadow-[0_10px_30px_rgba(121,255,225,0.45)] hover:bg-[#a5fff0] transition-all active:scale-[0.97] active:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/70 disabled:opacity-60 disabled:cursor-not-allowed";

const inputBase =
  "mt-1 w-full max-w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

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

  const { writeContract, data: fundTxHash, error: fundErr } = useWriteContract();
  const { isLoading: fundPending, isSuccess: fundMined } = useWaitForTransactionReceipt({
    hash: fundTxHash,
    chainId: base.id,
  });

  const [fundMsg, setFundMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setFundMsg("");
      setMetaErr(null);
      setTokenMeta(null);
      setAmount(suggestedAmount || "");
    }
  }, [open, suggestedAmount]);

  useEffect(() => {
    if (!open || !fundMined) return;
    const id = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(id);
  }, [open, fundMined, onClose]);

  useEffect(() => {
    if (!open || !target || !publicClient) return;
    const client = publicClient;
    const currentTarget = target;
    let cancelled = false;

    (async () => {
      try {
        setMetaLoading(true);
        setMetaErr(null);

        const [symbol, name, decimals] = await Promise.all([
          client.readContract({ address: currentTarget.rewardToken, abi: ERC20_METADATA_ABI, functionName: "symbol" }),
          client.readContract({ address: currentTarget.rewardToken, abi: ERC20_METADATA_ABI, functionName: "name" }),
          client.readContract({
            address: currentTarget.rewardToken,
            abi: ERC20_METADATA_ABI,
            functionName: "decimals",
          }),
        ]);

        if (!cancelled) {
          setTokenMeta({
            symbol: (symbol as string) || "TOKEN",
            name: (name as string) || "Token",
            decimals: Number(decimals ?? 18),
          });
        }
      } catch {
        if (!cancelled) {
          setMetaErr("Could not load token metadata; using 18 decimals.");
          setTokenMeta({ symbol: "TOKEN", name: "Token", decimals: 18 });
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, target, publicClient]);

  async function handleFund() {
    try {
      setFundMsg("");
      if (!target) return setFundMsg("Missing pool info.");
      if (!address) return setFundMsg("Connect your wallet.");

      const v = amount.trim();
      if (!v) return setFundMsg("Enter an amount.");

      const decimals = tokenMeta?.decimals ?? 18;
      const amountWei = parseUnits(v, decimals);
      if (amountWei <= 0n) return setFundMsg("Amount must be > 0.");

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
  const symbol = tokenMeta?.symbol ?? "TOKEN";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" role="dialog" aria-modal="true">
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

          <h2 className="text-sm font-semibold">Fund pool</h2>
          <p className="mt-1 text-[11px] text-white/60">Send reward tokens directly to the pool contract.</p>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/75 font-mono space-y-2">
            <div className="break-all">
              Pool: <span className="text-white">{target.pool}</span>
            </div>
            <div className="break-all">
              Token: <span className="text-white">{target.rewardToken}</span>
            </div>
          </div>

          <label className="mt-3 block">
            <span className="text-[11px] uppercase tracking-wide text-white/60">Amount ({symbol})</span>
            <input
              type="number"
              min="0"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={suggestedAmount || "e.g. 1000"}
              className={inputBase}
            />
            {metaLoading && <p className="mt-1 text-[11px] text-white/50">Loading token…</p>}
            {metaErr && <p className="mt-1 text-[11px] text-amber-200">{metaErr}</p>}
          </label>

          <div className="mt-4">
            <button type="button" onClick={handleFund} disabled={fundPending} className={primaryBtn}>
              {fundPending ? "Sending…" : `Send ${symbol}`}
            </button>
          </div>

          <div className="mt-3 space-y-1 text-[11px] text-white/70">
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
            {fundMined && <div className="text-emerald-300">Confirmed ✔</div>}
            {(fundMsg || fundErr) && <div className="text-rose-300">{fundMsg || getErrText(fundErr)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
