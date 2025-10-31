"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isInsideMini, miniReady, miniSignin, miniAddApp } from "@/lib/mini";
import { Card, Pill } from "@/components/UI";

export default function Home() {
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setInside(isInsideMini()); miniReady(); }, []);

  const onSignin = async () => { setBusy(true); try { await miniSignin(); } finally { setBusy(false); } };
  const onSubscribe = async () => { setBusy(true); try { await miniAddApp(); } finally { setBusy(false); } };

  return (
    <main className="home-bg min-h-[100svh] pb-16">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <section className="grid lg:grid-cols-2 gap-6">
          <Card className="border-white/20">
            <h1 className="text-3xl md:text-4xl font-extrabold">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90">
              A Farcaster-aware pet on <b>Base</b>. Your daily vibe levels it up. Feed, play, clean, rest.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill>On-chain stats</Pill>
              <Pill>IPFS sprites</Pill>
              <Pill>Mini App inside Warpcast</Pill>
              <Pill>Milestone pings</Pill>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/mint" className="btn-pill">Mint yours</Link>
              <Link href="/my" className="btn-ghost">My Pet</Link>
            </div>

            {inside && (
              <div className="mt-4 flex gap-3">
                <button onClick={onSignin} disabled={busy} className="btn-ghost">{busy ? "Working…" : "Sign in (Warpcast)"}</button>
                <button onClick={onSubscribe} disabled={busy} className="btn-ghost">{busy ? "Working…" : "Subscribe / Add App"}</button>
              </div>
            )}
          </Card>

          <Card>
            <div className="rounded-2xl h-64 bg-[radial-gradient(circle_at_30%_30%,#22d3ee33,transparent_60%),radial-gradient(circle_at_80%_70%,#f59e0b33,transparent_60%)] grid place-items-center text-center px-6">
              <p className="text-lg font-semibold text-white/95">
                Share a cast with your mint link—rich embeds open right in Warpcast’s mini overlay.
              </p>
            </div>
            <p className="mt-3 text-sm text-white/80">
              Splash screens auto-hide via <code>actions.ready()</code>.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
