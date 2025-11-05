// components/AppReady.tsx
"use client";
import { useEffect } from "react";

export default function AppReady() {
  useEffect(() => {
    (async () => {
      try {
        const mod: any = await import("@farcaster/miniapp-sdk");
        const sdk: any = mod?.sdk ?? mod?.default ?? null;

        // Official detection (cached by SDK)
        const isMini = (await sdk?.isInMiniApp?.(200)) ?? false;

        // Tell host we're ready (don't await forever)
        try {
          await Promise.race([
            Promise.resolve(sdk?.actions?.ready?.()),
            new Promise((r) => setTimeout(r, 800)),
          ]);
        } catch {}

        // Helpful debug
        try {
          const ctxSrc = sdk?.context;
          const ctx = typeof ctxSrc === "function" ? await ctxSrc() : await ctxSrc;
          if (process.env.NEXT_PUBLIC_MINI_DEBUG === "true") {
            console.log("[Mini] isMini:", isMini, "context:", ctx);
          }
        } catch {}
      } catch {
        // not in a mini app or SDK missing — ignore
      }
    })();
  }, []);
  return null;
}
