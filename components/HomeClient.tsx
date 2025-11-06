"use client";

import Link from "next/link";
import Image from "next/image";
import { useMiniContext } from "@/lib/useMiniContext";

export default function HomeClient() {
  const { user, fid, inMini } = useMiniContext();
  const isMini = inMini;

  return (
    <main className="min-h-[100svh] bg-[#0a0b10] text-white pb-16">
      <div className="container pt-6">
        <section className="grid gap-4">
          <div className="glass glass-pad relative flex justify-center">
            <Image src="/logo.PNG" alt="TamaBot" width={200} height={200} priority />
          </div>

          <div className="glass glass-pad">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90">
              Your Farcaster-aware pet that grows with your vibe.
            </p>

            <div className="cta-row mt-4">
              <Link href="/mint" className="btn-pill btn-pill--orange">Mint your pet</Link>
              <Link href="/my"   className="btn-pill btn-pill--blue">See my pet</Link>
            </div>

            {isMini && (
              <p className="mt-3 text-sm text-white/75">
                Connected as {user?.username ? `@${user.username}` : `FID ${fid ?? "—"}`}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
