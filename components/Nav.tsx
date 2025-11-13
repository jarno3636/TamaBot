// components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAccount } from "wagmi";
import { useMemo, useState } from "react";
import ConnectPill from "@/components/ConnectPill";
import useFid from "@/hooks/useFid";

export default function Nav() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { fid } = useFid();       // FID from mini-app context
  const [open, setOpen] = useState(false);

  const links = useMemo(
    () => [
      { href: "/", label: "Mint" },
      { href: "/my", label: "My Bot" },
    ],
    [],
  );

  return (
    <nav
      className="bg-[#0b0d12]/70 border-b border-white/10"
      aria-label="Primary"
    >
      <div className="container flex items-center justify-between py-3 px-4">
        {/* Left: logo avatar + brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 bg-black/40">
            <Image
              src="/logo.PNG"
              alt="Basebots"
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
          <span className="brand-steel text-lg sm:text-xl md:text-2xl">
            BASEBOTS
          </span>
        </Link>

        {/* Right: burger + connect pill */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="nav-burger text-white/90"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              role="img"
              aria-hidden
            >
              <rect x="3" y="6" width="18" height="2" rx="1" />
              <rect x="3" y="11" width="18" height="2" rx="1" />
              <rect x="3" y="16" width="18" height="2" rx="1" />
            </svg>
          </button>
          <ConnectPill />
        </div>
      </div>

      {open && (
        <>
          <div className="menu-panel z-[60]">
            <div className="container py-3 px-4 flex flex-col gap-3">
              {/* Simple Farcaster mini-profile based only on FID */}
              {(fid || address) && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-white/10">
                    <div className="w-full h-full grid place-items-center text-white/40 text-sm">
                      ?
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm text-white/80 truncate">
                      {fid ? "Farcaster user" : "Guest"}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                      {fid ? `FID ${fid}` : "No FID detected"}
                    </div>
                  </div>

                  {/* Connected wallet (no raw address) */}
                  {address && (
                    <div className="ml-auto text-right">
                      <div className="text-[11px] text-emerald-300 flex items-center gap-1 justify-end">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>Connected</span>
                      </div>
                    </div>
                  )}

                  {fid && (
                    <Link
                      href={`https://warpcast.com/~/profiles/${fid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 btn-ghost text-xs"
                    >
                      Profile ↗
                    </Link>
                  )}
                </div>
              )}

              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`menu-link ${
                      active ? "menu-link--active" : ""
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="menu-overlay"
          />
        </>
      )}
    </nav>
  );
}
