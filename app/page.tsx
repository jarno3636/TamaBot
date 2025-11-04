// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { buildTweetUrl, farcasterComposeUrl } from "@/lib/share";
import FarcasterLogin from "@/components/FarcasterLogin";
import SubscribeCallout from "@/components/SubscribeCallout";
import { useMiniContext } from "@/lib/useMiniContext";

export default function Home() {
  const { inMini } = useMiniContext();

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = useMemo(() => `${base}/my`, [base]);
  const tweetURL = useMemo(() => buildTweetUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl }), [shareUrl]);
  const castURL  = useMemo(() => farcasterComposeUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl }), [shareUrl]);

  const mintPrice = (process.env.NEXT_PUBLIC_MINT_PRICE || "").trim();
  const maxSupply = (process.env.NEXT_PUBLIC_MAX_SUPPLY || "").trim();
  const priceLabel = mintPrice ? `Mint price: ${mintPrice}` : "Mint price: TBA";
  const supplyLabel = maxSupply ? `Supply: ${maxSupply}` : "Supply: TBA";

  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <div className="container pt-6">
        {/* ===== HERO ===== */}
        <section className="card-stack" style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
          {/* Logo card */}
          <div className="glass glass-pad" style={{ position:'relative' }}>
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

            <div className="pill-row" style={{ marginTop: 14 }}>
              <span className="pill-note pill-note--green text-[0.95rem]">Lives on Farcaster</span>
              <span className="pill-note pill-note--blue  text-[0.95rem]">Built from your Farcaster stats</span>
            </div>

            <div className="cta-row">
              <Link href="/mint" className="btn-pill btn-pill--orange">Mint your pet</Link>
              <Link href="/my"   className="btn-pill btn-pill--blue">See my pet</Link>
            </div>

            {inMini && (
              <div style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 12 }}><FarcasterLogin /></div>
                <SubscribeCallout />
              </div>
            )}
          </div>
        </section>

        {/* ===== SHARE & FACTS ===== */}
        <section style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }} className="card-stack">
          {/* Share */}
          <div className="glass glass-pad">
            <h2 className="text-xl font-bold mb-2">Share your TamaBot</h2>
            <p className="text-white/90 mb-4">Post your pet with rich preview art on Farcaster or X.</p>
            <div className="cta-row" style={{ marginTop: 0 }}>
              <a href={castURL}  className="btn-pill btn-pill--blue">Share on Farcaster</a>
              <a href={tweetURL} className="btn-pill btn-pill--yellow" target="_blank" rel="noreferrer">Share on X</a>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Tip: we use your pet page’s Open&nbsp;Graph image for the embed.
            </p>
          </div>

          {/* Quick facts */}
          <div className="glass glass-pad">
            <h3 className="text-xl font-bold mb-3">Quick facts</h3>
            <ul className="pill-row">
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
