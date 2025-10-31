"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isInsideMini, miniReady, miniSignin, miniAddApp } from "@/lib/mini";

export default function Home() {
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setInside(isInsideMini()); miniReady(); }, []);

  const onSignin = async () => { setBusy(true); try{ await miniSignin(); } finally{ setBusy(false); } };
  const onSubscribe = async () => { setBusy(true); try{ await miniAddApp(); } finally{ setBusy(false); } };

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16">
      {/* Hero */}
      <section className="mt-8 grid lg:grid-cols-2 gap-6">
        <div className="card p-6" style={{background:"linear-gradient(135deg,#ffe0b3,#ffd89e)"}}>
          <h1 className="text-3xl font-extrabold">Adopt your TamaBot</h1>
          <p className="mt-2 text-zinc-800">
            A Farcaster-aware pet on <b>Base</b>. Your daily vibe levels it up. Feed, play, clean, rest.
          </p>
          <ul className="mt-3 text-zinc-800">
            <li>• On-chain stats & IPFS sprites</li>
            <li>• Mini app inside Warpcast</li>
            <li>• Cute cards, glowy pills ✨</li>
          </ul>
          <div className="mt-5 flex gap-3">
            <Link href="/mint" className="btn-pill">Mint yours</Link>
            <Link href="/my" className="btn-ghost">My Pet</Link>
          </div>
          {inside && (
            <div className="mt-4 flex gap-3">
              <button onClick={onSignin} disabled={busy} className="btn-ghost">
                {busy ? "Working…" : "Sign in (Warpcast)"}
              </button>
              <button onClick={onSubscribe} disabled={busy} className="btn-ghost">
                {busy ? "Working…" : "Subscribe / Add App"}
              </button>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="rounded-2xl h-64 bg-[radial-gradient(circle_at_30%_30%,#ffe8c7,transparent_60%),radial-gradient(circle_at_70%_70%,#ffd7a2,transparent_60%)] flex items-center justify-center text-center px-6">
            <p className="text-lg font-semibold text-zinc-800">
              Share your pet with a cast! We render rich embeds and open right in Warpcast’s mini overlay.
            </p>
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            Splash screens auto-hide via <code>actions.ready()</code>.
          </p>
        </div>
      </section>
    </main>
  );
}
