// lib/useMiniContext.ts
"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type MiniUser = {
  fid?: number;
  username?: string;
  pfpUrl?: string;
};

function getFromQuery(): number | null {
  try {
    const f = new URLSearchParams(window.location.search).get("fid");
    const n = f ? Number(f) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function getFromMiniGlobals(): number | null {
  try {
    const w = window as any;
    const mk = w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;
    const raw = mk?.user?.fid ?? mk?.context?.user?.fid ?? mk?.context?.fid;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function getFromLocal(): number | null {
  try {
    const v =
      window.localStorage.getItem("fid") ||
      window.sessionStorage.getItem("fid") ||
      "";
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Basic UA/iframe heuristics for running inside Farcaster mini */
export function isInMini(): boolean {
  try {
    if (sdk?.isInMiniApp?.()) return true;
    const ua = navigator.userAgent || "";
    if (/Farcaster|Warpcast|FarcasterMini/i.test(ua)) return true;
    // iframe
    return window.self !== window.top;
  } catch {
    return false;
  }
}

export function useMiniContext() {
  const [loading, setLoading] = useState(true);
  const [inMini, setInMini] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<MiniUser | null>(null);
  const [ctx, setCtx] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setInMini(isInMini());

        // Hide splash if supported (don’t block)
        try {
          await Promise.race([
            Promise.resolve(sdk?.actions?.ready?.()),
            new Promise((r) => setTimeout(r, 600)),
          ]);
        } catch {}

        // 1) preferred: sdk.context.user
        const c: any =
          (sdk as any)?.context ||
          (sdk as any)?.ctx ||
          null;

        setCtx(c);

        const fromSdk =
          Number((c?.user?.fid ?? c?.fid) ?? NaN) ||
          Number(((sdk as any)?.user?.fid ?? (sdk as any)?.context?.user?.fid) ?? NaN);

        // 2) globals (Base MiniKit, etc.)
        const fromGlobals = getFromMiniGlobals();

        // 3) URL ?fid=
        const fromQuery = getFromQuery();

        // 4) local cache
        const fromLocal = getFromLocal();

        const candidate =
          (Number.isFinite(fromSdk) && fromSdk > 0 && Number(fromSdk)) ||
          fromGlobals ||
          fromQuery ||
          fromLocal ||
          null;

        if (candidate) {
          setFid(candidate);
          try { localStorage.setItem("fid", String(candidate)); } catch {}
        }

        // Optional mini user fields if present
        setUser({
          fid: candidate ?? undefined,
          username: c?.user?.username,
          pfpUrl: c?.user?.pfpUrl || c?.user?.pfp_url,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user, ctx };
}
