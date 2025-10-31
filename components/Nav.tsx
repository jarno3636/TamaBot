"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";
import { currentFid, openProfile } from "@/lib/mini";

/** simple pill link with active glow */
function PillLink({
  href, children, active, onClick,
}: { href: string; children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-full text-sm font-semibold transition",
        "bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30",
        active ? "shadow-[0_0_0_2px_rgba(255,255,255,0.6),0_0_18px_4px_rgba(255,255,255,0.35)]" : "shadow-none",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const [fid, setFid] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const f = currentFid();
    if (f) setFid(f);
  }, []);

  // fetch Farcaster avatar (via our server-side Neynar proxy)
  useEffect(() => {
    if (!fid) return;
    (async () => {
      try {
        const res = await fetch(`/api/neynar/user/${fid}`);
        if (!res.ok) return;
        const j = await res.json();
        const img = j?.result?.user?.pfp_url || j?.user?.pfp_url;
        if (img) setAvatar(img);
      } catch {}
    })();
  }, [fid]);

  const active = useMemo(
    () => ({
      home: pathname === "/" || pathname === "/home",
      mint: pathname.startsWith("/mint"),
      my: pathname.startsWith("/my"),
      about: pathname.startsWith("/about"),
    }),
    [pathname]
  );

  async function handleConnect() {
    // pick first available connector
    const c = connectors[0];
    if (!c) return;
    await connectAsync({ connector: c });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-amber-200/50 bg-[#ffb85a]/90 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Left: Farcaster avatar (or egg) */}
        <button
          onClick={() => (fid ? openProfile(fid) : undefined)}
          className="group relative w-11 h-11 rounded-full overflow-hidden border-2 border-white/60 bg-white/70 shadow-md"
          aria-label="Open Farcaster profile"
          title={fid ? `FID ${fid}` : "Not signed in with Farcaster"}
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="44px" />
          ) : (
            <div className="w-full h-full grid place-items-center text-2xl">🥚</div>
          )}
          {/* subtle hover ring */}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-0 group-hover:ring-2 ring-white/70 transition" />
        </button>

        {/* Right: pills + burger */}
        <div className="flex items-center gap-3">
          {/* Desktop pills */}
          <div className="hidden md:flex items-center gap-2 text-white">
            <PillLink href="/" active={active.home}>Home</PillLink>
            <PillLink href="/mint" active={active.mint}>Mint</PillLink>
            <PillLink href="/my" active={active.my}>My&nbsp;Pet</PillLink>
            <PillLink href="/about" active={active.about}>About</PillLink>

            {/* wallet pill */}
            {isConnected ? (
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white/20 hover:bg-white/30 border border-white/30 transition"
                title={address || ""}
              >
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-amber-700 hover:brightness-95 transition shadow"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile menu toggle (right) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-10 h-10 grid place-items-center rounded-xl bg-white/80 text-amber-800 border border-amber-300 hover:bg-white"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-amber-200/60 bg-[#ffd59a]/95 text-amber-900">
          <div className="mx-auto max-w-6xl px-4 py-3 grid gap-2">
            <PillLink href="/" active={active.home} onClick={() => setMenuOpen(false)}>Home</PillLink>
            <PillLink href="/mint" active={active.mint} onClick={() => setMenuOpen(false)}>Mint</PillLink>
            <PillLink href="/my" active={active.my} onClick={() => setMenuOpen(false)}>My&nbsp;Pet</PillLink>
            <PillLink href="/about" active={active.about} onClick={() => setMenuOpen(false)}>About</PillLink>

            {/* wallet in mobile */}
            {isConnected ? (
              <button
                onClick={() => { disconnect(); setMenuOpen(false); }}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white/90 text-amber-800 border border-amber-300 hover:bg-white transition"
                title={address || ""}
              >
                Disconnect {address?.slice(0, 6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => { handleConnect(); setMenuOpen(false); }}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-amber-700 hover:brightness-95 transition shadow"
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
