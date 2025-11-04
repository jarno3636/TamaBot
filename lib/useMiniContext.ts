// lib/useMiniContext.ts
"use client";

import { useEffect, useRef, useState } from "react";

/** Super-tolerant SDK shape (Warpcast Mini + Base MiniKit) */
type MiniAppSdk = {
  isInMiniApp?: () => boolean;
  actions?: {
    ready?: () => Promise<void> | void;
    openUrl?: (url: string | { url: string }) => Promise<void> | void;
  };
  user?: { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string };
  context?: { user?: { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string } };
};

const DEBUG =
  (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MINI_DEBUG === "true") ||
  process.env.NEXT_PUBLIC_MINI_DEBUG === "true";

function num(n: unknown): number | null {
  const x = Number((n as any) ?? NaN);
  return Number.isFinite(x) && x > 0 ? x : null;
}

function readStoredFid(): number | null {
  try {
    const v = localStorage.getItem("fid") || sessionStorage.getItem("fid") || "";
    return num(v);
  } catch {
    return null;
  }
}

function persistFid(fid: number) {
  try {
    localStorage.setItem("fid", String(fid));
    document.cookie = `fid=${encodeURIComponent(String(fid))}; path=/; samesite=lax; max-age=${60 * 60 * 24 * 365}`;
  } catch {}
}

function getMk(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;
}

function isWarpUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Warpcast|Farcaster|FarcasterMini/i.test(navigator.userAgent || "");
}
function isBaseUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Base\sApp|Coinbase|CoinbaseWallet|CBBrowser|CBWallet/i.test(navigator.userAgent || "");
}

function isInMiniHeuristic(): boolean {
  let iframe = false;
  try { iframe = window.self !== window.top; } catch { iframe = true; }
  return isWarpUA() || isBaseUA() || iframe || !!getMk();
}

/** Try *everywhere* the FID might exist on the page right now */
async function findFidOnce(): Promise<{ fid: number | null; rawUser: any | null; where?: string[] }> {
  const where: string[] = [];
  const w: any = typeof window !== "undefined" ? window : {};

  // 0) URL ?fid=...
  try {
    const q = new URLSearchParams(window.location.search).get("fid");
    const n = q && /^\d+$/.test(q) ? Number(q) : null;
    if (n) { where.push("url"); return { fid: n, rawUser: null, where }; }
  } catch {}

  // 1) Base MiniKit globals
  try {
    const mk = getMk();
    const mkUser = mk?.user ?? mk?.context?.user;
    const n = num(mkUser?.fid);
    if (n) { where.push("minikit"); return { fid: n, rawUser: mkUser ?? null, where }; }
  } catch {}

  // 2) Farcaster miniapp SDK (module or globals)
  try {
    const mod = (await import("@farcaster/miniapp-sdk").catch(() => null)) as { sdk?: MiniAppSdk; default?: MiniAppSdk } | null;
    const sdk: any = mod?.sdk ?? mod?.default ?? w?.farcaster?.miniapp?.sdk ?? w?.sdk ?? null;

    const ctxUser =
      sdk?.user ??
      sdk?.context?.user ??
      w?.farcaster?.miniapp?.context?.user ??
      null;

    const n = num(ctxUser?.fid);
    if (n) { where.push("farcaster-sdk"); return { fid: n, rawUser: ctxUser, where }; }
  } catch {}

  // 3) Storage fallback
  const fromStore = readStoredFid();
  if (fromStore) { where.push("storage"); return { fid: fromStore, rawUser: null, where }; }

  return { fid: null, rawUser: null, where };
}

export type MiniUser = { fid?: number; username?: string; pfpUrl?: string };

export function useMiniContext() {
  const [loading, setLoading] = useState(true);
  const [inMini, setInMini] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<MiniUser | null>(null);

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    (async () => {
      try {
        setInMini(isInMiniHeuristic());

        // Ready signals (don’t hang splash)
        try {
          const mod = (await import("@farcaster/miniapp-sdk").catch(() => null)) as any;
          const sdk = mod?.sdk ?? mod?.default ?? null;
          await Promise.race([
            Promise.resolve(sdk?.actions?.ready?.()),
            new Promise((r) => setTimeout(r, 800)),
          ]);
        } catch {}
        try { getMk()?.setFrameReady?.(); } catch {}

        // First attempt
        let { fid: f, rawUser, where } = await findFidOnce();
        if (DEBUG) console.log("[mini] initial detect:", { f, where });

        // Slow poll up to ~3s (to catch late context hydration in Warpcast)
        const deadline = Date.now() + 3000;
        while (!f && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 150));
          const found = await findFidOnce();
          if (found.fid) { f = found.fid; rawUser = found.rawUser; where = found.where; break; }
        }
        if (DEBUG) console.log("[mini] final detect:", { f, where });

        if (!alive.current) return;

        if (f) {
          setFid(f);
          persistFid(f);
        } else {
          setFid(null);
        }

        const u = rawUser ?? getMk()?.user ?? getMk()?.context?.user ?? null;
        setUser(
          u ? {
            fid: num(u?.fid) ?? undefined,
            username: u?.username,
            pfpUrl: u?.pfpUrl || u?.pfp_url,
          } : null
        );
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user };
}
