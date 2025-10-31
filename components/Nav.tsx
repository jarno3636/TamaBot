"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";
import { currentFid, openProfile } from "@/lib/mini";

export default function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const [fid, setFid] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10 backdrop-blur-md"
      style={{
        background:
          "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,.14), transparent 70%),radial-gradient(900px 420px at 110% -30%, rgba(234,122,42,.18), transparent 70%),linear-gradient(180deg, rgba(8,9,12,.80), rgba(8,9,12,.58))"
      }}
    >
      <nav className="container nav-bar">
        {/* Left: Farcaster avatar */}
        <button
          onClick={() => (fid ? openProfile(fid) : undefined)}
          className="nav-avatar"
          title={fid ? `Open Farcaster (FID ${fid})` : "Not signed in"}
          aria-label="Farcaster profile"
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="48px" className="object-cover" />
          ) : (
            <span className="text-2xl">🥚</span>
          )}
        </button>

        {/* Right: burger */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open menu"
          className="nav-burger"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-black/70 backdrop-blur-xl animate-fadeInDown">
          <div className="container py-5 grid gap-3 text-white text-[15px]">
            <a href="/"      onClick={()=>setOpen(false)} className={`nav-pill ${is("/") ? "nav-pill--active" : ""}`}>Home</a>
            <a href="/mint"  onClick={()=>setOpen(false)} className={`nav-pill ${is("/mint") ? "nav-pill--active" : ""}`}>Mint</a>
            <a href="/my"    onClick={()=>setOpen(false)} className={`nav-pill ${is("/my") ? "nav-pill--active" : ""}`}>My&nbsp;Pet</a>
            <a href="/about" onClick={()=>setOpen(false)} className={`nav-pill ${is("/about") ? "nav-pill--active" : ""}`}>About</a>

            {isConnected ? (
              <button
                onClick={() => { disconnect(); setOpen(false); }}
                className="btn-wallet--disconnect"
                title={address || ""}
              >
                Disconnect {address?.slice(0,6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => { connectWallet(); setOpen(false); }}
                className="btn-wallet--connect"
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
