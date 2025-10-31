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
    const c = connectors[0]; if (c) await connectAsync({ connector: c });
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-white/10
      bg-[radial-gradient(1200px_600px_at_10%_-10%,#1f6feb22,transparent),radial-gradient(1000px_500px_at_110%_-20%,#f59e0b22,transparent)]
      backdrop-blur">
      <nav className="mx-auto max-w-6xl h-14 px-4 flex items-center justify-between text-white">
        {/* Left: Farcaster avatar (fallback egg) */}
        <button
          onClick={() => (fid ? openProfile(fid) : undefined)}
          className="relative w-10 h-10 rounded-full overflow-hidden border border-white/40 bg-white/20 grid place-items-center"
          title={fid ? `Open Farcaster (FID ${fid})` : "Not signed in"}
          aria-label="Farcaster profile"
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="40px" />
          ) : (
            <span className="text-xl">🥚</span>
          )}
        </button>

        {/* Right: burger only */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open menu"
          className="w-10 h-10 grid place-items-center rounded-xl bg-white/15 hover:bg-white/25 border border-white/25"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
      </nav>

      {/* Dropdown menu */}
      {open && (
        <div className="z-[59] border-t border-white/10 bg-black/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4 grid gap-2 text-white">
            <a href="/"      onClick={()=>setOpen(false)} className={linkCls(pathname === "/")}>Home</a>
            <a href="/mint"  onClick={()=>setOpen(false)} className={linkCls(pathname.startsWith("/mint"))}>Mint</a>
            <a href="/my"    onClick={()=>setOpen(false)} className={linkCls(pathname.startsWith("/my"))}>My Pet</a>
            <a href="/about" onClick={()=>setOpen(false)} className={linkCls(pathname.startsWith("/about"))}>About</a>

            {/* Wallet action lives inside the menu */}
            {isConnected ? (
              <button
                onClick={() => { disconnect(); setOpen(false); }}
                className="justify-self-start px-4 py-2 rounded-full bg-white text-amber-800 font-semibold hover:brightness-95 shadow"
                title={address || ""}
              >
                Disconnect {address?.slice(0,6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => { connectWallet(); setOpen(false); }}
                className="justify-self-start px-4 py-2 rounded-full bg-white text-amber-800 font-semibold hover:brightness-95 shadow"
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

function linkCls(active: boolean) {
  return [
    "inline-block px-4 py-2 rounded-full border border-white/20 transition",
    "bg-white/10 hover:bg-white/20",
    active && "ring-2 ring-white/50 shadow-[0_0_18px_4px_rgba(255,255,255,0.2)]"
  ].filter(Boolean).join(" ");
}
