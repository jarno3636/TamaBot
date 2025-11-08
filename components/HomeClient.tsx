"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useMiniContext } from "@/lib/useMiniContext";

type SupplyResp = {
  ok: boolean;
  chainId: number;
  address: `0x${string}`;
  mintPriceWei: string;
  mintPriceEth: string;
  totalMinted: number;
  maxSupply: number;
};

export default function HomeClient() {
  const { user, fid, inMini } = useMiniContext();
  const [stats, setStats] = useState<SupplyResp | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/basebots/supply", { cache: "no-store" });
        const j: SupplyResp = await r.json();
        if (alive && j?.ok) setStats(j);
      } catch {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, []);

  const mintPrice = stats?.mintPriceEth ?? "0.001";
  const totalMinted = stats?.totalMinted ?? 0;
  const maxSupply = stats?.maxSupply ?? 50000;

  return (
    <main className="min-h-[100svh] bg-[#0a0b10] text-white pb-16">
      <div className="container pt-8 px-5">
        <section className="grid gap-6">
          {/* Logo Card */}
          <div className="glass glass-pad relative flex justify-center">
            <Image
              src="/logo.PNG"
              alt="TamaBot"
              width={200}
              height={200}
              priority
              className="rounded-2xl"
            />
          </div>

          {/* Intro Card */}
          <div className="glass glass-pad">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Adopt your TamaBot
            </h1>
            <p className="mt-2 text-white/90">
              Your Farcaster-aware pet that grows with your vibe.
            </p>

            <div className="cta-row mt-5 flex flex-wrap gap-3">
              <Link href="/mint" className="btn-pill btn-pill--orange">
                Mint your pet
              </Link>
              <Link href="/my" className="btn-pill btn-pill--blue">
                See my pet
              </Link>
            </div>

            {inMini && (
              <p className="mt-3 text-sm text-white/75">
                Connected as {user?.username ? `@${user.username}` : `FID ${fid ?? "—"}`}
              </p>
            )}
          </div>

          {/* Minting & Supply Info */}
          <div className="glass glass-pad bg-[#12151b]/80 border border-white/10">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Minting & Supply
            </h2>

            <ul className="space-y-2 text-white/85 leading-relaxed">
              <li>
                <span className="text-orange-300 font-semibold">Mint price:</span>{" "}
                {mintPrice} Base ETH
              </li>
              <li>
                <span className="text-orange-300 font-semibold">Max supply:</span>{" "}
                {maxSupply.toLocaleString()}
              </li>
              <li>
                <span className="text-orange-300 font-semibold">Minted:</span>{" "}
                {totalMinted.toLocaleString()}
              </li>
              <li>
                <span className="text-orange-300 font-semibold">Limit:</span>{" "}
                One pet per Farcaster FID
              </li>
            </ul>

            <p className="mt-4 text-white/80 text-sm leading-relaxed">
              Connect your wallet, enter your FID, and mint. If you’re inside the Warpcast Mini,
              your FID is auto-detected and we’ll sign your mint server-side for a seamless flow.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
