// components/MintCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import { TAMABOT_CORE } from "@/lib/abi";
import { formatEther } from "viem";
import { useFid } from "@/lib/useFid";

export default function MintCard() {
  const router = useRouter();
  const qs = useSearchParams();
  const { address } = useAccount();
  const { fid: detectedFid } = useFid();

  // ---------- FID detection + manual override ----------
  const [fid, setFid] = useState<string>("");

  useEffect(() => {
    const fromQuery = qs?.get("fid");
    if (!fid && detectedFid) setFid(String(detectedFid));
    else if (fromQuery && !fid) setFid(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedFid]);

  const fidNum = /^\d+$/.test(fid) ? Number(fid) : null;
  const canMint = useMemo(() => !!address && fidNum !== null, [address, fidNum]);

  // ---------- Read mint fee ----------
  const { data: fee } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "mintFee",
  });
  const feeEth = fee ? formatEther(fee as bigint) : "0";

  // ---------- Write: mint ----------
  const { writeContract, data: hash, error: werr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function onMint() {
    if (!canMint) return;
    writeContract({
      address: TAMABOT_CORE.address,
      abi: TAMABOT_CORE.abi,
      functionName: "mint",
      args: [BigInt(fidNum!)],
      value: (fee as bigint) ?? 0n,
    });
  }

  // ---------- After mint: resolve tokenId and route ----------
  const { data: tokenId } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenIdByFID",
    args: [BigInt(fidNum || 0)],
    query: { enabled: Boolean(fidNum && isSuccess) } as any,
  });

  useEffect(() => {
    const id = tokenId ? Number(tokenId) : 0;
    if (isSuccess && id > 0) router.replace(`/tamabot/${id}`);
  }, [isSuccess, tokenId, router]);

  return (
    <div className="glass glass-pad grid gap-4">
      <h2 className="text-xl md:text-2xl font-extrabold">Mint your TamaBot</h2>

      <label className="text-sm opacity-80">Farcaster FID</label>
      <input
        className="px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
        value={fid}
        onChange={(e) => setFid(e.target.value.trim())}
        placeholder="e.g. 12345"
        inputMode="numeric"
      />

      <div className="pill-row">
        <span className="pill-note pill-note--yellow text-sm">Mint fee: {fee ? `${feeEth} ETH` : "…"}</span>
        {fidNum === null && fid && <span className="pill-note pill-note--red text-sm">Invalid FID</span>}
      </div>

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

      {werr && <div className="text-red-400 text-sm break-words">{String(werr.message)}</div>}
    </div>
  );
}
