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
  const { fid } = useFid();
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
      aria-label="Primary"
      className="
        bg-[#020617]                 /* fully opaque, very dark */
        border-b border-white/10
        shadow-[0_10px_40px_rgba(0,0,0,0.9)]
      "
    >
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* Left: logo + brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 bg-black/60">
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
            className="nav-burger text-white/90 hover:text-white"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              role="img"
              aria-hidden="true"
            >
              {/* use currentColor so it follows the button text color */}
              <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>

          <ConnectPill />
        </div>
      </div>

      {open && (
        <>
          <div className="menu-panel z-[60]">
            <div className="container mx-auto py-3 px-4 flex flex-col gap-3">
              {/* Mini user info: FID + wallet status + profile link */}
              {(fid || address) && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white/80 truncate">
                      {fid ? "Farcaster user" : "Guest"}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                      {fid ? `FID ${fid}` : "No FID detected"}
                    </div>
                  </div>

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
                      className="btn-ghost text-xs ml-1"
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
                    className={`menu-link ${active ? "menu-link--active" : ""}`}
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
