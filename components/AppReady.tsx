// components/AppReady.tsx
"use client";

import { useEffect } from "react";

export default function AppReady() {
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    let to: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        // Dynamic import so SSR never touches browser globals
        const mod: any = await import("@farcaster/miniapp-sdk");
        const sdk =
          mod?.sdk ??
          mod?.default ??
          mod; // be tolerant to various bundlings

        // Fire an early ready() but never await forever
        await Promise.race([
          Promise.resolve(sdk?.actions?.ready?.()),
          new Promise((r) => setTimeout(r, 800)),
        ]);
      } catch {
        // not in a mini app or SDK missing — harmless
      }

      // Also ping any known globals (covers some Warpcast variants)
      const ping = () => {
        try { (window as any)?.farcaster?.actions?.ready?.(); } catch {}
        try { (window as any)?.farcaster?.miniapp?.sdk?.actions?.ready?.(); } catch {}
        try { (window as any)?.Farcaster?.mini?.sdk?.actions?.ready?.(); } catch {}
      };

      ping();
      iv = setInterval(ping, 200);       // retry briefly
      to = setTimeout(() => iv && clearInterval(iv), 6000); // stop after 6s
    })();

    return () => {
      if (iv) clearInterval(iv);
      if (to) clearTimeout(to);
    };
  }, []);

  return null;
}
