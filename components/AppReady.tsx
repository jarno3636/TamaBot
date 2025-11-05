// components/AppReady.tsx
"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget "ready" pings for Warpcast Mini Apps.
 * - Does NOT await anything (to avoid hangs)
 * - Tries v2 SDK and several legacy/global shapes
 * - Retries briefly to catch late SDK injection
 */
export default function AppReady() {
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const ping = () => {
      attempts++;
      try { (window as any)?.farcaster?.actions?.ready?.(); } catch {}
      try { (window as any)?.farcaster?.miniapp?.sdk?.actions?.ready?.(); } catch {}
      try { (window as any)?.Farcaster?.mini?.sdk?.actions?.ready?.(); } catch {}
    };

    // v2 SDK (cdn.farcaster.xyz) if it landed
    (async () => {
      try {
        const mod: any = await import("@farcaster/miniapp-sdk").catch(() => null);
        const sdk = mod?.sdk ?? mod?.default ?? null;
        if (sdk?.actions?.ready) {
          // don't await; just trigger
          try { sdk.actions.ready(); } catch {}
        }
      } catch {}
    })();

    // fire immediately + retry for ~8s
    ping();
    iv = setInterval(() => {
      ping();
      if (attempts >= 60 && iv) { clearInterval(iv); iv = null; }
    }, 130);

    // also ping on lifecycle moments
    const onShow = () => ping();
    document.addEventListener("DOMContentLoaded", onShow, { once: true });
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      if (iv) clearInterval(iv);
      document.removeEventListener("DOMContentLoaded", onShow);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, []);

  return null;
}
