"use client";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import FarcasterLogin from "@/components/FarcasterLogin";
import { useRouter } from "next/navigation";
import { currentFid } from "@/lib/mini";

export default function MyPetPage() {
  const router = useRouter();
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => { setFid(currentFid()); }, []);

  const { data: tokenId } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "tokenIdByFID",
    args: [BigInt(fid || 0)],
    query: { enabled: Boolean(fid) } as any
  });

  useEffect(() => {
    const id = Number(tokenId || 0);
    if (fid && id > 0) router.replace(`/tamabot/${id}`);
  }, [fid, tokenId, router]);

  const id = Number(tokenId || 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold">My Pet</h1>

        {!fid && (
          <div className="mt-4">
            <FarcasterLogin onLogin={setFid} />
          </div>
        )}

        {fid && id === 0 && (
          <div className="mt-5">
            <p className="text-zinc-700">No pet found for FID <b>{fid}</b>.</p>
            <a href="/mint" className="btn-pill mt-3 inline-block">Mint your TamaBot</a>
          </div>
        )}

        <p className="mt-6 text-sm text-zinc-600">
          Inside Warpcast, your FID auto-detects and we deep-link straight to your pet.
        </p>
      </div>
    </main>
  );
}
