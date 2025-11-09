"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectPill from "@/components/ConnectPill";
import Image from "next/image";
import { useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Mint" },
    { href: "/my", label: "My Bot" },
  ];

  return (
    <nav
      className="nav-root sticky top-0 z-[70] backdrop-blur-md bg-[#0b0d12]/70 border-b border-white/10"
      aria-label="Primary"
    >
      <div className="container flex items-center justify-between py-3 px-4">
        {/* Left: logo + title */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <Image
              src="/logo.PNG"
              alt="Basebots"
              fill
              sizes="32px"
              className="object-contain rounded-md"
            />
          </div>
          <span className="brand-steel text-xl md:text-2xl">BASEBOTS</span>
        </Link>

        {/* Right: burger + connect */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="nav-burger text-white/90"
          >
            {/* Visible lines (use currentColor) */}
            <svg width="26" height="26" viewBox="0 0 24 24" role="img">
              <rect x="3" y="6"  width="18" height="2" rx="1" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          <ConnectPill />
        </div>
      </div>

      {/* Dropdown panel (fixed under nav, above cards) */}
      {open && (
        <>
          <div className="menu-panel z-[60]">
            <div className="container py-3 px-4 flex flex-col gap-2">
              {links.map(l => {
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
          {/* Optional dim overlay to show the panel is above content */}
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
