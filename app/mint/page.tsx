"use client";
import { Suspense } from "react";
import MintCard from "@/components/MintCard";
import { Card, Pill } from "@/components/UI";

export const dynamic = "force-dynamic";

export default function MintPage() {
  return (
    <main className="mint-bg min-h-[100svh] pb-16">
      <div className="mx-auto max-w-4xl px-5 pt-8">
        <Card className="border-white/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold">Mint a TamaBot</h1>
            <a href="/about" className="btn-ghost">How it works</a>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>One per FID</Pill>
            <Pill>Lives on Base</Pill>
            <Pill>Glows with your vibe</Pill>
          </div>

          <div className="mt-6">
            <Suspense fallback={<span className="badge">Loading mint UI…</span>}>
              <MintCard />
            </Suspense>
          </div>
        </Card>
      </div>
    </main>
  );
}
