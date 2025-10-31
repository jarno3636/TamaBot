// app/page.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isInsideMini, miniReady, miniSignin, miniAddApp } from "@/lib/mini";

export default function Home() {
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setInside(isInsideMini()); miniReady(); }, []);

  async function onSignin() {
    setBusy(true);
    try { await miniSignin(); } finally { setBusy(false); }
  }
  async function onSubscribe() {
    setBusy(true);
    try { await miniAddApp(); } finally { setBusy(false); }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-sky-500 via-fuchsia-500 to-amber-400">
      <div className="mx-auto max-w-5xl px-5 py-10 text-white">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow">TamaBot</h1>
          <nav className="flex gap-3">
            <Link href="/my" className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25">My Pet</Link>
            <Link href="/mint" className="px-4 py-2 rounded-xl bg-black/30 hover:bg-black/40">Mint</Link>
          </nav>
        </header>

        <section className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl p-6 bg-black/20 backdrop-blur border border-white/20">
            <h2 className="text-2xl font-bold">Adopt your Farcaster-aware pet</h2>
            <p className="mt-2 text-white/90">
              Your pet evolves daily based on your Farcaster vibe. Feed, play, rest — and flex the glow-up.
            </p>
            <ul className="mt-4 space-y-2 text-white/90 text-sm">
              <li>• On-chain stats on Base</li>
              <li>• IPFS sprites that change as you level</li>
              <li>• Optional notifications for milestones</li>
            </ul>

            <div className="mt-6 flex gap-3">
              {inside ? (
                <>
                  <button
                    onClick={onSignin}
                    disabled={busy}
                    className="px-4 py-2 rounded-2xl bg-white text-black font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "Working…" : "Sign in with Farcaster"}
                  </button>
                  <button
                    onClick={onSubscribe}
                    disabled={busy}
                    className="px-4 py-2 rounded-2xl bg-black/70 border border-white/30 hover:bg-black/60 disabled:opacity-60"
                  >
                    {busy ? "Working…" : "Add App / Enable notifications"}
                  </button>
                </>
              ) : (
                <a
                  href="/mint"
                  className="px-4 py-2 rounded-2xl bg-white text-black font-semibold hover:opacity-90"
                >
                  Open Mint
                </a>
              )}
            </div>
          </div>

          <div className="rounded-3xl p-6 bg-white/15 border border-white/20">
            <div className="aspect-square rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-center p-6">
              <p className="text-white/90">
                Share a cast with your mint link — we render beautiful embeds and launch right inside Warpcast.
              </p>
            </div>
            <p className="mt-3 text-sm text-white/90">
              Tip: first-time users get a splash screen, then your app takes over. We auto-hide the splash via <code>actions.ready()</code>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
