// components/AppReady.tsx
"use client";

import { useEffect } from "react";

/**
 * AppReady: announces to the Farcaster/Base Mini App host that the UI is ready.
 * - Works whether the SDK is injected via <script> or bundled via ESM.
 * - Quietly degrades when *not* inside a Mini App (so it’s safe on web).
 */
export default function AppReady() {
  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | null = null;

    const d = document.documentElement;
    const DEBUG = process.env.NEXT_PUBLIC_MINI_DEBUG === "true";

    /** Locate the SDK (globals first, ESM as fallback). */
    async function getSdk(): Promise<any | null> {
      const g: any = globalThis as any;
      if (g?.farcaster?.miniapp?.sdk) return g.farcaster.miniapp.sdk;
      if (g?.Farcaster?.mini?.sdk) return g.Farcaster.mini.sdk;
      try {
        const mod: any = await import("@farcaster/miniapp-sdk");
        return mod?.sdk ?? mod?.default ?? null;
      } catch {
        return null;
      }
    }

    /** Best-effort Mini detection (never throws). */
    async function probeMini(sdk: any): Promise<boolean> {
      try {
        if (typeof sdk?.isInMiniApp === "function") {
          // small timeout to avoid hanging during cold starts
          const p = sdk.isInMiniApp(150);
          const t = new Promise<boolean>((r) => setTimeout(() => r(false), 180));
          return await Promise.race([p, t]);
        }
      } catch {}
      // Fallback UA sniff (harmless if it’s wrong)
      try {
        const ua = navigator.userAgent || "";
        if (/BaseApp|FarcasterMini|Warpcast/i.test(ua)) return true;
      } catch {}
      return false;
    }

    /** Fire a single ready(), with a short timeout gate. */
    async function fireReadyOnce() {
      if (cancelled) return;
      const sdk = await getSdk();
      if (!sdk) return;

      // stamp a tiny debug attribute
      try {
        const isMini = await probeMini(sdk);
        d.setAttribute("data-fc-mini", String(isMini));
        if (DEBUG) {
          const ctxSrc = sdk.context;
          const ctx = typeof ctxSrc === "function" ? await ctxSrc() : await ctxSrc;
          // eslint-disable-next-line no-console
          console.log("[Mini] ready() run. isMini:", isMini, ctx ?? null);
        }
      } catch {}

      try {
        await Promise.race([
          Promise.resolve(sdk.actions?.ready?.()),
          new Promise((r) => setTimeout(r, 500)),
        ]);
      } catch {
        // Swallow: we never want ready() to break the web app
      }
    }

    /** Heartbeat ready(): nudge late SDK injection for a few seconds. */
    function startHeartbeat() {
      if (iv) return;
      let ticks = 0;
      iv = setInterval(async () => {
        if (cancelled) return;
        ticks += 1;
        try {
          const sdk = await getSdk();
          if (sdk?.actions?.ready) {
            sdk.actions.ready().catch(() => {});
          }
          // also try legacy global just in case
          (globalThis as any).farcaster?.actions?.ready?.();
        } catch {}
        if (ticks >= 40) { // ~6s at 150ms
          if (iv) clearInterval(iv);
          iv = null;
        }
      }, 150);
    }

    // Initial announce
    fireReadyOnce();
    startHeartbeat();

    // Re-announce on common visibility/activation events
    const again = () => fireReadyOnce();
    window.addEventListener("pageshow", again);
    window.addEventListener("focus", again);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) fireReadyOnce();
    });

    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
      window.removeEventListener("pageshow", again);
      window.removeEventListener("focus", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, []);

  return null;
}
