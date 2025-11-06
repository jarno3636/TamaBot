// components/AppReady.tsx
"use client";

import { useEffect } from "react";

export default function AppReady() {
  useEffect(() => {
    let cancelled = false;
    let pingIv: ReturnType<typeof setInterval> | null = null;

    async function getSdk(): Promise<any | null> {
      // Prefer the global (added by <script src="https://miniapps.farcaster.xyz/sdk/v2.js">)
      const g: any = (globalThis as any);
      if (g?.farcaster?.miniapp?.sdk) return g.farcaster.miniapp.sdk;
      if (g?.Farcaster?.mini?.sdk) return g.Farcaster.mini.sdk;
      // Fallback to ESM import if available
      try {
        const mod: any = await import("@farcaster/miniapp-sdk");
        return mod?.sdk ?? mod?.default ?? null;
      } catch {
        return null;
      }
    }

    async function readyOnce() {
      if (cancelled) return;
      const sdk = await getSdk();
      if (!sdk) return;

      // Best-effort environment probe (don’t throw if not supported)
      let isMini = false;
      try {
        isMini = !!(await sdk.isInMiniApp?.(200));
      } catch {}

      // Fire a quick, non-blocking ready()
      try {
        await Promise.race([
          Promise.resolve(sdk.actions?.ready?.()),
          new Promise((r) => setTimeout(r, 600)),
        ]);
      } catch {}

      // Optional: light debug
      try {
        if (process.env.NEXT_PUBLIC_MINI_DEBUG === "true") {
          const ctxSrc = sdk.context;
          const ctx = typeof ctxSrc === "function" ? await ctxSrc() : await ctxSrc;
          // eslint-disable-next-line no-console
          console.log("[Mini] isMini:", isMini, "context:", ctx);
        }
      } catch {}
    }

    // Ping multiple times (hosts sometimes attach late on resume)
    function startHeartbeat() {
      if (pingIv) return;
      pingIv = setInterval(() => {
        getSdk().then((sdk) => {
          if (!sdk) return;
          try { sdk.actions?.ready?.(); } catch {}
          try { (globalThis as any).farcaster?.actions?.ready?.(); } catch {}
        });
      }, 150);
      // Stop after ~10s of heartbeats
      setTimeout(() => {
        if (pingIv) clearInterval(pingIv);
        pingIv = null;
      }, 10_000);
    }

    // Initial “ready”
    readyOnce();
    startHeartbeat();

    // Re-announce on common lifecycle events
    const onShow = () => readyOnce();
    const onFocus = () => readyOnce();
    const onVisible = () => { if (!document.hidden) readyOnce(); };

    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (pingIv) clearInterval(pingIv);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
