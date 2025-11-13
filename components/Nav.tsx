// components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import ConnectPill from "@/components/ConnectPill";
import useFid from "@/hooks/useFid";

type MiniProfile = {
  pfp_url?: string | null;
  pfpUrl?: string | null;       // defensive alias
  display_name?: string | null;
  displayName?: string | null;  // defensive alias
  username?: string | null;
};

export default function Nav() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { fid } = useFid(); // FID from mini app context

  const [open, setOpen] = useState(false);
  const [mp, setMp] = useState<MiniProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Try to load Farcaster profile WHEN we have a fid
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      if (!fid) {
        setMp(null);
        return;
      }

      try {
        setLoading(true);

        const r = await fetch(`/api/neynar/user/${fid}`, {
          cache: "no-store",
          signal: ctrl.signal,
          headers: { accept: "application/json" },
        });

        const text = await r.text();

        // Handle Neynar "PaymentRequired" (paid-only endpoint)
        if (!r.ok || text.includes('"PaymentRequired"')) {
          console.warn(
            "[Nav] Neynar user endpoint not available on current plan; skipping avatar.",
          );
          setMp(null);
          return;
        }

        const j = JSON.parse(text);

        // Support various Neynar shapes: {user}, {result:{user}}, {users:[0]}
        const user =
          (j && (j.user || j.result?.user || j.users?.[0])) || null;

        if (user) {
          setMp({
            pfp_url: user.pfp_url ?? user.pfp?.url ?? null,
            display_name:
              user.display_name ?? user.profile?.display_name ?? null,
            username: user.username ?? user.profile?.username ?? null,
          });
        } else {
          setMp(null);
        }
      } catch (err) {
        if (!ctrl.signal.aborted) {
          console.warn("[Nav] Neynar profile fetch failed", err);
          setMp(null);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [fid]);

  const links = useMemo(
    () => [
      { href: "/", label: "Mint" },
      { href: "/my", label: "My Bot" },
    ],
    [],
  );

  const hasProfile = Boolean(mp?.pfp_url || mp?.display_name || mp?.username);
  const pfp = (mp?.pfp_url ?? (mp as any)?.pfpUrl) || null;
  const name = (mp?.display_name ?? (mp as any)?.displayName) || null;

  return (
    <nav
      className="bg-[#0b0d12]/70 border-b border-white/10"
      aria-label="Primary"
    >
      <div className="container flex items-center justify-between py-3 px-4">
        {/* Left: avatar (pfp if present) + brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 bg-black/40">
            {pfp ? (
              // Farcaster avatar when Neynar is available
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pfp}
                alt="Farcaster avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              // Default Basebots logo (no paid Neynar / no pfp)
              <Image
                src="/logo.PNG"
                alt="Basebots"
                fill
                sizes="32px"
                className="object-contain"
              />
            )}
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
              {(loading || hasProfile || address) && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  {/* Farcaster avatar or fallback circle */}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-white/10">
                    {pfp ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pfp}
                        alt="pfp"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-white/40 text-sm">
                        {loading ? "…" : "?"}
                      </div>
                    )}
                  </div>

                  {/* Farcaster name / username / fid */}
                  <div className="min-w-0">
                    <div className="text-sm text-white/80 truncate">
                      {name || (loading ? "Loading…" : "Farcaster user")}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                      {mp?.username
                        ? `@${mp.username}`
                        : fid
                        ? `FID ${fid}`
                        : "—"}
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
                      href={
                        mp?.username
                          ? `https://warpcast.com/${mp.username}`
                          : `https://warpcast.com/~/profiles/${fid}`
                      }
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
