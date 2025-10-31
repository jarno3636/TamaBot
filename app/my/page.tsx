"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import FarcasterLogin from "@/components/FarcasterLogin";
import { useRouter } from "next/navigation";
import { currentFid } from "@/lib/mini";
import { Card, Pill } from "@/components/UI";

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
    query: { enabled: Boolean(fid) } as any,
  });

  useEffect(() => {
    const id = Number(tokenId || 0);
    if (fid && id > 0) router.replace(`/tamabot/${id}`);
  }, [fid, tokenId, router]);

  const id = Number(tokenId || 0);

  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <section className="stack">
          <Card className="glass glass-pad">
            <h1 className="text-2xl md:text-3xl font-extrabold">My Pet</h1>

            <div className="mt-3 pill-row">
              <Pill>Auto-detect inside Farcaster</Pill>
              <Pill>Jump to your pet</Pill>
            </div>

            {!fid && (
              <div className="mt-5">
                <FarcasterLogin onLogin={setFid} />
              </div>
            )}

            {fid && id === 0 && (
              <div className="mt-6">
                <p className="text-white/90">
                  No pet found for FID <b>{fid}</b>.
                </p>
                <a href="/mint" className="btn-pill btn-pill--orange mt-3 inline-block">
                  Mint your TamaBot
                </a>
              </div>
            )}

            <p className="mt-6 text-sm text-white/80">
              Tip: inside the Farcaster Mini this auto-detects your FID and deep-links to your pet.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
