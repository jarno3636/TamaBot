// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import MintCard from "@/components/MintCard";
import FCSignInButton from "@/components/FCSignInButton";
import SubscribeCallout from "@/components/SubscribeCallout";
import { useAccount } from "wagmi";
import { currentFid, insideMini } from "@/lib/mini";
import Link from "next/link";

export default function HomePage() {
  const { isConnected } = useAccount();
  const [fid, setFid] = useState<number | null>(null);
  const mini = insideMini();

  useEffect(() => {
    setFid(currentFid());
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-10 text-white">
      {/* Hero */}
      <section className="rounded-3xl p-[2px] bg-gradient-to-br from-[#8b5cf6] via-[#06b6d4] to-[#f59e0b] shadow-lg">
        <div className="rounded-3xl bg-[#0a0b10] px-6 py-10 lg:px-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Meet <span className="bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">TamaBot</span>
          </h1>
          <p className="mt-3 text-zinc-300 max-w-2xl">
            Adopt, evolve, and share your on-chain Farcaster pet on Base. Earn XP from your daily social signal and keep your buddy happy with feed, play, clean, and rest.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!fid && <FCSignInButton />}
            <Link href="/my" className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100">
              My Pet
            </Link>
            <Link href="https://warpcast.com/~/channel/tamabot" target="_blank" className="px-4 py-2 rounded-xl bg-[#6ee7b7] text-black font-semibold hover:opacity-90">
              Channel
            </Link>
            {mini && fid && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 border border-white/10">
                in Warpcast • FID {fid}
              </span>
            )}
          </div>

          <div className="mt-6">
            <SubscribeCallout />
          </div>
        </div>
      </section>

      {/* Mint */}
      <section className="grid gap-6">
        <h2 className="text-2xl font-semibold">Mint your TamaBot</h2>
        <div className="rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur">
          {isConnected ? (
            <MintCard />
          ) : (
            <div className="text-zinc-200">
              Connect your wallet to mint. Already minted?{" "}
              <Link href="/my" className="underline">Go to My Pet</Link>.
            </div>
          )}
        </div>
      </section>

      {/* Explainers */}
      <section className="grid md:grid-cols-3 gap-4">
        {[
          { title: "Farcaster-Powered", body: "We read your daily social signal (DSS) via attestation and apply buffs on sync." },
          { title: "On-Chain State", body: "Stats live on Base. Feed, play, clean, or rest to keep your pet thriving." },
          { title: "IPFS Sprites", body: "Each level unlocks a new look. Sprites are pinned and reflected in metadata." },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl p-5 bg-white/5 border border-white/10">
            <div className="text-lg font-semibold">{c.title}</div>
            <div className="text-sm text-zinc-300 mt-1">{c.body}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
