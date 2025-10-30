// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MintCard from "@/components/MintCard";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const [insideFarcaster, setInsideFarcaster] = useState(false);
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => {
    // Detect if inside Warpcast MiniApp
    const ua = navigator.userAgent || "";
    if (/Farcaster|Warpcast/i.test(ua)) setInsideFarcaster(true);

    // Detect FID via MiniKit or cookie
    const mk: any = (globalThis as any).MiniKit;
    if (mk?.user?.fid) setFid(Number(mk.user.fid));
    else {
      const m = document.cookie.match(/(?:^| )fid=([^;]+)/);
      if (m) setFid(Number(decodeURIComponent(m[1])));
    }
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-12">
      {/* Hero section */}
      <section className="text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/og.png"
            alt="TamaBot Logo"
            width={180}
            height={180}
            className="rounded-2xl shadow-md"
          />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text">
          TamaBot
        </h1>

        <p className="max-w-2xl mx-auto text-zinc-600">
          Adopt, evolve, and share your on-chain Farcaster pet — powered by Base.
          Feed, clean, and vibe with your AI companion right from Warpcast or web.
        </p>

        {insideFarcaster && fid && (
          <div className="text-sm text-purple-600">
            Detected Farcaster user <strong>FID {fid}</strong>
          </div>
        )}
      </section>

      {/* Mint section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-center">Start Your Journey</h2>
        {isConnected ? (
          <div className="flex justify-center">
            <MintCard />
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-zinc-600 mb-3">
              Connect your wallet to mint your first TamaBot.
            </p>
            <p className="text-sm">
              Or, if you already have one, visit{" "}
              <Link href="/my" className="text-purple-600 underline">
                My Pet
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* Learn more / community links */}
      <section className="text-center space-y-4 pt-10 border-t border-zinc-200">
        <h3 className="text-xl font-semibold">Join the Community</h3>
        <p className="text-sm text-zinc-600 max-w-2xl mx-auto">
          Follow updates, share your pet’s evolution, and earn XP for creative vibes.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="https://warpcast.com/~/channel/tamabot"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500"
          >
            Warpcast Channel
          </a>
          <a
            href="https://x.com/tamabot_base"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700"
          >
            X / Twitter
          </a>
          <a
            href="https://base.org"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500"
          >
            Powered by Base
          </a>
        </div>
      </section>
    </main>
  );
}
