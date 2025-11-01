// components/Nav.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { currentFid, openProfile } from "@/lib/mini";
import ConnectWallet from "@/components/ConnectWallet";

export default function Nav() {
  const pathname = usePathname();

  // --- Singleton: render only the first Nav mounted on a page ---
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).__TAMABOT_NAV__) setHidden(true);
    else (window as any).__TAMABOT_NAV__ = true;
  }, []);
  if (hidden) return null;

  // --- Farcaster avatar state ---
  const [fid, setFid] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const f = currentFid();
    if (f) setFid(f);
  }, []);
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

  // --- Mobile menu ---
  const [open, setOpen] = useState(false);
  // auto-close menu when route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10 backdrop-blur-md"
      style={{
        background:
          "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,.14), transparent 70%),radial-gradient(900px 420px at 110% -30%, rgba(234,122,42,.18), transparent 70%),linear-gradient(180deg, rgba(8,9,12,.90), rgba(8,9,12,.58))",
      }}
    >
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Left: Farcaster avatar */}
        <button
          onClick={() => (fid ? openProfile(fid) : undefined)}
          className="relative h-10 w-10 rounded-full overflow-hidden border border-white/20 hover:border-white/40 transition"
          title={fid ? `Open Farcaster (FID ${fid})` : "Not signed in"}
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="40px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🥚</span>
          )}
        </button>

        {/* Center: Desktop links ONLY (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-6 text-[15px] font-medium">
          <a href="/"      className={`nav-pill ${is("/") ? "nav-pill--active" : ""}`}>Home</a>
          <a href="/mint"  className={`nav-pill ${is("/mint") ? "nav-pill--active" : ""}`}>Mint</a>
          <a href="/my"    className={`nav-pill ${is("/my") ? "nav-pill--active" : ""}`}>My&nbsp;Pet</a>
          <a href="/about" className={`nav-pill ${is("/about") ? "nav-pill--active" : ""}`}>About</a>
        </div>

        {/* Right: Desktop connect OR Mobile burger (never both) */}
        <div className="flex items-center gap-3">
          {/* Desktop connect */}
          <div className="hidden md:block">
            <ConnectWallet />
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-white/15 hover:bg-white/10 transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu (links + connect). Only rendered on small screens when open. */}
      <div className={`md:hidden border-t border-white/10 bg-black/70 backdrop-blur-xl transition-[max-height,opacity] duration-200 overflow-hidden ${open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
        {open && (
          <div className="container mx-auto px-4 py-5 grid gap-3 text-white text-[15px]">
            <a href="/"      onClick={() => setOpen(false)} className={`nav-pill ${is("/") ? "nav-pill--active" : ""}`}>Home</a>
            <a href="/mint"  onClick={() => setOpen(false)} className={`nav-pill ${is("/mint") ? "nav-pill--active" : ""}`}>Mint</a>
            <a href="/my"    onClick={() => setOpen(false)} className={`nav-pill ${is("/my") ? "nav-pill--active" : ""}`}>My&nbsp;Pet</a>
            <a href="/about" onClick={() => setOpen(false)} className={`nav-pill ${is("/about") ? "nav-pill--active" : ""}`}>About</a>

            <div className="pt-3 border-t border-white/10">
              <ConnectWallet />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
