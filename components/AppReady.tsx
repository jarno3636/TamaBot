// components/AppReady.tsx
"use client";
import { useEffect } from "react";

export default function AppReady() {
  useEffect(() => {
    (async () => {
      try {
        const mod: any = await import("@farcaster/miniapp-sdk");
        const sdk: any = mod?.sdk ?? mod?.default ?? null;
        // Let the host know our UI is ready; ignore if unsupported
        await Promise.race([
          Promise.resolve(sdk?.actions?.ready?.()),
          new Promise((r) => setTimeout(r, 900)),
        ]);
      } catch {
        /* not in a Mini App; safe to ignore */
      }
    })();
  }, []);
  return null;
}
