// app/mint/page.tsx
"use client";

import { Suspense } from "react";
import MintCard from "@/components/MintCard";
import { Card, Pill } from "@/components/UI";
import { useMiniContext } from "@/lib/useMiniContext";

export const dynamic = "force-dynamic";

export default function MintPage() {
  const { inMini, fid } = useMiniContext();

  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <div className="mx-auto max-w-4xl px-5 pt-8">
        <section className="stack">
          <Card className="glass glass-pad">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold">Mint a TamaBot</h1>
              <a href="/about" className="btn-ghost">How it works</a>
            </div>

            <div className="mt-3 pill-row">
              <Pill>One per FID</Pill>
              <Pill>Lives on Base</Pill>
              <Pill>Glows with your vibe</Pill>
            </div>

            <div className="mt-6">
              <Suspense fallback={<span className="pill-note">Loading mint UI…</span>}>
                <MintCard />
              </Suspense>
            </div>

            {/* Optional: gentle hint only if in the app but FID not yet present */}
            {inMini && !fid && (
              <p className="mt-4 text-xs text-white/70">
                Detected Farcaster app. If FID doesn’t appear, close and reopen the mini app to refresh context.
              </p>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
