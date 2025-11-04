// lib/useMiniContext.ts
"use client";

import { useEffect, useRef, useState } from "react";

/** Minimal SDK shape per Farcaster docs */
type MiniAppSdk = {
  actions?: { ready?: () => Promise<void> | void };
  context?: { user?: { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string } };
  user?: { fid?: number | string; username?: string; pfpUrl?: string; pfp_url?: string }; // some builds also mirror on root
};

function isWarpcastUA() {
  if (typeof navigator === "undefined") return false;
  return /Warpcast|Farcaster|FarcasterMini/i.test(navigator.userAgent || "");
}
function inIframe() {
  if (typeof window === "undefined") return false;
  try { return window.self !== window.top; } catch { return true; }
}
function asNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function readStoredFid(): number | null {
  try {
    const v = localStorage.getItem("fid") || sessionStorage.getItem("fid") || "";
    return asNum(v);
  } catch { return null; }
}
function persistFid(fid: number) {
  try {
    localStorage.setItem("fid", String(fid));
    document.cookie = `fid=${encodeURIComponent(String(fid))}; path=/; max-age=${60*60*24*365}; samesite=lax`;
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
      const looksLikeMini = isWarpcastUA() || inIframe();
      setInMini(looksLikeMini);

      // 1) dynamic import of SDK per docs
      let sdk: MiniAppSdk | null = null;
      try {
        const mod = (await import("@farcaster/miniapp-sdk")) as any;
        sdk = (mod?.sdk ?? mod?.default ?? null) as MiniAppSdk | null;
      } catch {
        sdk = null;
      }

      // 2) call ready() quickly as recommended
      try {
        await Promise.race([
          Promise.resolve(sdk?.actions?.ready?.()),
          new Promise(res => setTimeout(res, 800)),
        ]);
      } catch {}

      // 3) read context from SDK exactly as docs show
      let foundFid =
        asNum(sdk?.context?.user?.fid) ??
        asNum(sdk?.user?.fid) ??
        readStoredFid();

      // If still missing but we’re clearly in mini, poll briefly (context can land a tick later)
      const start = Date.now();
      while (!foundFid && looksLikeMini && Date.now() - start < 1200) {
        await new Promise(res => setTimeout(res, 120));
        foundFid =
          asNum(sdk?.context?.user?.fid) ??
          asNum(sdk?.user?.fid) ??
          null;
      }

      if (!alive.current) return;

      if (foundFid) {
        setFid(foundFid);
        persistFid(foundFid);
      } else {
        setFid(null);
      }

      const rawUser = sdk?.context?.user ?? sdk?.user ?? null;
      setUser(
        rawUser
          ? {
              fid: asNum(rawUser.fid) ?? undefined,
              username: rawUser.username,
              pfpUrl: (rawUser as any).pfpUrl || (rawUser as any).pfp_url,
            }
          : null
      );

      setLoading(false);
    })();
  }, []);

  // Expose a tiny debug string for on-screen overlay
  const debug = `mini:${inMini ? "true" : "false"} · load:${loading ? "true" : "false"} · fid:${fid ?? "—"} · pfp:${user?.pfpUrl ? "y" : "n"}`;

  return { loading, inMini, fid, user, debug };
}
