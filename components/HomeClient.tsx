"use client";

import Link from "next/link";
import Image from "next/image";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

export default function HomeClient() {
  // Newer onchainkit: no `isMiniApp` prop on the hook result.
  const { context } = useMiniKit();
  const isMini = !!context; // true when running inside a Mini App / embedded

  return (
    <main className="min-h-[100svh] bg-[#0a0b10] text-white pb-16">
      <div className="container pt-6">
        <section className="grid gap-4">
          <div className="glass glass-pad relative flex justify-center">
            <Image src="/logo.png" alt="TamaBot" width={200} height={200} priority />
          </div>

          <div className="glass glass-pad">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90">Your Farcaster-aware pet that grows with your vibe.</p>

            <div className="cta-row mt-4">
              <Link href="/mint" className="btn-pill btn-pill--orange">Mint your pet</Link>
              <Link href="/my"   className="btn-pill btn-pill--blue">See my pet</Link>
            </div>

            {isMini && (
              <p className="mt-3 text-sm text-white/75">
                Connected as {context?.user?.username ? `@${context.user.username}` : `FID ${context?.user?.fid ?? "—"}`}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
