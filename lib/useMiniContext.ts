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

type MiniAppSdk = {
  actions?: { ready?: () => Promise<void> | void };
  user?: MiniUserRaw;
  context?: { user?: MiniUserRaw };
};

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

function isMiniUserRaw(x: any): x is MiniUserRaw {
  return x && typeof x === "object";
}

/* --------------- Hook ---------------- */
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
        setInMini(
          looksLikeWebView ||
            (() => {
              try { return window.self !== window.top; } catch { return true; }
            })()
        );

        // 1) Try dynamic SDK import (optional)
        let sdk: MiniAppSdk | null = null;
        try {
          const mod = (await import("@farcaster/miniapp-sdk").catch(() => null)) as any;
          sdk = (mod?.sdk ?? mod?.default) || null;
        } catch {}

        // 2) Tell host we’re ready (don’t hang)
        try {
          await Promise.race([
            Promise.resolve(sdk?.actions?.ready?.()),
            new Promise((r) => setTimeout(r, 800)),
          ]);
        } catch {}

        // 3) Read from SDK/context if available
        const sdkUser = (sdk?.user || sdk?.context?.user) as MiniUserRaw | undefined;
        const fromSdk = num(sdkUser?.fid);

        // 4) Listen for WebView postMessage context (some Warpcast builds)
        let postMessageFid: number | null = null;
        let postMessageUser: MiniUserRaw | undefined = undefined;

        const onMsg = (ev: MessageEvent) => {
          try {
            const data: any = ev?.data ?? ev;
            const maybe =
              data?.context?.user ??
              data?.user ??
              (typeof data === "string" ? JSON.parse(data) : null);

            if (isMiniUserRaw(maybe)) {
              const f = num(maybe.fid);
              if (f && alive.current) {
                postMessageFid = f;
                postMessageUser = maybe;
                setFid(f);
                persistFid(f);
                setUser({
                  fid: f,
                  username: maybe.username,
                  pfpUrl: maybe.pfpUrl || maybe.pfp_url,
                });
              }
            }
          } catch {
            // ignore malformed messages
          }
        };

        window.addEventListener("message", onMsg);
        // Proactively ask the host for context (harmless if ignored)
        try {
          window.parent?.postMessage?.({ type: "farcaster:context:request" }, "*");
          (window as any).ReactNativeWebView?.postMessage?.(
            JSON.stringify({ type: "context:request" })
          );
        } catch {}

        // Give the host a short time to reply
        await new Promise((r) => setTimeout(r, 900));
        window.removeEventListener("message", onMsg);

        // 5) Fallback: URL/localStorage
        const fromStorage = readStoredFid();

        const resolved = fromSdk ?? postMessageFid ?? fromStorage ?? null;

        // Build a normalized user object (use simple if/else to keep TS happy)
        let resolvedUser: MiniUser | null = null;
        if (postMessageUser && isMiniUserRaw(postMessageUser)) {
          const f = num(postMessageUser.fid) ?? undefined;
          resolvedUser = {
            fid: f,
            username: postMessageUser.username,
            pfpUrl: postMessageUser.pfpUrl || postMessageUser.pfp_url,
          };
        } else if (sdkUser && isMiniUserRaw(sdkUser)) {
          const f = num(sdkUser.fid) ?? undefined;
          resolvedUser = {
            fid: f,
            username: sdkUser.username,
            pfpUrl: sdkUser.pfpUrl || sdkUser.pfp_url,
          };
        }

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
