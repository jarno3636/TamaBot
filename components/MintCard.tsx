"use client";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TAMABOT_CORE } from "@/lib/abi";

export default function MintCard() {
  const { address } = useAccount();
  const [fid, setFid] = useState("");
  const { data: fee } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "mintFee",
  });

  const { writeContract, data: hash, error: werr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const canMint = useMemo(() => !!address && /^\d+$/.test(fid), [address, fid]);

  function onMint() {
    if (!canMint) return;
    writeContract({
      address: TAMABOT_CORE.address,
      abi: TAMABOT_CORE.abi,
      functionName: "mint",
      args: [BigInt(fid)],
      value: BigInt(fee?.toString() || "0"),
    });
  }

  const feeEth = fee ? Number(fee) / 1e18 : 0;

  return (
    <div className="rounded-2xl p-6 border border-white/10 bg-white/5 grid gap-3">
      <h2 className="text-xl font-semibold">Mint your TamaBot</h2>
      <label className="text-sm opacity-80">Farcaster FID</label>
      <input className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
             value={fid} onChange={e=>setFid(e.target.value)} placeholder="e.g. 12345" />
      <button onClick={onMint} disabled={!canMint || isPending || confirming}
              className="px-4 py-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 disabled:opacity-50">
        {isPending || confirming ? "Minting…" : `Mint (${feeEth} ETH)`}
      </button>
      {hash && <a className="text-sm underline" href={`https://basescan.org/tx/${hash}`} target="_blank">View tx</a>}
      {isSuccess && <div className="text-emerald-400">Minted! Open your /tamabot/[id] page.</div>}
      {werr && <div className="text-red-400 text-sm">{String(werr.message).slice(0,160)}…</div>}
    </div>
  );
}
