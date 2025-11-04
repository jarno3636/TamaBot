// components/Nav.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useMiniContext } from "@/lib/useMiniContext";
import { openProfile } from "@/lib/mini";
import ConnectPill from "@/components/ConnectPill";

export default function Nav() {
  const pathname = usePathname();
  const { fid, user } = useMiniContext();

  // Prefer Mini context avatar; fall back to Neynar if missing
  const ctxAvatar = useMemo(() => user?.pfpUrl || null, [user]);
  const [avatar, setAvatar] = useState<string | null>(ctxAvatar);

  useEffect(() => setAvatar(ctxAvatar), [ctxAvatar]);

  useEffect(() => {
    let ok = true;
    (async () => {
      if (ctxAvatar || !fid) return; // already have one, or no fid yet
      try {
        const r = await fetch(`/api/neynar/user/${fid}`);
        const j = await r.json();
        if (!ok) return;
        const p =
          j?.result?.user?.pfp_url ||
          j?.user?.pfp_url ||
          j?.pfp_url ||
          j?.profile?.pfp_url ||
          null;
        setAvatar(typeof p === "string" ? p : null);
      } catch {
        if (ok) setAvatar(null);
      }
    })();
    return () => {
      ok = false;
    };
  }, [fid, ctxAvatar]);

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10 backdrop-blur-md"
      style={{
        background:
          "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,.14), transparent 70%),radial-gradient(900px 420px at 110% -30%, rgba(234,122,42,.18), transparent 70%),linear-gradient(180deg, rgba(8,9,12,.90), rgba(8,9,12,.58))",
      }}
    >
      {/* 50% taller: py-6 (was py-4) */}
      <nav
        className="container mx-auto flex items-center justify-between px-4 py-6"
        role="navigation"
      >
        {/* Left: avatar (opens profile in Farcaster if possible) */}
        <button
          onClick={() => (fid ? openProfile(fid) : undefined)}
          className="relative h-16 w-16 rounded-full overflow-hidden border border-white/20 hover:border-white/40 transition"
          title={fid ? `Open profile (FID ${fid})` : "Not signed in"}
        >
          {avatar ? (
            <Image
              src={avatar}
              alt="Farcaster avatar"
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-2xl">
              🥚
            </span>
          )}
        </button>

        {/* Right: burger */}
        <Burger />
      </nav>

      <MobileDrawer isOpenComponent={<BurgerOpen />} isLinkActive={is} />
    </header>
  );
}

/* ============ Small components to keep things tidy ============ */

function Burger() {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-label="Open menu"
      aria-expanded={open}
      data-nav-burger // used by MobileDrawer to subscribe
      className="flex items-center justify-center h-14 w-14 rounded-xl border border-white/15 hover:bg-white/10 transition"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </button>
  );
}

function BurgerOpen() {
  const el = typeof document !== "undefined" ? document.querySelector("[data-nav-burger]") : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!el) return;
    const handler = () => setOpen((v) => !v);
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [el]);

  return open ? <span data-open-flag /> : null;
}

function MobileDrawer({
  isOpenComponent,
  isLinkActive,
}: {
  isOpenComponent: JSX.Element;
  isLinkActive: (p: string) => boolean;
}) {
  const [open, setOpen] = useState(false);

  // Subscribe to the hidden flag toggled by BurgerOpen
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // toggle whenever the burger flag is toggled
      setOpen((v) => !v);
    });
    const target = document.querySelector("[data-open-flag]") || document.querySelector("[data-nav-burger]");
    if (target) observer.observe(target, { attributes: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {isOpenComponent}
      {open && (
        <div className="border-t border-white/10 bg-black/70 backdrop-blur-xl animate-fadeInDown">
          <div className="container mx-auto px-4 py-6 grid gap-4 text-white text-[16px]">
            {/* More padding between the “pills” */}
            <a
              href="/"
              onClick={() => setOpen(false)}
              className={`nav-pill !py-3 !px-4 ${isLinkActive("/") ? "nav-pill--active" : ""}`}
            >
              Home
            </a>
            <a
              href="/mint"
              onClick={() => setOpen(false)}
              className={`nav-pill !py-3 !px-4 ${isLinkActive("/mint") ? "nav-pill--active" : ""}`}
            >
              Mint
            </a>
            <a
              href="/my"
              onClick={() => setOpen(false)}
              className={`nav-pill !py-3 !px-4 ${isLinkActive("/my") ? "nav-pill--active" : ""}`}
            >
              My&nbsp;Pet
            </a>
            <a
              href="/about"
              onClick={() => setOpen(false)}
              className={`nav-pill !py-3 !px-4 ${isLinkActive("/about") ? "nav-pill--active" : ""}`}
            >
              About
            </a>

            <div
              className="pt-4 mt-2 border-t border-white/10"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ConnectPill />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
