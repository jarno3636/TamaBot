// components/Nav.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMiniContext } from "@/lib/useMiniContext";
import ConnectPill from "@/components/ConnectPill";

function normalizeAvatar(u?: string | null): string | null {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  // ipfs://CID or ipfs://ipfs/CID
  if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.replace(/^ipfs:\/\/(ipfs\/)?/, "")}`;
  // protocol-relative
  if (/^\/\//.test(s)) return `https:${s}`;
  // bare host/path
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

/** Probe an image url; resolves true if it loads within `timeoutMs`. */
function probeImage(url: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        resolve(ok);
        // release
        img.onload = null;
        img.onerror = null;
      }
    };
    const t = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      finish(true);
    };
    img.onerror = () => {
      clearTimeout(t);
      finish(false);
    };
    // cache-bust lightly to avoid stale 403 placeholders
    const bust = url.includes("?") ? `${url}&cb=${Date.now() % 10000}` : `${url}?cb=${Date.now() % 10000}`;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = bust;
  });
}

export default function Nav() {
  const pathname = usePathname();
  const { fid, user } = useMiniContext();

  const [avatar, setAvatar] = useState<string | null>(normalizeAvatar(user?.pfpUrl));
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(!!avatar);
  const [open, setOpen] = useState(false);

  // Keep state in sync with context
  useEffect(() => {
    const n = normalizeAvatar(user?.pfpUrl);
    setAvatar(n);
    setLoadingAvatar(!!n);
  }, [user?.pfpUrl]);

  // Fallback fetch via your Neynar proxy if Mini didn’t provide pfp
  useEffect(() => {
    let ok = true;
    (async () => {
      if (!fid || avatar) return;
      try {
        const r = await fetch(`/api/neynar/user/${fid}`);
        const j = await r.json();
        if (!ok) return;
        const p: string | null =
          j?.result?.user?.pfp_url || j?.user?.pfp_url || j?.pfp_url || null;
        const n = normalizeAvatar(p);
        if (n) {
          setAvatar(n);
          setLoadingAvatar(true);
        }
      } catch {
        /* no-op */
      }
    })();
    return () => {
      ok = false;
    };
  }, [fid, avatar]);

  // Validate the avatar actually loads; otherwise fall back to egg
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!avatar) {
        setLoadingAvatar(false);
        return;
      }
      setLoadingAvatar(true);
      const ok = await probeImage(avatar, 3000);
      if (!cancelled) {
        if (!ok) {
          setAvatar(null);   // 👉 triggers 🥚 fallback
          setLoadingAvatar(false);
        } else {
          setLoadingAvatar(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [avatar]);

  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header
      className="sticky top-0 z-[60] border-b border-white/10 backdrop-blur-md"
      style={{
        background:
          "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,.14), transparent 70%),radial-gradient(900px 420px at 110% -30%, rgba(234,122,42,.18), transparent 70%),linear-gradient(180deg, rgba(8,9,12,.90), rgba(8,9,12,.58))",
      }}
    >
      <nav
        className="container mx-auto flex flex-row flex-nowrap items-center justify-between gap-4 px-5 py-6 min-h-[72px]"
        role="navigation"
      >
        {/* left: avatar + optional username */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={fid ? `https://warpcast.com/~/profiles/${fid}` : undefined}
            className="relative shrink-0 h-14 w-14 rounded-full overflow-hidden border border-white/25 hover:border-white/50 transition"
            title={fid ? `FID ${fid}` : "Not signed in"}
            target={fid ? "_blank" : undefined}
            rel={fid ? "noreferrer" : undefined}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Farcaster avatar"
                className="h-full w-full object-cover"
                onError={() => setAvatar(null)}
                referrerPolicy="no-referrer"
                decoding="async"
              />
            ) : (
              // 🥚 fallback
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🥚</span>
            )}

            {/* subtle loading shimmer while we probe */}
            {loadingAvatar && (
              <span className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
            )}
          </a>

          {user?.username && (
            <span className="truncate max-w-[40vw] sm:max-w-[240px] text-white/85">
              @{user.username}
            </span>
          )}
        </div>

        {/* right: burger */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="shrink-0 inline-flex items-center justify-center h-12 w-12 rounded-xl border border-white/15 hover:bg-white/10 transition"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-black/70 backdrop-blur-xl animate-fadeInDown">
          <div className="container mx-auto px-5 py-6 grid gap-4 text-white text-[16px]">
            <a href="/"      onClick={() => setOpen(false)} className={`nav-pill ${is("/") ? "nav-pill--active" : ""}`}>Home</a>
            <a href="/mint"  onClick={() => setOpen(false)} className={`nav-pill ${is("/mint") ? "nav-pill--active" : ""}`}>Mint</a>
            <a href="/my"    onClick={() => setOpen(false)} className={`nav-pill ${is("/my") ? "nav-pill--active" : ""}`}>My&nbsp;Pet</a>
            <a href="/about" onClick={() => setOpen(false)} className={`nav-pill ${is("/about") ? "nav-pill--active" : ""}`}>About</a>
            <div className="pt-4 mt-2 border-t border-white/10">
              <ConnectPill />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
