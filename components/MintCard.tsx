// components/MintCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
} from "wagmi";
import { useRouter } from "next/navigation";
import { base } from "viem/chains";
import { formatEther } from "viem";
import { TAMABOT_CORE } from "@/lib/abi";
import { useMiniContext } from "@/lib/useMiniContext";
import ConnectPill from "@/components/ConnectPill";

/** finalize helper (GET /api/tamabot/finalize?id=...) */
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

  // FID
  const [fid, setFid] = useState<string>("");
  useEffect(() => { if (detectedFid && !fid) setFid(String(detectedFid)); }, [detectedFid, fid]);
  const fidNum = /^\d+$/.test(fid) ? Number(fid) : null;

  // Fee
  const { data: fee } = useReadContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    functionName: "mintFee",
    chainId: base.id,
    query: { refetchOnWindowFocus: false },
  });

  // Coerce to a real bigint for all downstream calls
  const feeWei: bigint =
    typeof fee === "bigint" ? fee : fee != null ? BigInt(fee as any) : 0n;

  const feeEth = feeWei > 0n ? formatEther(feeWei) : "…";

  // Already minted?
  const { data: existingTokenId } = useReadContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenIdByFID",
    args: fidNum ? [BigInt(fidNum)] : undefined,
    chainId: base.id,
    query: { refetchOnWindowFocus: false },
  });
  const alreadyMinted =
    typeof existingTokenId === "bigint" && existingTokenId > 0n ? Number(existingTokenId) : null;

  // 🔍 Simulate mint to get exact reason if it would fail
  const canTrySim = Boolean(address && fidNum !== null && feeWei > 0n && !alreadyMinted && chainId === base.id);
  const { data: sim, error: simErr } = useSimulateContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    functionName: "mint",
    args: fidNum ? [BigInt(fidNum)] : undefined,
    value: canTrySim ? feeWei : undefined,
    chainId: base.id,
    query: { enabled: canTrySim, refetchOnWindowFocus: false } as any,
  });

  // Write (from simulation)
  const { writeContract, data: hash, error: werr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const canMint = useMemo(() => {
    if (!address) return false;
    if (chainId !== base.id) return false;
    if (fidNum === null) return false;
    if (feeWei <= 0n) return false;
    if (alreadyMinted) return false;
    if (simErr) return false;
    return true;
  }, [address, chainId, fidNum, feeWei, alreadyMinted, simErr]);

  function onMint() {
    if (!canMint) return;
    if (sim?.request) {
      // ✅ best: use simulated request (has proper value/gas)
      writeContract(sim.request);
    } else {
      // Fallback if simulation didn’t run
      writeContract({
        address: TAMABOT_CORE.address as `0x${string}`,
        abi: TAMABOT_CORE.abi,
        functionName: "mint",
        args: [BigInt(fidNum!)],
        value: feeWei,                 // ✅ ensure value is sent
        chainId: base.id,
      });
    }
  }

  // After success → resolve id → finalize
  const { refetch: refetchExisting } = useReadContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenIdByFID",
    args: fidNum ? [BigInt(fidNum)] : undefined,
    chainId: base.id,
    query: { enabled: false } as any,
  });

  useEffect(() => {
    (async () => {
      if (!isSuccess || fidNum === null) return;
      const res = await refetchExisting();
      const idBn = res?.data as bigint | undefined;
      const id = idBn && idBn > 0n ? Number(idBn) : 0;
      if (!id) return;
      const didFinalize = await tryFinalize(id);
      if (!didFinalize) await generatePersonaAndSave(id);
      router.replace(`/tamabot/${id}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  // Helpful UI messages
  const disabledReason = !address
    ? "Connect a wallet"
    : chainId !== base.id
    ? "Switch to Base"
    : fidNum === null
    ? "Enter a valid FID"
    : alreadyMinted
    ? `FID already minted (token #${alreadyMinted})`
    : simErr
    ? (simErr as any)?.shortMessage || (simErr as any)?.message || "Simulation failed"
    : undefined;

  return (
    <div className="glass glass-pad grid gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-extrabold">Mint your TamaBot</h2>
        <span className="pill-note pill-note--yellow text-sm">
          Mint fee: {feeWei > 0n ? `${feeEth} ETH` : "…"}
        </span>
      </div>

      <label className="text-sm opacity-80">Detected FID{fid ? ":" : ""} {fid ? <b>{fid}</b> : "—"}</label>
      <input
        className="px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
        value={fid}
        onChange={(e) => setFid(e.target.value.trim())}
        placeholder="Enter FID (e.g. 12345)"
        inputMode="numeric"
      />
      {fid && fidNum === null && <span className="pill-note pill-note--red text-sm">Invalid FID</span>}
      {alreadyMinted && (
        <div className="text-emerald-400 text-sm">This FID is already minted (token #{alreadyMinted}).</div>
      )}
      {simErr && (
        <div className="text-red-400 text-sm break-words">
          {String((simErr as any)?.shortMessage || (simErr as any)?.message || simErr)}
        </div>
      )}
      {werr && <div className="text-red-400 text-sm break-words">{String(werr.message)}</div>}

      {!address ? (
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
            {isPending || confirming ? "Minting…" : feeWei > 0n ? `Mint (${feeEth} ETH)` : "Mint"}
          </button>
        </div>
      )}
    </div>
  );
}
