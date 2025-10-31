// app/tamabot/[id]/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import PetCard from "@/components/PetCard";
import { TAMABOT_CORE } from "@/lib/abi";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { Card, Pill } from "@/components/UI";
import { composeCast, openUrl } from "@/lib/mini";
import { buildTweetUrl } from "@/lib/share";

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
    return { level: Number(level), xp: Number(xp), mood: Number(mood), hunger: Number(hunger),
      energy: Number(energy), cleanliness: Number(cleanliness), lastTick: Number(lastTick), fid: Number(fid) };
  }, [s]);

  // Share helpers
  const shareUrl  = (typeof window !== "undefined") ? window.location.href : "";
  const shareText = `Meet my TamaBot #${id} — evolving with my Farcaster vibe.`;

  function shareFarcaster() {
    // Use Mini composer when available; fall back to warpcast web
    try { composeCast(`${shareText} ${shareUrl}`); }
    catch { openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`); }
  }

  function shareX() {
    openUrl(buildTweetUrl(shareText, shareUrl));
  }

  return (
    <main className="pet-bg min-h-[100svh] pb-16">
      <div className="mx-auto max-w-5xl px-5 pt-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold">TamaBot #{id}</h1>
          <div className="flex gap-2">
            <Link href="/my" className="btn-pill btn-pill--blue">My Pet</Link>
            <Link href="/mint" className="btn-pill btn-pill--orange">Mint another</Link>
          </div>
        </div>

        <Card>{typeof tokenUri === "string" ? <PetCard tokenURI={tokenUri} /> : "Loading metadata…"} </Card>

        {/* Share card */}
        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            <Pill c="green">Share your TamaBot</Pill>
            <Pill>Rich preview enabled</Pill>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={shareFarcaster} className="btn-pill btn-pill--blue">Share on Farcaster</button>
            <button onClick={shareX}         className="btn-pill btn-pill--yellow">Share on X</button>
          </div>
          <p className="text-xs text-white/70 mt-3">
            We set OpenGraph/Twitter tags for this page so your pet’s image and title appear in the embed.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            <Pill>Live stats</Pill>
            <Pill>Updates over time</Pill>
          </div>
          {!state ? (
            <div className="text-sm text-white/80">Fetching on-chain state…</div>
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
          <p className="text-xs text-white/75 mt-3">
            Values decay/boost after actions (feed, play, clean, rest) and with time.
          </p>
        </Card>
      </div>
    </main>
  );
}

function KV({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="p-3 rounded-xl bg-white/8 border border-white/15">
      <div className="text-xs text-white/70">{k}</div>
      <div className="text-base font-semibold">{String(v)}</div>
    </div>
  );
}
