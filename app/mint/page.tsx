// app/mint/page.tsx
"use client";

import { Suspense } from "react";
import MintCard from "@/components/MintCard";

// Avoid static prerender for this route
export const dynamic = "force-dynamic";

export default function MintPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="card p-6" style={{ background: "linear-gradient(180deg,#ffffff,#fff3e3)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold">Mint a TamaBot</h1>
          <a href="/about" className="btn-ghost">How it works</a>
        </div>

        <p className="mt-2 text-zinc-700">
          One pet per Farcaster FID. A small mint fee on Base covers care & sprites.
        </p>

        <div className="mt-5">
          <Suspense fallback={<div className="badge">Loading mint UI…</div>}>
            <MintCard />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
