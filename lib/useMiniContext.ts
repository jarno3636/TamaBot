// lib/useMiniContext.ts
"use client";

import { useEffect, useRef, useState } from "react";

// Tolerant SDK shape (Warpcast Mini + Base MiniKit)
type MiniAppSdk = {
  isInMiniApp?: () => boolean;
  actions?: {
    ready?: () => Promise<void> | void;
    openUrl?: (url: string | { url: string }) => Promise<void> | void;
  };
  user?: { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string };
  context?: { user?: { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string } };
};

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

function getMiniKit(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;
}

export type MiniUser = { fid?: number; username?: string; pfpUrl?: string };

export function isInMini(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const warp = /Warpcast|Farcaster|FarcasterMini/i.test(ua);
  const baseUA = /Base\sApp|Coinbase|CoinbaseWallet|CBBrowser|CBWallet/i.test(ua);
  let iframe = false;
  try { iframe = window.self !== window.top; } catch { iframe = true; }
  return warp || baseUA || iframe || !!getMiniKit();
}

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
        setInMini(isInMini());

        // Dynamic import avoids SSR issues
        let sdk: MiniAppSdk | null = null;
        try {
          const mod = (await import("@farcaster/miniapp-sdk").catch(() => null)) as
            | { sdk?: MiniAppSdk; default?: MiniAppSdk }
            | null;
          sdk = (mod?.sdk ?? mod?.default) || null;
        } catch {}

        const w: any = typeof window !== "undefined" ? window : {};
        const mk = w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;

        // Signal ready (don’t hang splash)
        try {
          await Promise.race([
            Promise.resolve(sdk?.actions?.ready?.()),
            new Promise((r) => setTimeout(r, 900)),
          ]);
          if (mk?.setFrameReady) await Promise.resolve(mk.setFrameReady());
        } catch {}

        // Try URL ?fid= first
        let detectedFid: number | null = null;
        try {
          const q = new URLSearchParams(window.location.search).get("fid");
          detectedFid = q && /^\d+$/.test(q) ? Number(q) : null;
        } catch {}

        // Then MiniKit / SDK
        const fromMkFid = num(mk?.user?.fid ?? mk?.context?.user?.fid);
        const fromSdkFid = num((sdk as any)?.user?.fid ?? (sdk as any)?.context?.user?.fid);

        detectedFid = detectedFid ?? fromMkFid ?? fromSdkFid ?? readStoredFid();

        // Late hydration poll (~1.2s)
        if (!detectedFid && (sdk || mk)) {
          const start = Date.now();
          while (!detectedFid && Date.now() - start < 1200) {
            await new Promise((r) => setTimeout(r, 120));
            const refMkFid = num(mk?.user?.fid ?? mk?.context?.user?.fid);
            const refSdkFid = num((sdk as any)?.user?.fid ?? (sdk as any)?.context?.user?.fid);
            detectedFid = refMkFid ?? refSdkFid ?? null;
          }
        }

        if (!alive.current) return;

        if (detectedFid) {
          setFid(detectedFid);
          persistFid(detectedFid);
        } else {
          setFid(null);
        }

        const rawUser =
          mk?.user ??
          mk?.context?.user ??
          (sdk as any)?.user ??
          (sdk as any)?.context?.user ??
          null;

        setUser(
          rawUser
            ? {
                fid: num(rawUser.fid) ?? undefined,
                username: rawUser.username,
                pfpUrl: rawUser.pfpUrl || rawUser.pfp_url,
              }
            : null
        );
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user };
}
