"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { currentFid, openProfile } from "@/lib/mini";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const [fid, setFid] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const f = currentFid();
    if (f) setFid(f);
  }, []);

  // Fetch Farcaster avatar via Neynar if available
  useEffect(() => {
    if (!fid) return;
    (async () => {
      try {
        const res = await fetch(`/api/neynar/user/${fid}`);
        if (!res.ok) return;
        const j = await res.json();
        const img = j?.result?.user?.pfp_url;
        if (img) setAvatar(img);
      } catch (e) {
        console.warn("Could not fetch avatar:", e);
      }
    })();
  }, [fid]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-gradient-to-r from-sky-500/70 via-fuchsia-500/60 to-amber-400/70 backdrop-blur text-white">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          {/* Egg-shaped logo placeholder */}
          <div className="relative w-10 h-10 bg-white rounded-full border-4 border-yellow-200 shadow-lg overflow-hidden flex items-center justify-center">
            <span className="text-yellow-500 text-xl font-bold select-none">🥚</span>
          </div>

          {/* Title */}
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-wide"
            style={{
              fontFamily: "'Comic Sans MS', 'Fredoka One', cursive",
              letterSpacing: "1px",
              textShadow: "1px 1px 2px rgba(0,0,0,0.25)",
            }}
          >
            TamaBots
          </Link>
        </div>

        {/* Right: Menu & User */}
        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <div className="hidden md:flex gap-4 text-sm font-medium">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/mint" className="hover:underline">Mint</Link>
            <Link href="/my" className="hover:underline">My Pet</Link>
            <Link href="/about" className="hover:underline">About</Link>
          </div>

          {/* User avatar or wallet */}
          {fid && avatar ? (
            <button
              onClick={() => openProfile(fid)}
              className="w-9 h-9 rounded-full overflow-hidden border border-white/40 hover:ring-2 hover:ring-white/40 transition-all"
              title="View Farcaster Profile"
            >
              <Image src={avatar} alt="user avatar" width={36} height={36} />
            </button>
          ) : (
            <div className="text-xs md:text-sm opacity-90">
              {isConnected
                ? `${address?.slice(0, 5)}…${address?.slice(-3)}`
                : "Connect wallet"}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex flex-col justify-center items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30"
          >
            <span className="w-5 h-0.5 bg-white rounded"></span>
            <span className="w-5 h-0.5 bg-white rounded"></span>
            <span className="w-5 h-0.5 bg-white rounded"></span>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white/10 backdrop-blur border-t border-white/20 text-center text-sm py-3 space-y-2">
          <Link href="/" onClick={() => setMenuOpen(false)} className="block hover:underline">Home</Link>
          <Link href="/mint" onClick={() => setMenuOpen(false)} className="block hover:underline">Mint</Link>
          <Link href="/my" onClick={() => setMenuOpen(false)} className="block hover:underline">My Pet</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)} className="block hover:underline">About</Link>
        </div>
      )}
    </header>
  );
}
