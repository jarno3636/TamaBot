"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import { TAMABOT_CORE } from "@/lib/abi";
import { formatEther } from "viem";

function detectMiniFid(): number | null {
  const mk: any = (globalThis as any).MiniKit;
  return mk?.user?.fid ? Number(mk.user.fid) : null;
}

export default function MintCard() {
  const router = useRouter();
  const qs = useSearchParams();
  const { address } = useAccount();

  // ---------- FID detection ----------
  const [fid, setFid] = useState<string>("");
  useEffect(() => {
    const fromQuery = qs?.get("fid");
    const mini = detectMiniFid();
    if (mini && !fid) setFid(String(mini));
    else if (fromQuery && !fid) setFid(fromQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // only try once we have a fid and either (a) tx confirmed or (b) user reloads page later
    query: { enabled: Boolean(fidNum && isSuccess) } as any,
  });

  useEffect(() => {
    const id = tokenId ? Number(tokenId) : 0;
    if (isSuccess && id > 0) router.replace(`/tamabot/${id}`);
  }, [isSuccess, tokenId, router]);

  return (
    <div className="rounded-2xl p-6 border border-white/10 bg-white/5 grid gap-3">
      <h2 className="text-xl font-semibold">Mint your TamaBot</h2>

      <label className="text-sm opacity-80">Farcaster FID</label>
      <input
        className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
        value={fid}
        onChange={(e) => setFid(e.target.value.trim())}
        placeholder="e.g. 12345"
        inputMode="numeric"
      />

      <div className="text-sm opacity-80">
        Mint fee: {fee ? `${feeEth} ETH` : "…"}
      </div>

      <button
        onClick={onMint}
        disabled={!canMint || isPending || confirming}
        className="px-4 py-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 disabled:opacity-50"
      >
        {isPending || confirming ? "Minting…" : `Mint (${feeEth} ETH)`}
      </button>

      {hash && (
        <a
          className="text-sm underline"
          href={`https://basescan.org/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction
        </a>
      )}

      {isSuccess && !tokenId && (
        <div className="text-emerald-400">
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
