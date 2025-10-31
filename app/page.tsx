"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isInsideMini, miniReady, miniSignin, miniAddApp } from "@/lib/mini";

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="pill-note">{children}</span>;
}

export default function Home() {
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setInside(isInsideMini()); miniReady(); }, []);

  const onSignin    = async () => { setBusy(true); try { await miniSignin(); } finally { setBusy(false); } };
  const onSubscribe = async () => { setBusy(true); try { await miniAddApp(); } finally { setBusy(false); } };

  return (
    <main className="min-h-[100svh] bg-deep pb-16">
      <div className="container pt-6">
        {/* HERO */}
        <section className="grid lg:grid-cols-[1fr,1.2fr] gap-6 items-stretch">
          {/* Logo card */}
          <div className="glass p-5 flex items-center justify-center">
            <div className="hero-logo">
              <Image src="/logo.PNG" alt="TamaBots" fill priority sizes="(max-width:768px) 60vw, 340px" />
            </div>
          </div>

          {/* Copy + CTAs */}
          <div className="glass p-6">
            <h1 className="text-3xl md:text-4xl font-extrabold">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90">
              Your Farcaster-aware pet that grows with your vibe. Feed, play, clean, rest—then show it off.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Tag>Cute on-chain stats</Tag>
              <Tag>IPFS sprites</Tag>
              <Tag>Lives inside Warpcast</Tag>
              <Tag>Milestone pings ✨</Tag>
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
              <Link href="/mint" className="btn-pill">Mint your pet</Link>
              <Link href="/my" className="btn-ghost">See my pet</Link>
            </div>

            {inside && (
              <div className="mt-4 flex gap-3 flex-wrap">
                <button onClick={onSignin} disabled={busy} className="btn-ghost">
                  {busy ? "Working…" : "Sign in (Warpcast)"}
                </button>
                <button onClick={onSubscribe} disabled={busy} className="btn-ghost">
                  {busy ? "Working…" : "Subscribe / Add App"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SECONDARY */}
        <section className="section grid md:grid-cols-2 gap-6">
          <div className="glass p-6">
            <div className="rounded-2xl h-56 md:h-64 grid place-items-center text-center px-6
                bg-[radial-gradient(circle_at_30%_30%,#22d3ee2e,transparent_60%),radial-gradient(circle_at_80%_70%,#f59e0b2e,transparent_60%)]">
              <p className="text-lg font-semibold text-white/95">
                Share your mint link—rich embeds open right in Warpcast’s mini overlay.
              </p>
            </div>
            <p className="mt-3 text-sm text-white/80">Splash screens auto-hide via <code>actions.ready()</code>.</p>
          </div>

          <div className="glass p-6">
            <h3 className="text-xl font-bold mb-2">Quick facts</h3>
            <ul className="grid gap-2 text-white/90">
              <li className="pill-note">One pet per FID</li>
              <li className="pill-note">Mint on Base</li>
              <li className="pill-note">Playable on web & Mini App</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
