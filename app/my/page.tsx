"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import FarcasterLogin from "@/components/FarcasterLogin";
import { useRouter } from "next/navigation";

function getSavedFid(): number | null {
  const m = document.cookie.match(new RegExp("(^| )fid=([^;]+)"));
  const c = m ? decodeURIComponent(m[2]) : (localStorage.getItem("fid") || "");
  const n = Number(c);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function MyPetPage() {
  const router = useRouter();
  const [fid, setFid] = useState<number | null>(null);

  // Detect fid from MiniKit first
  useEffect(() => {
    const mk: any = (globalThis as any).MiniKit;
    if (mk?.user?.fid) {
      const f = Number(mk.user.fid);
      setFid(f);
      localStorage.setItem("fid", String(f));
      document.cookie = `fid=${f}; path=/; samesite=lax`;
      return;
    }
    const saved = getSavedFid();
    if (saved) setFid(saved);
  }, []);

  const { data: tokenId } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "tokenIdByFID",
    args: [BigInt(fid || 0)],
    query: { enabled: Boolean(fid) } as any
  });

  useEffect(() => {
    if (!fid) return;
    const id = Number(tokenId || 0);
    if (id > 0) {
      router.replace(`/tamabot/${id}`);
    }
  }, [fid, tokenId, router]);

  const id = Number(tokenId || 0);
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Pet</h1>

      {!fid && (
        <div className="rounded-xl border p-4">
          <FarcasterLogin onLogin={setFid} />
        </div>
      )}

      {fid && id === 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="text-zinc-800">No pet found for FID <b>{fid}</b>.</div>
          <a
            href="/"
            className="inline-block rounded-lg bg-black text-white px-4 py-2"
          >
            Mint your TamaBot
          </a>
        </div>
      )}

      <div className="text-sm text-zinc-500">
        Tip: inside Warpcast MiniApp this will auto-detect your FID and jump straight to your pet.
      </div>
    </main>
  );
}
