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

  // Share links (route to /my, which redirects to user's pet page)
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = useMemo(() => `${base}/my`, [base]);
  const tweetURL = useMemo(() => buildTweetUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl }), [shareUrl]);
  const castURL  = useMemo(() => farcasterComposeUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl }), [shareUrl]);

  // Quick facts – price & supply from env with friendly fallbacks
  const mintPrice = (process.env.NEXT_PUBLIC_MINT_PRICE || "").trim();
  const maxSupply = (process.env.NEXT_PUBLIC_MAX_SUPPLY || "").trim();
  const priceLabel = mintPrice ? `Mint price: ${mintPrice}` : "Mint price: TBA";
  const supplyLabel = maxSupply ? `Supply: ${maxSupply}` : "Supply: TBA";

  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <div className="container pt-6 stack">
        {/* ===== HERO ===== */}
        <section className="grid lg:grid-cols-[1fr,1.2fr] gap-8 items-stretch">
          {/* Logo card (small & padded) */}
          <div className="glass hero-logo-card">
            <div className="hero-logo-wrap">
              <Image
                src="/logo.PNG"
                alt="TamaBots"
                fill
                priority
                sizes="(max-width:768px) 180px, 200px"
                className="object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Adopt card */}
          <div className="glass glass-pad">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90 leading-relaxed">
              Your Farcaster-aware pet that grows with your vibe. Feed, play, clean, rest—then flex it.
            </p>

            {/* Focused tags with generous spacing */}
            <div className="mt-4 pill-row">
              <span className="pill-note pill-note--green text-[0.95rem]">Lives on Farcaster</span>
              <span className="pill-note pill-note--blue  text-[0.95rem]">Built from your Farcaster stats</span>
            </div>

            {/* CTAs with extra gap from chips */}
            <div className="cta-row">
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
        <section className="grid md:grid-cols-2 gap-8">
          {/* Share */}
          <div className="glass glass-pad">
            <h2 className="text-xl font-bold mb-2">Share your TamaBot</h2>
            <p className="text-white/90 mb-4">Post your pet with rich preview art on Farcaster or X.</p>
            <div className="cta-row mt-0">
              <a href={castURL}  className="btn-pill btn-pill--blue">Share on Farcaster</a>
              <a href={tweetURL} className="btn-pill btn-pill--yellow" target="_blank" rel="noreferrer">Share on X</a>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Tip: we use your pet page’s Open&nbsp;Graph image for the embed.
            </p>
          </div>

          {/* Quick facts (now includes price & supply) */}
          <div className="glass glass-pad">
            <h3 className="text-xl font-bold mb-3">Quick facts</h3>
            <ul className="pill-row text-white/90">
              <li className="pill-note pill-note--blue  text-[0.95rem]">One pet per FID</li>
              <li className="pill-note pill-note--orange text-[0.95rem]">Mint on Base</li>
              <li className="pill-note pill-note--green text-[0.95rem]">Web & Mini App compatible</li>
              <li className="pill-note pill-note--yellow text-[0.95rem]">{priceLabel}</li>
              <li className="pill-note pill-note--red text-[0.95rem]">{supplyLabel}</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
