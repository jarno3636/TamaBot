"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isInsideMini, miniReady } from "@/lib/mini";
import { buildTweetUrl, farcasterComposeUrl } from "@/lib/share";

export default function Home() {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    setInside(isInsideMini());
    miniReady();
  }, []);

  // --- Share links (uses pet redirect) ---
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = useMemo(() => `${base}/my`, [base]);
  const tweetURL = useMemo(
    () =>
      buildTweetUrl({
        text: "Here’s my TamaBot 🐣",
        url: shareUrl,
      }),
    [shareUrl]
  );
  const castURL = useMemo(
    () =>
      farcasterComposeUrl({
        text: "Here’s my TamaBot 🐣",
        url: shareUrl,
      }),
    [shareUrl]
  );

  return (
    <main className="min-h-[100svh] bg-deep pb-16">
      <div className="container pt-6 space-y-8">
        {/* ========= HERO ========= */}
        <section className="grid lg:grid-cols-[1fr,1.2fr] gap-6 items-stretch">
          {/* Logo Card */}
          <div className="glass flex items-center justify-center p-6">
            <div className="hero-logo">
              <Image
                src="/logo.PNG"
                alt="TamaBots"
                fill
                priority
                sizes="(max-width:768px) 60vw, 220px"
              />
            </div>
          </div>

          {/* Adopt Card */}
          <div className="glass p-6">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Adopt your TamaBot
            </h1>
            <p className="mt-2 text-white/90 leading-relaxed">
              A Farcaster-aware pet that grows with your vibe. Feed, play,
              clean, rest—then show it off.
            </p>

            {/* Info Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="pill-note pill-note--orange">
                Cute on-chain stats
              </span>
              <span className="pill-note pill-note--blue">IPFS sprites</span>
              <span className="pill-note pill-note--green">
                Lives inside Warpcast
              </span>
              <span className="pill-note pill-note--red">
                Milestone pings ✨
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link href="/mint" className="btn-pill btn-pill--orange">
                Mint your pet
              </Link>
              <Link href="/my" className="btn-pill btn-pill--blue">
                See my pet
              </Link>
            </div>
          </div>
        </section>

        {/* ========= SHARE & QUICK FACTS ========= */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Share your TamaBot */}
          <div className="glass p-6">
            <h2 className="text-xl font-bold mb-2">Share your TamaBot</h2>
            <p className="text-white/90 mb-4">
              Post your pet with rich preview art on Farcaster or X.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href={castURL} className="btn-pill btn-pill--blue">
                Share on Farcaster
              </a>
              <a
                href={tweetURL}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-pill--yellow"
              >
                Share on X
              </a>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Tip: we use your pet page’s Open&nbsp;Graph image for the embed.
            </p>
          </div>

          {/* Quick Facts */}
          <div className="glass p-6">
            <h3 className="text-xl font-bold mb-2">Quick facts</h3>
            <ul className="grid gap-2 text-white/90">
              <li className="pill-note pill-note--blue">One pet per FID</li>
              <li className="pill-note pill-note--orange">Mint on Base</li>
              <li className="pill-note pill-note--green">
                Web & Mini App compatible
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
