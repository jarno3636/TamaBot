// app/tamabot/[id]/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import PetCard from "@/components/PetCard";
import { TAMABOT_CORE } from "@/lib/abi";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";

export default function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // Read tokenURI from chain (canonical source)
  const { data: tokenUri } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "tokenURI",
    args: [BigInt(id)],
    query: { enabled: Number.isFinite(id) } as any,
  });

  // Read live on-chain state
  const { data: s } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "getState",
    args: [BigInt(id)],
    query: { enabled: Number.isFinite(id) } as any,
  });

  const state = useMemo(() => {
    if (!s) return null as any;
    const [level, xp, mood, hunger, energy, cleanliness, lastTick, fid] = s as any;
    return {
      level: Number(level),
      xp: Number(xp),
      mood: Number(mood),
      hunger: Number(hunger),
      energy: Number(energy),
      cleanliness: Number(cleanliness),
      lastTick: Number(lastTick),
      fid: Number(fid),
    };
  }, [s]);

  useEffect(() => {
    // Optional: prefetch /my
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TamaBot #{id}</h1>
        <Link
          href="/my"
          className="text-sm rounded-lg bg-purple-600 text-white px-3 py-1 hover:bg-purple-500"
        >
          My Pet
        </Link>
      </div>

      {/* Metadata-rendered card */}
      {typeof tokenUri === "string" ? (
        <PetCard tokenURI={tokenUri} />
      ) : (
        <div className="text-sm opacity-70">Loading metadata…</div>
      )}

      {/* Live on-chain stats */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Live Stats</h2>
        {!state ? (
          <div className="text-sm opacity-70">Fetching on-chain state…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Level" value={state.level} />
            <Stat label="XP" value={state.xp} />
            <Stat label="Mood" value={state.mood} />
            <Stat label="Hunger" value={state.hunger} />
            <Stat label="Energy" value={state.energy} />
            <Stat label="Cleanliness" value={state.cleanliness} />
            <Stat label="FID" value={state.fid} />
            <Stat label="Last Tick (day)" value={state.lastTick} />
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-3">
          Dynamic values decay/boost over time and after actions (feed, play, clean, rest).
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 bg-zinc-50">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-base font-semibold">{String(value)}</div>
    </div>
  );
}
