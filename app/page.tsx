"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isInsideMini, miniReady, miniSignin, miniAddApp } from "@/lib/mini";

export default function Home() {
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setInside(isInsideMini()); miniReady(); }, []);
  const onSignin    = async () => { setBusy(true); try { await miniSignin(); } finally { setBusy(false); } };
  const onSubscribe = async () => { setBusy(true); try { await miniAddApp(); } finally { setBusy(false); } };

  return (
    <main className="min-h-[100svh] bg-deep space-y-6 pb-16">
      <div className="mx-auto max-w-6xl px-5 pt-6">
        {/* HERO: logo in its own glass card */}
        <section className="grid lg:grid-cols-[1fr,1.2fr] gap-6 items-stretch">
          <div className="glass p-5 flex items-center justify-center">
            <div className="relative w-full max-w-[340px] aspect-[1/1] mx-auto">
              <Image
                src="/logo.PNG"
                alt="TamaBots"
                fill
                priority
                className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,.45)] pointer-events-none"
                sizes="(max-width:768px) 60vw, 340px"
              />
            </div>
          </div>

          <div className="glass p-6">
            <h1 className="text-3xl md:text-4xl font-extrabold">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90">
              A Farcaster-aware pet on <b>Base</b>. Your daily vibe levels it up. Feed, play, clean, rest.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill>On-chain stats</Pill>
              <Pill>IPFS sprites</Pill>
              <Pill>Mini App in Warpcast</Pill>
              <Pill>Milestone pings</Pill>
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
              <Link href="/mint" className="btn-pill">Mint yours</Link>
              <Link href="/my" className="btn-ghost">My Pet</Link>
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

        {/* Secondary section */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6">
            <div className="rounded-2xl h-56 md:h-64
              bg-[radial-gradient(circle_at_30%_30%,#22d3ee2e,transparent_60%),radial-gradient(circle_at_80%_70%,#f59e0b2e,transparent_60%)]
              grid place-items-center text-center px-6">
              <p className="text-lg font-semibold text-white/95">
                Share a cast with your mint link—rich embeds open right in Warpcast’s mini overlay.
              </p>
            </div>
            <p className="mt-3 text-sm text-white/80">
              Splash screens auto-hide via <code>actions.ready()</code>.
            </p>
          </div>

          <div className="glass p-6">
            <h3 className="text-xl font-bold mb-2">Why Base?</h3>
            <ul className="grid gap-2 text-white/90">
              <li className="pill-note">Low fees = more playtime</li>
              <li className="pill-note">Fast finality for smooth actions</li>
              <li className="pill-note">Great wallet & dev tooling</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

/* micro components to keep this file self-contained */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-sm bg-white/15 border border-white/25 backdrop-blur">
      {children}
    </span>
  );
}
