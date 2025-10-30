// components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => {
    const mk: any = (globalThis as any).MiniKit;
    if (mk?.user?.fid) setFid(Number(mk.user.fid));
    else {
      const m = document.cookie.match(new RegExp("(^| )fid=([^;]+)"));
      const fromCookie = m ? Number(decodeURIComponent(m[2])) : NaN;
      if (Number.isFinite(fromCookie) && fromCookie > 0) setFid(fromCookie);
    }
  }, []);

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">TamaBot</Link>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">Mint</Link>
          <Link href="/my" className="text-sm text-zinc-600 hover:text-zinc-900">My Pet</Link>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {fid && (
            <span className="rounded-lg bg-purple-50 text-purple-700 px-2.5 py-1">
              FID {fid}
            </span>
          )}
          {isConnected ? (
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
          ) : (
            <span className="text-zinc-500">Wallet not connected</span>
          )}
        </div>
      </nav>
    </header>
  );
}
