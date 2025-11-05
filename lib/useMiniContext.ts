// lib/useMiniContext.ts
"use client";

import { useEffect, useRef, useState } from "react";

/* ---------------- Types ---------------- */
type MiniUserRaw = {
  fid?: number | string;
  username?: string;
  pfpUrl?: string;
  pfp_url?: string;
};

type MiniUser = { fid?: number; username?: string; pfpUrl?: string };

/* --------------- Utils ---------------- */
function num(n: unknown): number | null {
  const x = Number((n as any) ?? NaN);
  return Number.isFinite(x) && x > 0 ? x : null;
}

function readStoredFid(): number | null {
  try {
    const v =
      localStorage.getItem("fid") ||
      sessionStorage.getItem("fid") ||
      new URLSearchParams(location.search).get("fid") ||
      "";
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

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object";

/* --------------- Hook ---------------- */
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
        // Detect “embedded / webview”
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const looksLikeWebView = /Warpcast|Farcaster|FarcasterMini|Base\\sApp|Coinbase|ReactNativeWebView/i.test(ua);
        setInMini(looksLikeWebView || (() => { try { return window.self !== window.top; } catch { return true; } })());

        /* ---------- 1) Canonical path: v2 SDK global ---------- */
        let ctxUser: MiniUserRaw | null = null;
        try {
          const fc: any = (window as any).Farcaster?.mini?.sdk;
          if (fc?.context) {
            const ctx = await fc.context(); // { user: {...} } in v2
            const raw = (ctx && (ctx.user || (ctx.requesterUser ?? null))) || null;
            if (raw) ctxUser = raw as MiniUserRaw;
          }
        } catch {}

        /* ---------- 2) Older globals (rare, but harmless) ---------- */
        if (!ctxUser) {
          const g: any = (window as any);
          const maybe = g.farcaster?.user || g.farcaster?.context?.user || null;
          if (maybe) ctxUser = maybe as MiniUserRaw;
        }

        /* ---------- 3) Message bridge fallback ---------- */
        let pmFid: number | null = null;
        let pmUser: MiniUserRaw | null = null;

        const onMsg = (ev: MessageEvent) => {
          try {
            const d: any = ev?.data ?? ev;
            const maybe = d?.context?.user || d?.user || (typeof d === "string" ? JSON.parse(d) : null);
            if (isObj(maybe)) {
              const f = num((maybe as any).fid);
              if (f && alive.current) {
                pmFid = f;
                pmUser = maybe as MiniUserRaw;
                setFid(f);
                persistFid(f);
                setUser({ fid: f, username: (maybe as any).username, pfpUrl: (maybe as any).pfpUrl || (maybe as any).pfp_url });
              }
            }
          } catch {}
        };

        window.addEventListener("message", onMsg);
        try {
          window.parent?.postMessage?.({ type: "farcaster:context:request" }, "*");
          (window as any).ReactNativeWebView?.postMessage?.(JSON.stringify({ type: "context:request" }));
        } catch {}

        await new Promise(r => setTimeout(r, 900));
        window.removeEventListener("message", onMsg);

        /* ---------- 4) Resolve best source ---------- */
        const fromStorage = readStoredFid();
        const resolvedUser = (pmUser ?? ctxUser) || null;
        const resolvedFid = num(resolvedUser?.fid) ?? pmFid ?? fromStorage ?? null;

        if (alive.current) {
          setFid(resolvedFid);
          if (resolvedFid) persistFid(resolvedFid);
          setUser(
            resolvedUser
              ? {
                  fid: num(resolvedUser.fid) ?? undefined,
                  username: resolvedUser.username,
                  pfpUrl: resolvedUser.pfpUrl || resolvedUser.pfp_url,
                }
              : null
          );
        }
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user };
}

export type { MiniUser };
