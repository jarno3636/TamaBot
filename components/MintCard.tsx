// components/MintCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useRouter } from "next/navigation";
import { TAMABOT_CORE } from "@/lib/abi";
import { formatEther } from "viem";
import { useMiniContext } from "@/lib/useMiniContext";

export default function MintCard() {
  const router = useRouter();
  const { address } = useAccount();
  const { fid: ctxFid, inMini } = useMiniContext();

  // Web fallback: allow manual entry ONLY outside the Farcaster app
  const [fidInput, setFidInput] = useState<string>("");

  // If Mini context provides a FID, prefer it and reflect once for UX text
  useEffect(() => {
    if (ctxFid && !fidInput) setFidInput(String(ctxFid));
  }, [ctxFid, fidInput]);

  const fidFromInput = /^\d+$/.test(fidInput) ? Number(fidInput) : null;
  const effectiveFid = ctxFid ?? fidFromInput;
  const canMint = useMemo(() => !!address && Number.isFinite(effectiveFid as number), [address, effectiveFid]);

  // Read mint fee
  const { data: fee } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "mintFee",
  });
  const feeEth = fee ? formatEther(fee as bigint) : "0";

  // Write: mint with the EFFECTIVE FID (mini context wins)
  const { writeContract, data: hash, error: werr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function onMint() {
    if (!canMint || effectiveFid == null) return;
    writeContract({
      address: TAMABOT_CORE.address,
      abi: TAMABOT_CORE.abi,
      functionName: "mint",
      args: [BigInt(effectiveFid)],
      value: (fee as bigint) ?? 0n,
    });
  }

  // After mint, resolve tokenId and navigate
  const { data: tokenId } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenIdByFID",
    args: [BigInt((effectiveFid as number) || 0)],
    query: { enabled: Boolean(effectiveFid && isSuccess) } as any,
  });

  useEffect(() => {
    const id = tokenId ? Number(tokenId) : 0;
    if (isSuccess && id > 0) router.replace(`/tamabot/${id}`);
  }, [isSuccess, tokenId, router]);

  return (
    <div className="glass glass-pad grid gap-4">
      <h2 className="text-xl md:text-2xl font-extrabold">Mint your TamaBot</h2>

      <div className="pill-row">
        <span className="pill-note pill-note--yellow text-sm">
          Mint fee: {fee ? `${feeEth} ETH` : "…"}
        </span>
      </div>

      {/* Detected FID display */}
      <label className="text-sm opacity-80">
        Detected FID{effectiveFid ? ":" : ""}{" "}
        {effectiveFid ? <b>{effectiveFid}</b> : "…"}
      </label>

      {/* Only show manual entry when NOT in the Farcaster app */}
      {!inMini && (
        <input
          className="px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
          value={fidInput}
          onChange={(e) => setFidInput(e.target.value.trim())}
          placeholder="e.g. 12345"
          inputMode="numeric"
        />
      )}

      {/* Validation hint (web only) */}
      {!inMini && fidInput && fidFromInput === null && (
        <span className="pill-note pill-note--red text-sm">Invalid FID</span>
      )}

      <div className="cta-row">
        <button
          onClick={onMint}
          disabled={!canMint || isPending || confirming}
          className="btn-pill btn-pill--orange"
        >
          {isPending || confirming ? "Minting…" : `Mint (${feeEth} ETH)`}
        </button>
        {hash && (
          <a
            className="btn-ghost"
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View tx on BaseScan
          </a>
        )}
      </div>

      {isSuccess && !tokenId && (
        <div className="text-emerald-400">Mint confirmed. Resolving your token ID…</div>
      )}
      {werr && (
        <div className="text-red-400 text-sm break-words">
          {String(werr.message)}
        </div>
      )}
    </div>
  );
}
