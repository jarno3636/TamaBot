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

  async function connectWallet() {
    const c = connectors[0];
    if (c) await connectAsync({ connector: c });
  }

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10
                 bg-[radial-gradient(1200px_600px_at_10%_-10%,#1f6feb22,transparent),radial-gradient(1000px_500px_at_110%_-20%,#f59e0b22,transparent)]
                 backdrop-blur-md shadow-lg"
    >
      <nav className="container h-16 flex items-center justify-between text-white">
        {/* === Left: Farcaster avatar (larger, glass style) === */}
        <button
          onClick={() => (fid ? openProfile(fid) : undefined)}
          className="relative w-12 h-12 rounded-full overflow-hidden border border-white/30 bg-white/15 backdrop-blur-sm grid place-items-center hover:scale-[1.03] transition-transform"
          title={fid ? `Open Farcaster (FID ${fid})` : "Not signed in"}
          aria-label="Farcaster profile"
        >
          {avatar ? (
            <Image src={avatar} alt="Farcaster avatar" fill sizes="48px" className="object-cover" />
          ) : (
            <span className="text-2xl">🥚</span>
          )}
        </button>

        {/* === Right: menu toggle === */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open menu"
          className="w-12 h-12 grid place-items-center rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 shadow-inner"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="text-white"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {/* === Dropdown menu === */}
      {open && (
        <div className="border-t border-white/10 bg-black/70 backdrop-blur-xl animate-fadeInDown">
          <div className="container py-5 grid gap-3 text-white text-lg">
            <a
              href="/"
              onClick={() => setOpen(false)}
              className={`nav-pill px-5 py-2 text-base ${is("/") ? "nav-pill--active" : ""}`}
            >
              Home
            </a>
            <a
              href="/mint"
              onClick={() => setOpen(false)}
              className={`nav-pill px-5 py-2 text-base ${is("/mint") ? "nav-pill--active" : ""}`}
            >
              Mint
            </a>
            <a
              href="/my"
              onClick={() => setOpen(false)}
              className={`nav-pill px-5 py-2 text-base ${is("/my") ? "nav-pill--active" : ""}`}
            >
              My&nbsp;Pet
            </a>
            <a
              href="/about"
              onClick={() => setOpen(false)}
              className={`nav-pill px-5 py-2 text-base ${is("/about") ? "nav-pill--active" : ""}`}
            >
              About
            </a>

            {/* Wallet actions */}
            {isConnected ? (
              <button
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="justify-self-start px-5 py-2 rounded-full font-semibold
                           bg-gradient-to-r from-amber-300 to-yellow-400 text-black
                           hover:brightness-110 transition"
                title={address || ""}
              >
                Disconnect {address?.slice(0, 6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => {
                  connectWallet();
                  setOpen(false);
                }}
                className="justify-self-start px-5 py-2 rounded-full font-semibold
                           bg-gradient-to-r from-blue-400 to-cyan-500 text-black
                           hover:brightness-110 transition"
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
