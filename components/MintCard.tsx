// components/MintCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useRouter } from "next/navigation";
import { base } from "viem/chains";
import { formatEther } from "viem";
import { TAMABOT_CORE } from "@/lib/abi";
import { useMiniContext } from "@/lib/useMiniContext";
import ConnectPill from "@/components/ConnectPill";

/** Call the finalize endpoint the way your API expects: GET with ?id= */
async function tryFinalize(id: number) {
  try {
    const r = await fetch(`/api/tamabot/finalize?id=${id}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));
    return Boolean(r.ok && j?.ok);
  } catch {
    return false;
  }
}

/** Fallback: persona-only pipeline if finalize isn’t wired */
async function generatePersonaAndSave(id: number) {
  try {
    const r1 = await fetch(`/api/pet/extras?action=persona&id=${id}`, { cache: "no-store" });
    const j1 = await r1.json().catch(() => ({} as any));
    const text: string = j1?.text || "";
    if (!text) return;
    await fetch("/api/pet/persona", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, text }),
    });
  } catch {}
}

export default function MintCard() {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const { fid: detectedFid } = useMiniContext();

  // FID field (prefill from Mini)
  const [fid, setFid] = useState<string>("");
  useEffect(() => {
    if (detectedFid && !fid) setFid(String(detectedFid));
  }, [detectedFid, fid]);
  const fidNum = /^\d+$/.test(fid) ? Number(fid) : null;

  // Read mint fee
  const { data: fee } = useReadContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    functionName: "mintFee",
    query: { refetchOnWindowFocus: false },
  });
  const feeEth = fee ? formatEther(fee as bigint) : "…";

  // Check if FID already minted
  const { data: existingTokenId, refetch: refetchExisting } = useReadContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenIdByFID",
    args: fidNum ? [BigInt(fidNum)] : undefined,
    enabled: !!fidNum,
    query: { refetchOnWindowFocus: false },
  });

  // Write: mint
  const { writeContract, data: hash, error: werr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const alreadyMinted =
    typeof existingTokenId === "bigint" && existingTokenId > 0n ? Number(existingTokenId) : null;

  const canMint = useMemo(() => {
    if (!address) return false;
    if (chainId !== base.id) return false;
    if (fidNum === null) return false;
    if (!fee) return false;
    if (alreadyMinted) return false;
    return true;
  }, [address, chainId, fidNum, fee, alreadyMinted]);

  function onMint() {
    if (!canMint || !fee || fidNum === null) return;
    writeContract({
      address: TAMABOT_CORE.address as `0x${string}`,
      abi: TAMABOT_CORE.abi,
      functionName: "mint",                  // payable mint(uint64 fid)
      args: [BigInt(fidNum)],
      value: fee as bigint,                  // ✅ send exact mintFee
      chainId: base.id,
    });
  }

  // After success, resolve token id, finalize art/persona, then route
  const [finalizing, setFinalizing] = useState(false);
  useEffect(() => {
    (async () => {
      if (!isSuccess || fidNum === null) return;
      // Resolve the freshly minted token id
      const res = await refetchExisting();
      const idBn = res?.data as bigint | undefined;
      const id = idBn && idBn > 0n ? Number(idBn) : 0;
      if (!id) return;

      setFinalizing(true);
      const didFinalize = await tryFinalize(id);
      if (!didFinalize) {
        await generatePersonaAndSave(id);
      }
      setFinalizing(false);
      router.replace(`/tamabot/${id}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const disabledReason = !address
    ? "Connect a wallet"
    : chainId !== base.id
    ? "Switch to Base"
    : fidNum === null
    ? "Enter a valid FID"
    : alreadyMinted
    ? `FID already minted (token #${alreadyMinted})`
    : undefined;

  return (
    <div className="glass glass-pad grid gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-extrabold">Mint your TamaBot</h2>
        <span className="pill-note pill-note--yellow text-sm">
          Mint fee: {fee ? `${feeEth} ETH` : "…"}
        </span>
      </div>

      <label className="text-sm opacity-80">
        Detected FID{fid ? ":" : ""} {fid ? <b>{fid}</b> : "—"}
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
      {alreadyMinted && (
        <div className="text-emerald-400 text-sm">
          This FID is already minted (token #{alreadyMinted}).
        </div>
      )}

      {!address ? (
        <div className="mt-1">
          <ConnectPill />
          <p className="mt-2 text-sm text-white/70">Connect on Base to mint.</p>
        </div>
      ) : (
        <div className="cta-row" style={{ marginTop: 4 }}>
          <button
            onClick={onMint}
            disabled={!canMint || isPending || confirming || finalizing}
            className="btn-pill btn-pill--orange"
            title={disabledReason}
            aria-disabled={!canMint || isPending || confirming || finalizing}
          >
            {finalizing
              ? "Finalizing…"
              : isPending || confirming
              ? "Minting…"
              : fee
              ? `Mint (${feeEth} ETH)`
              : "Mint"}
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

      {werr && <div className="text-red-400 text-sm break-words">{String(werr.message)}</div>}
    </div>
  );
}
