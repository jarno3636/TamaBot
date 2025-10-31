"use client";

import Link from "next/link";
import { useMemo } from "react";
import PetCard from "@/components/PetCard";
import { TAMABOT_CORE } from "@/lib/abi";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";

export default function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  const { data: tokenUri } = useReadContract({
    address: TAMABOT_CORE.address, abi: TAMABOT_CORE.abi, chainId: base.id,
    functionName: "tokenURI", args: [BigInt(id)], query: { enabled: Number.isFinite(id) } as any
  });

  const { data: s } = useReadContract({
    address: TAMABOT_CORE.address, abi: TAMABOT_CORE.abi, chainId: base.id,
    functionName: "getState", args: [BigInt(id)], query: { enabled: Number.isFinite(id) } as any
  });

  const state = useMemo(() => {
    if (!s) return null as any;
    const [level, xp, mood, hunger, energy, cleanliness, lastTick, fid] = s as any;
    return {
      level: Number(level), xp: Number(xp), mood: Number(mood),
      hunger: Number(hunger), energy: Number(energy),
      cleanliness: Number(cleanliness), lastTick: Number(lastTick), fid: Number(fid),
    };
  }, [s]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">TamaBot #{id}</h1>
        <div className="flex gap-2">
          <Link href="/my" className="btn-ghost">My Pet</Link>
          <Link href="/mint" className="btn-pill">Mint another</Link>
        </div>
      </div>

      {typeof tokenUri === "string" ? (
        <div className="card p-4">
          <PetCard tokenURI={tokenUri} />
        </div>
      ) : (
        <div className="card p-4">Loading metadata…</div>
      )}

      <section className="card p-6" style={{background:"linear-gradient(180deg,#ffffff,#fff3e3)"}}>
        <h2 className="text-lg font-bold mb-3">Live Stats</h2>
        {!state ? (
          <div className="text-sm text-zinc-600">Fetching on-chain state…</div>
        ) : (
          <div className="grid-kv">
            <KV k="Level" v={state.level} />
            <KV k="XP" v={state.xp} />
            <KV k="Mood" v={state.mood} />
            <KV k="Hunger" v={state.hunger} />
            <KV k="Energy" v={state.energy} />
            <KV k="Cleanliness" v={state.cleanliness} />
            <KV k="FID" v={state.fid} />
            <KV k="Last Tick (day)" v={state.lastTick} />
          </div>
        )}
        <p className="text-xs text-zinc-600 mt-3">
          Values decay/boost over time and after actions (feed, play, clean, rest).
        </p>
      </section>
    </main>
  );
}

function KV({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="p-3 rounded-xl bg-white border border-black/5">
      <div className="text-xs text-zinc-500">{k}</div>
      <div className="text-base font-semibold">{String(v)}</div>
    </div>
  );
}
