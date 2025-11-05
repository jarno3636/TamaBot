// lib/useMiniContext.ts
"use client";

import { useEffect, useRef, useState } from "react";

/** ------ Shapes ------ */
type MiniUserRaw = { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string };
export type MiniUser = { fid?: number; username?: string; pfpUrl?: string };

// ✅ Strict variant used only after we’ve verified fid is a number
type MiniUserStrict = { fid: number; username?: string; pfpUrl?: string };

type MiniSdk = {
  isInMiniApp?: (timeoutMs?: number) => Promise<boolean>;
  getCapabilities?: () => Promise<string[]>;
  context?: any | Promise<any> | (() => any | Promise<any>);
  actions?: { ready?: () => Promise<void> | void };
};

/** ------ Utils ------ */
const toNum = (v: unknown): number | null => {
  const n = Number((v as any) ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const normUser = (raw: any): MiniUser | null => {
  if (!raw) return null;
  const u = raw.user ?? raw;
  return u
    ? {
        fid: toNum(u.fid) ?? undefined,
        username: u.username ?? undefined,
        pfpUrl: u.pfpUrl ?? u.pfp_url ?? undefined,
      }
    : null;
};

const readStoredFid = (): number | null => {
  try {
    const q = new URLSearchParams(location.search).get("fid");
    if (q) return toNum(q);
    const l = localStorage.getItem("fid");
    if (l) return toNum(l);
    const s = sessionStorage.getItem("fid");
    if (s) return toNum(s);
  } catch {}
  return null;
};

const persistFid = (fid: number) => {
  try {
    localStorage.setItem("fid", String(fid));
    document.cookie = `fid=${encodeURIComponent(String(fid))}; path=/; samesite=lax; max-age=${60 * 60 * 24 * 365}`;
  } catch {}
};

/** ------ Hook ------ */
export function useMiniContext() {
  const [loading, setLoading] = useState(true);
  const [inMini, setInMini] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<MiniUser | null>(null);
  const [capabilities, setCapabilities] = useState<string[] | null>(null);

  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  useEffect(() => {
    (async () => {
      try {
        // 1) Dynamic import (safe in builds)
        let sdk: MiniSdk | null = null;
        try {
          const mod: any = await import("@farcaster/miniapp-sdk");
          sdk = (mod?.sdk ?? mod?.default ?? null) as MiniSdk | null;
        } catch {
          sdk = null;
        }

        // 2) Official detection
        const isMini = (await (sdk?.isInMiniApp?.(150).catch(() => false))) || false;
        setInMini(isMini);

        // 3) Ready ping (non-blocking)
        try {
          await Promise.race([
            Promise.resolve(sdk?.actions?.ready?.()),
            new Promise((r) => setTimeout(r, 800)),
          ]);
        } catch {}

        // 4) Prefer official context + capabilities
        let bestUser: MiniUser | null = null;

        if (isMini) {
          try {
            const c = sdk?.context;
            const ctx = typeof c === "function" ? await c() : await c;
            bestUser = normUser(ctx);
          } catch {}
          try {
            const caps = await sdk?.getCapabilities?.();
            if (Array.isArray(caps)) setCapabilities(caps);
          } catch {
            setCapabilities(null);
          }
        }

        // 5) Race a postMessage context
        if (!bestUser?.fid) {
          // ✅ Make pmUser strictly typed *only after* fid is validated
          let pmUser: MiniUserStrict | null = null;

          const onMsg = (ev: MessageEvent) => {
            try {
              const d: any = ev?.data ?? ev;
              const raw = d?.context?.user ?? d?.user ?? (typeof d === "string" ? JSON.parse(d) : null);
              const u = normUser(raw);
              if (u?.fid && typeof u.fid === "number" && alive.current) {
                pmUser = { fid: u.fid, username: u.username, pfpUrl: u.pfpUrl };
              }
            } catch {}
          };

          window.addEventListener("message", onMsg);
          try {
            window.parent?.postMessage?.({ type: "farcaster:context:request" }, "*");
            (window as any).ReactNativeWebView?.postMessage?.(JSON.stringify({ type: "context:request" }));
          } catch {}
          await new Promise((r) => setTimeout(r, 900));
          window.removeEventListener("message", onMsg);

          // ✅ No optional read; pmUser has required `fid: number` if set
          if (pmUser) bestUser = pmUser;
        }

        // 6) Final fallback (web/dev)
        if (!bestUser?.fid) {
          const stored = readStoredFid();
          if (stored) bestUser = { fid: stored };
        }

        if (!alive.current) return;

        setUser(bestUser);
        setFid(bestUser?.fid ?? null);
        if (bestUser?.fid) persistFid(bestUser.fid);
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user, capabilities };
}
