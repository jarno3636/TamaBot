// components/Nav.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";
import { currentFid, openProfile } from "@/lib/mini";
import { PillLink } from "@/components/UI";

export default function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const [fid, setFid] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { const f = currentFid(); if (f) setFid(f); }, []);
  useEffect(() => {
    if (!fid) return;
    (async () => {
      try {
        const r = await fetch(`/api/neynar/user/${fid}`);
        const j = await r.json();
        setAvatar(j?.result?.user?.pfp_url || j?.user?.pfp_url || null);
      } catch {}
    })();
  }, [fid]);

  async function connectWallet() {
    const c = connectors[0];
    if (c) await connectAsync({ connector: c });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#f59e0b]/30 bg-[linear-gradient(90deg,#ff9f40,#ff7b54)]/90 backdrop-blur text-white">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Left: Farcaster avatar (fallback egg) */}
        <button
          onClick={() => (fid ? openProfile(fid) : void 0)}
          className="group relative w-11 h-11 rounded-full overflow-hidden border-2 border-white/70 bg-white/80 shadow"
          title={fid ? `Open Farcaster (FID ${fid})` : "Not signed in"}
          aria-label="Farcaster profile"
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="44px" />
          ) : (
            <div className="w-full h-full grid place-items-center text-2xl">🥚</div>
          )}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-0 group-hover:ring-2 ring-white/70 transition" />
        </button>

        {/* Right: single hamburger (everything lives in the drawer) */}
        <button
          className="w-10 h-10 grid place-items-center rounded-xl bg-white/90 text-amber-800 border border-amber-300"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {/* Drawer: shown for ALL screen sizes when open */}
      {menuOpen && (
        <div className="border-t border-[#f59e0b]/30 bg-[#ffd59a]/95 text-amber-900">
          <div className="mx-auto max-w-6xl px-4 py-4 grid gap-2">
            <PillLink href="/"    onClick={()=>setMenuOpen(false)} active={pathname === "/" || pathname === "/home"}>Home</PillLink>
            <PillLink href="/mint" onClick={()=>setMenuOpen(false)} active={pathname.startsWith("/mint")}>Mint</PillLink>
            <PillLink href="/my"   onClick={()=>setMenuOpen(false)} active={pathname.startsWith("/my")}>My&nbsp;Pet</PillLink>
            <PillLink href="/about" onClick={()=>setMenuOpen(false)} active={pathname.startsWith("/about")}>About</PillLink>

            {isConnected ? (
              <button
                onClick={() => { disconnect(); setMenuOpen(false); }}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white text-amber-800 font-semibold mt-2"
                title={address || ""}
              >
                Disconnect {address?.slice(0, 6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => { connectWallet(); setMenuOpen(false); }}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white text-amber-800 font-semibold mt-2"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
