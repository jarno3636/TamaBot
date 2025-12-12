// components/staking/FundPoolModal.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { base } from "viem/chains";
import { parseUnits } from "viem";
import type { FundTarget, TokenMeta } from "./stakingUtils";
import { getErrText } from "./stakingUtils";

// Minimal ERC-20 metadata ABI (used by modal on-chain)
const ERC20_METADATA_ABI = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
  },
] as const;

// Minimal ERC-20 transfer ABI
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

  const {
    writeContract: writeFund,
    data: fundTxHash,
    error: fundErr,
  } = useWriteContract();

  const { isLoading: fundPending, isSuccess: fundMined } =
    useWaitForTransactionReceipt({
      hash: fundTxHash,
      chainId: base.id,
    });

  const [fundMsg, setFundMsg] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFundMsg("");
      setMetaErr(null);
      setTokenMeta(null);
      setAmount(suggestedAmount || "");
    }
  }, [open, suggestedAmount]);

  // Auto-close once tx is mined
  useEffect(() => {
    if (!open || !fundMined) return;
    const id = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(id);
  }, [open, fundMined, onClose]);

  // Load token metadata (on-chain)
  useEffect(() => {
    if (!open || !target || !publicClient) return;

    const client = publicClient; // ✅ TS now knows it's defined
    const currentTarget = target;
    let cancelled = false;

    async function load() {
      try {
        setMetaLoading(true);
        setMetaErr(null);

        const [symbol, name, decimals] = await Promise.all([
          client.readContract({
            address: currentTarget.rewardToken,
            abi: ERC20_METADATA_ABI,
            functionName: "symbol",
          }),
          client.readContract({
            address: currentTarget.rewardToken,
            abi: ERC20_METADATA_ABI,
            functionName: "name",
          }),
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
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, target, publicClient]);

  async function handleFund() {
    try {
      setFundMsg("");

      if (!target) return setFundMsg("Missing pool info.");
      if (!address) return setFundMsg("Connect your wallet to fund the pool.");

      const v = amount.trim();
      if (!v) return setFundMsg("Enter an amount to send.");

      const decimals = tokenMeta?.decimals ?? 18;
      const amountWei = parseUnits(v, decimals);
      if (amountWei <= 0n) return setFundMsg("Amount must be greater than 0.");

      await writeFund({
        address: target.rewardToken,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [target.pool, amountWei],
        chainId: base.id,
      });

      setFundMsg("Funding transaction submitted. Confirm in your wallet.");
    } catch (e) {
      setFundMsg(getErrText(e));
    }
  }

  if (!open || !target) return null;

  const symbol = tokenMeta?.symbol ?? "TOKEN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#050815] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-xs text-white/60 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-sm font-semibold mb-1">Fund staking pool</h2>
        <p className="text-[11px] text-white/60 mb-3">
          Send reward tokens directly to the pool contract on Base.
        </p>

        <div className="space-y-2 text-[11px] text-white/70 font-mono mb-3">
          <div className="break-all">
            Pool: <span className="text-white">{target.pool}</span>
          </div>
          <div className="break-all">
            Reward token:{" "}
            <span className="text-white">{target.rewardToken}</span>
          </div>
        </div>

        <label className="block mb-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-white/60">
            Amount to send ({symbol})
          </span>
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={suggestedAmount || "e.g. 1000"}
            className={inputBase}
          />
          {metaLoading && (
            <p className="mt-1 text-[11px] text-white/50">
              Loading token info…
            </p>
          )}
          {metaErr && (
            <p className="mt-1 text-[11px] text-amber-200">{metaErr}</p>
          )}
        </label>

        <button
          type="button"
          onClick={handleFund}
          disabled={fundPending}
          className={primaryBtn}
        >
          {fundPending ? "Sending…" : `Send ${symbol} to pool`}
        </button>

        <div className="mt-3 space-y-1 text-[11px] text-white/65">
          {fundTxHash && (
            <div>
              Funding tx:{" "}
              <Link
                href={`https://basescan.org/tx/${fundTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#79ffe1] underline decoration-dotted underline-offset-4"
              >
                view on Basescan ↗
              </Link>
            </div>
          )}
          {fundMined && (
            <div className="text-emerald-300">
              Funding confirmed ✔ (closing…)
            </div>
          )}
          {(fundMsg || fundErr) && (
            <div className="text-rose-300">{fundMsg || getErrText(fundErr)}</div>
          )}

          {!fundMined && (
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
