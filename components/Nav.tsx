// components/Nav.tsx
"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMiniContext } from "@/lib/useMiniContext";
import ConnectPill from "@/components/ConnectPill";

// Dynamically load Neynar's UserDropdown on the client only
const NeynarUserDropdown = dynamic(
  async () => (await import("@neynar/react")).UserDropdown,
  { ssr: false, loading: () => null }
);

export default function Nav() {
  const pathname = usePathname();
  const { fid, user } = useMiniContext();
  const [avatar, setAvatar] = useState<string | null>(user?.pfpUrl ?? null);
  const [open, setOpen] = useState(false);

  // Only render Neynar UI if client ID is present (avoids rendering a broken widget)
  const hasNeynarClient =
    typeof process !== "undefined" && !!process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

  // If the mini context didn't include a pfp, fetch from Neynar.
  useEffect(() => {
    let ok = true;
    (async () => {
      if (!fid || avatar) return;
      try {
        const r = await fetch(`/api/neynar/user/${fid}`);
        const j = await r.json();
        if (!ok) return;
        const p =
          j?.result?.user?.pfp_url ||
          j?.user?.pfp_url ||
          j?.pfp_url ||
          null;
        if (typeof p === "string") setAvatar(p);
      } catch {
        if (ok) setAvatar(null);
      }
    })();
    return () => { ok = false; };
  }, [fid, avatar]);

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10 backdrop-blur-md"
      style={{
        background:
          "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,.14), transparent 70%),radial-gradient(900px 420px at 110% -30%, rgba(234,122,42,.18), transparent 70%),linear-gradient(180deg, rgba(8,9,12,.90), rgba(8,9,12,.58))",
      }}
    >
      {/* 50% taller header with extra spacing */}
      <nav className="container mx-auto flex items-center gap-4 px-5 py-6" role="navigation">
        {/* Left: avatar (fallback if Neynar widget unavailable) */}
        <a
          href={fid ? `https://warpcast.com/~/profiles/${fid}` : undefined}
          className="relative h-14 w-14 rounded-full overflow-hidden border border-white/25 hover:border-white/50 transition"
          title={fid ? `FID ${fid}` : "Not signed in"}
          target={fid ? "_blank" : undefined}
          rel={fid ? "noreferrer" : undefined}
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="56px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🥚</span>
          )}
        </a>

        {/* Spacer pushes right-side controls */}
        <div className="flex-1" />

        {/* Right: Neynar user dropdown (preferred), then burger */}
        {hasNeynarClient && (
          <div className="hidden sm:flex items-center">
            {/* Neynar handles avatar/name/menu when signed in */}
            <NeynarUserDropdown />
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex items-center justify-center h-12 w-12 rounded-xl border border-white/15 hover:bg-white/10 transition"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {/* Drawer */}
      {open && (
        <div className="border-t border-white/10 bg-black/70 backdrop-blur-xl animate-fadeInDown">
          <div className="container mx-auto px-5 py-6 grid gap-4 text-white text-[16px]">
            {hasNeynarClient && (
              <div className="mb-2">
                {/* Also show Neynar menu inside the drawer on mobile */}
                <NeynarUserDropdown />
              </div>
            )}

            <a href="/"      onClick={() => setOpen(false)} className={`nav-pill ${is("/") ? "nav-pill--active" : ""}`}>Home</a>
            <a href="/mint"  onClick={() => setOpen(false)} className={`nav-pill ${is("/mint") ? "nav-pill--active" : ""}`}>Mint</a>
            <a href="/my"    onClick={() => setOpen(false)} className={`nav-pill ${is("/my") ? "nav-pill--active" : ""}`}>My&nbsp;Pet</a>
            <a href="/about" onClick={() => setOpen(false)} className={`nav-pill ${is("/about") ? "nav-pill--active" : ""}`}>About</a>

            <div className="pt-4 mt-2 border-t border-white/10">
              <ConnectPill />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
