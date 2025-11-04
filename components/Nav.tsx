// components/Nav.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMiniContext } from "@/lib/useMiniContext";
import ConnectPill from "@/components/ConnectPill";

export default function Nav() {
  const pathname = usePathname();
  const { fid } = useMiniContext();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ok = true;
    (async () => {
      if (!fid) { setAvatar(null); return; }
      try {
        const r = await fetch(`/api/neynar/user/${fid}`);
        const j = await r.json();
        if (!ok) return;
        const p = j?.result?.user?.pfp_url || j?.user?.pfp_url || j?.pfp_url || null;
        setAvatar(typeof p === "string" ? p : null);
      } catch {
        if (ok) setAvatar(null);
      }
    })();
    return () => { ok = false; };
  }, [fid]);

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10 backdrop-blur-md"
      style={{
        background:
          "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,.14), transparent 70%),radial-gradient(900px 420px at 110% -30%, rgba(234,122,42,.18), transparent 70%),linear-gradient(180deg, rgba(8,9,12,.90), rgba(8,9,12,.58))",
      }}
    >
      {/* 25% taller: py-4 */}
      <nav className="container mx-auto flex items-center justify-between px-4 py-4" role="navigation">
        {/* Left: avatar (opens profile page in Farcaster client) */}
        <a
          href={fid ? `https://warpcast.com/~/profiles/${fid}` : undefined}
          className="relative h-12 w-12 rounded-full overflow-hidden border border-white/20 hover:border-white/40 transition"
          title={fid ? `FID ${fid}` : "Not signed in"}
          target={fid ? "_blank" : undefined}
          rel={fid ? "noreferrer" : undefined}
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="48px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🥚</span>
          )}
        </a>

        {/* Right: burger only */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex items-center justify-center h-11 w-11 rounded-lg border border-white/15 hover:bg-white/10 transition"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-black/70 backdrop-blur-xl animate-fadeInDown">
          <div className="container mx-auto px-4 py-5 grid gap-3 text-white text-[15px]">
            <a href="/"      onClick={() => setOpen(false)} className={`nav-pill ${is("/") ? "nav-pill--active" : ""}`}>Home</a>
            <a href="/mint"  onClick={() => setOpen(false)} className={`nav-pill ${is("/mint") ? "nav-pill--active" : ""}`}>Mint</a>
            <a href="/my"    onClick={() => setOpen(false)} className={`nav-pill ${is("/my") ? "nav-pill--active" : ""}`}>My&nbsp;Pet</a>
            <a href="/about" onClick={() => setOpen(false)} className={`nav-pill ${is("/about") ? "nav-pill--active" : ""}`}>About</a>

            <div className="pt-3 border-t border-white/10" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <ConnectPill />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
