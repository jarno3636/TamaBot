// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isInsideMini, miniReady } from "@/lib/mini";
import { buildTweetUrl, farcasterComposeUrl } from "@/lib/share";
import FarcasterLogin from "@/components/FarcasterLogin";
import SubscribeCallout from "@/components/SubscribeCallout";

export default function Home() {
  const [inside, setInside] = useState(false);
  useEffect(() => { setInside(isInsideMini()); miniReady(); }, []);

  // Share links (route to /my, which redirects to the user's pet)
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = useMemo(() => `${base}/my`, [base]);
  const tweetURL = useMemo(() => buildTweetUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl }), [shareUrl]);
  const castURL  = useMemo(() => farcasterComposeUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl }), [shareUrl]);

  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <div className="container pt-6 stack">
        {/* ===== HERO ===== */}
        <section className="grid lg:grid-cols-[1fr,1.2fr] gap-6 items-stretch">
          {/* Logo card (smaller, fixed ratio to prevent CLS) */}
          <div className="glass glass-pad flex items-center justify-center">
            <div className="relative mx-auto aspect-[1/1] w-full max-w-[160px] md:max-w-[200px]">
              <Image
                src="/logo.PNG"
                alt="TamaBots"
                fill
                priority
                sizes="(max-width:768px) 160px, 200px"
                className="object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Adopt card (concise) */}
          <div className="glass glass-pad">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90 leading-relaxed">
              Your Farcaster-aware pet that grows with your vibe. Feed, play, clean, rest—then flex it.
            </p>

            {/* Two focused tags with generous spacing */}
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="pill-note pill-note--green text-[0.95rem]">Lives on Farcaster</span>
              <span className="pill-note pill-note--blue  text-[0.95rem]">Built from your Farcaster stats</span>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link href="/mint" className="btn-pill btn-pill--orange">Mint your pet</Link>
              <Link href="/my"   className="btn-pill btn-pill--blue">See my pet</Link>
            </div>

            {inside && (
              <div className="mt-6 space-y-4">
                <FarcasterLogin />
                <SubscribeCallout />
              </div>
            )}
          </div>
        </section>

        {/* ===== SHARE & FACTS ===== */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Share */}
          <div className="glass glass-pad">
            <h2 className="text-xl font-bold mb-2">Share your TamaBot</h2>
            <p className="text-white/90 mb-4">Post your pet with rich preview art on Farcaster or X.</p>
            <div className="flex gap-3 flex-wrap">
              <a href={castURL}  className="btn-pill btn-pill--blue">Share on Farcaster</a>
              <a href={tweetURL} className="btn-pill btn-pill--yellow" target="_blank" rel="noreferrer">Share on X</a>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Tip: we use your pet page’s Open&nbsp;Graph image for the embed.
            </p>
          </div>

          {/* Quick facts */}
          <div className="glass glass-pad">
            <h3 className="text-xl font-bold mb-2">Quick facts</h3>
            <ul className="grid gap-3 text-white/90">
              <li className="pill-note pill-note--blue  text-[0.95rem]">One pet per FID</li>
              <li className="pill-note pill-note--orange text-[0.95rem]">Mint on Base</li>
              <li className="pill-note pill-note--green text-[0.95rem]">Web & Mini App compatible</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
