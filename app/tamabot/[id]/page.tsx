// app/tamabot/[id]/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PetCard from "@/components/PetCard";
import { TAMABOT_CORE } from "@/lib/abi";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { Card, Pill } from "@/components/UI";
import { composeCast, openInMini } from "@/lib/miniapp";
import { buildTweetUrl } from "@/lib/share";
import { StatMeter } from "@/components/StatMeter";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const validId = Number.isFinite(id) && id > 0;

  // tokenURI (string; no bigint risk)
  const { data: tokenUri, isLoading: loadingUri } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "tokenURI",
    args: [BigInt(validId ? id : 0)],
    query: { enabled: validId } as any,
  });

  // on-chain state (tuple of bigints) -> map to plain numbers in useMemo
  const { data: sRaw, isLoading: loadingState } = useReadContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "getState",
    args: [BigInt(validId ? id : 0)],
    query: { enabled: validId } as any,
  });

  const state = useMemo(() => {
    if (!sRaw) return null;
    const a = sRaw as readonly [
      bigint, // level
      bigint, // xp
      bigint, // mood
      bigint, // hunger
      bigint, // energy
      bigint, // cleanliness
      bigint, // lastTick
      bigint  // fid
    ];
    return {
      level: Number(a[0] ?? 0n),
      xp: Number(a[1] ?? 0n),
      mood: Number(a[2] ?? 0n),
      hunger: Number(a[3] ?? 0n),
      energy: Number(a[4] ?? 0n),
      cleanliness: Number(a[5] ?? 0n),
      lastTick: Number(a[6] ?? 0n),
      fid: Number(a[7] ?? 0n),
    };
  }, [sRaw]);

  // ===== Share helpers =====
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Meet my TamaBot #${validId ? id : ""} — evolving with my Farcaster vibe.`;

  async function shareFarcaster() {
    try {
      const ok = await composeCast({ text: `${shareText} ${shareUrl}` });
      if (ok) return;
    } catch {}
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(
      `${shareText} ${shareUrl}`
    )}`;
    (await openInMini(url)) || window.open(url, "_blank");
  }

  function shareX() {
    const url = buildTweetUrl({ text: shareText, url: shareUrl });
    openInMini(url).then((ok) => {
      if (!ok) window.open(url, "_blank");
    });
  }

  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <div className="mx-auto max-w-5xl px-5 pt-8">
        {!validId ? (
          <section className="stack">
            <Card className="glass glass-pad">
              <h1 className="text-2xl md:text-3xl font-extrabold">TamaBot</h1>
              <p className="mt-2 text-white/80">Invalid token id.</p>
              <div className="cta-row">
                <Link href="/my" className="btn-pill btn-pill--blue">My Pet</Link>
                <Link href="/mint" className="btn-pill btn-pill--orange">Mint a new one</Link>
              </div>
            </Card>
          </section>
        ) : (
          <section className="stack">
            {/* Header + CTAs */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold">TamaBot #{id}</h1>
              <div className="cta-row mt-0">
                <Link href="/my" className="btn-pill btn-pill--blue">My Pet</Link>
                <Link href="/mint" className="btn-pill btn-pill--orange">Mint another</Link>
              </div>
            </div>

            {/* Pet media & metadata */}
            <Card className="glass glass-pad">
              {loadingUri ? (
                <div className="animate-pulse grid gap-3">
                  <div className="w-full aspect-square rounded-xl bg-white/10" />
                  <div className="h-4 w-1/2 rounded bg-white/10" />
                  <div className="h-4 w-1/3 rounded bg-white/10" />
                </div>
              ) : typeof tokenUri === "string" ? (
                <PetCard tokenURI={tokenUri} />
              ) : (
                <div className="text-sm text-white/80">No metadata found.</div>
              )}
            </Card>

            {/* Share */}
            <Card className="glass glass-pad">
              <div className="mb-3 pill-row">
                <Pill>Share your TamaBot</Pill>
                <Pill>Rich preview enabled</Pill>
              </div>
              <div className="cta-row mt-0">
                <button onClick={shareFarcaster} className="btn-pill btn-pill--blue">Share on Farcaster</button>
                <button onClick={shareX} className="btn-pill btn-pill--yellow">Share on X</button>
                <button onClick={copyLink} className="btn-ghost">{copied ? "Copied!" : "Copy link"}</button>
              </div>
              <p className="text-xs text-white/70 mt-3">
                OpenGraph/Twitter tags are set globally; your pet’s media shows in the embed.
              </p>
            </Card>

            {/* Live stats – premium meters */}
            <Card className="glass glass-pad">
              <div className="mb-3 pill-row">
                <Pill>Live stats</Pill>
                <Pill>Updates over time</Pill>
              </div>

              {loadingState && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="grid gap-4">
                      <div className="h-5 rounded bg-white/10 animate-pulse" />
                      <div className="h-5 rounded bg-white/10 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {!loadingState && !state ? (
                <div className="text-sm text-white/80">Fetching on-chain state…</div>
              ) : state ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="grid gap-4">
                    <StatMeter label="Mood"        value={state.mood}        max={100} />
                    <StatMeter label="Hunger"      value={state.hunger}      max={100} />
                  </div>
                  <div className="grid gap-4">
                    <StatMeter label="Energy"      value={state.energy}      max={100} />
                    <StatMeter label="Cleanliness" value={state.cleanliness} max={100} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <KV k="Level" v={state.level} />
                    <KV k="XP" v={state.xp} />
                    <KV k="FID" v={state.fid} />
                    <KV k="Last Tick (day)" v={state.lastTick} />
                  </div>
                </div>
              ) : null}
            </Card>
          </section>
        )}
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
