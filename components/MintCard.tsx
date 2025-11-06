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
import ConnectPill from "@/components/ConnectPill";

async function generatePersonaAndSave(id: number) {
  try {
    // 1) Ask the server to generate persona text (uses OPENAI_API_KEY on server)
    const r1 = await fetch(`/api/pet/extras?action=persona&id=${id}`, { cache: "no-store" });
    const j1 = await r1.json().catch(() => ({} as any));
    const text: string = j1?.text || "";

    if (!text) return;

    // 2) Persist to Supabase via our save endpoint
    await fetch("/api/pet/persona", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, text }),
    });
  } catch {
    // non-fatal; user still gets redirected
  }
}

export default function MintCard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { fid: detectedFid } = useMiniContext();

  // --- FID handling ---------------------------------------------------------
  const [fid, setFid] = useState<string>("");
  useEffect(() => {
    if (detectedFid && !fid) setFid(String(detectedFid));
  }, [detectedFid, fid]);

  const fidNum = /^\d+$/.test(fid) ? Number(fid) : null;
  const canMint = useMemo(
    () => Boolean(isConnected && fidNum !== null),
    [isConnected, fidNum],
  );

  // --- Read contract data ---------------------------------------------------
  const { data: fee } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "mintFee",
  });
  const feeEth = fee ? formatEther(fee as bigint) : "0";

  // --- Mint write + receipt -------------------------------------------------
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

  // After success, resolve token id
  const { data: tokenId } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenIdByFID",
    args: [BigInt(fidNum || 0)],
    query: { enabled: Boolean(fidNum && isSuccess) } as any,
  });

  useEffect(() => {
    const id = tokenId ? Number(tokenId) : 0;
    if (isSuccess && id > 0) {
      // Fire-and-forget persona generation + save;
      // don't block the redirect.
      generatePersonaAndSave(id);
      router.replace(`/tamabot/${id}`);
    }
  }, [isSuccess, tokenId, router]);

  // --- UI -------------------------------------------------------------------
  const disabledReason = !isConnected
    ? "Connect a wallet"
    : fidNum === null
    ? "Enter a valid FID"
    : undefined;

  return (
    <div className="glass glass-pad grid gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-extrabold">Mint your TamaBot</h2>
        <span className="pill-note pill-note--yellow text-sm">
          Mint fee: {fee ? `${feeEth} ETH` : "…"}
        </span>
      </div>

      {/* FID */}
      <label className="text-sm opacity-80">
        Detected FID{fid ? ":" : ""} {fid ? <b>{fid}</b> : "…"}
      </label>
      <input
        className="px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
        value={fid}
        onChange={(e) => setFid(e.target.value.trim())}
        placeholder="Enter FID (e.g. 12345)"
        inputMode="numeric"
      />
      {fid && fidNum === null && (
        <span className="pill-note pill-note--red text-sm">Invalid FID</span>
      )}

      {/* Wallet CTA / Mint CTA */}
      {!isConnected ? (
        <div className="mt-1">
          <ConnectPill />
          <p className="mt-2 text-sm text-white/70">Connect on Base to mint.</p>
        </div>
      ) : (
        <div className="cta-row" style={{ marginTop: 4 }}>
          <button
            onClick={onMint}
            disabled={!canMint || isPending || confirming}
            className="btn-pill btn-pill--orange"
            title={disabledReason}
            aria-disabled={!canMint || isPending || confirming}
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
              View tx
            </a>
          )}
        </div>
      )}

      {/* Status + errors */}
      {isSuccess && !tokenId && (
        <div className="text-emerald-400 text-sm">
          Mint confirmed. Resolving your token ID…
        </div>
      )}
      {werr && (
        <div className="text-red-400 text-sm break-words">
          {String(werr.message)}
        </div>
      )}
    </div>
  );
}
