// lib/useMiniContext.ts
"use client";

import { useEffect, useRef, useState } from "react";

type MiniUserRaw = { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string };
type MiniAppSdk = {
  actions?: { ready?: () => Promise<void> | void };
  user?: MiniUserRaw;
  context?: { user?: MiniUserRaw };
};

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
        // Heuristic “in mini/webview”
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const looksLikeWebView = /Warpcast|Farcaster|FarcasterMini|Base\sApp|Coinbase|ReactNativeWebView/i.test(ua);
        setInMini(looksLikeWebView || (() => { try { return window.self !== window.top; } catch { return true; } })());

        // 1) Best effort: dynamic import SDK if present
        let sdk: MiniAppSdk | null = null;
        try {
          const mod = (await import("@farcaster/miniapp-sdk").catch(() => null)) as any;
          sdk = (mod?.sdk ?? mod?.default) || null;
        } catch {}

        // 2) Ask host to get ready (no-op if not supported)
        try { await Promise.race([Promise.resolve(sdk?.actions?.ready?.()), new Promise(r => setTimeout(r, 800))]); } catch {}

        // 3) Read from SDK/context if available
        const fromSdk = num(sdk?.user?.fid ?? sdk?.context?.user?.fid);

        // 4) Listen for WebView postMessage context (some Warpcast builds)
        let postMessageFid: number | null = null;
        let postMessageUser: MiniUserRaw | null = null;

        const onMsg = (ev: MessageEvent) => {
          try {
            const data = ev?.data || ev;
            // Accept a few shapes
            const maybe =
              data?.context?.user ??
              data?.user ??
              (typeof data === "string" ? JSON.parse(data) : null);
            const f = num(maybe?.fid);
            if (f && alive.current) {
              postMessageFid = f;
              postMessageUser = maybe;
              setFid(f);
              persistFid(f);
              setUser({ fid: f, username: maybe?.username, pfpUrl: maybe?.pfpUrl || maybe?.pfp_url });
            }
          } catch {}
        };

        window.addEventListener("message", onMsg);
        // Proactively ask the host for context (harmless if ignored)
        try {
          // common patterns some clients listen for
          window.parent?.postMessage?.({ type: "farcaster:context:request" }, "*");
          (window as any).ReactNativeWebView?.postMessage?.(JSON.stringify({ type: "context:request" }));
        } catch {}

        // Give the host a short time to reply
        await new Promise(r => setTimeout(r, 900));
        window.removeEventListener("message", onMsg);

        // 5) Fallback: URL/localStorage
        const fromStorage = readStoredFid();

        const resolved = fromSdk ?? postMessageFid ?? fromStorage ?? null;
        const resolvedUser: MiniUser | null =
          postMessageUser
            ? {
                fid: num(postMessageUser.fid) ?? undefined,
                username: postMessageUser.username,
                pfpUrl: postMessageUser.pfpUrl || postMessageUser.pfp_url,
              }
            : (sdk?.user || sdk?.context?.user)
            ? {
                fid: num((sdk?.user || sdk?.context?.user)?.fid) ?? undefined,
                username: (sdk?.user || sdk?.context?.user)?.username,
                pfpUrl: (sdk?.user || sdk?.context?.user)?.pfpUrl || (sdk?.user || sdk?.context?.user)?.pfp_url,
              }
            : null;

        if (alive.current) {
          setFid(resolved);
          if (resolved) persistFid(resolved);
          setUser(resolvedUser);
        }
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user };
}
