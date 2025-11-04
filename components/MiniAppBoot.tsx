"use client";
import { useEffect } from "react";

export default function MiniAppBoot() {
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    let to: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      // Try SDK if it exists
      try {
        const mod: any = await import("@farcaster/miniapp-sdk");
        const sdk = mod?.sdk ?? mod?.default;
        if (sdk?.actions?.ready) {
          await Promise.race([
            Promise.resolve(sdk.actions.ready()),
            new Promise((r) => setTimeout(r, 900)),
          ]);
        }
      } catch {}

      // Also ping known globals in case host injects late
      const ping = () => {
        try { (window as any)?.farcaster?.actions?.ready?.(); } catch {}
        try { (window as any)?.farcaster?.miniapp?.sdk?.actions?.ready?.(); } catch {}
        try { (window as any)?.Farcaster?.mini?.sdk?.actions?.ready?.(); } catch {}
      };
      ping();

      iv = setInterval(ping, 200);
      to = setTimeout(() => iv && clearInterval(iv), 6000);
    })();

    return () => {
      if (iv) clearInterval(iv);
      if (to) clearTimeout(to);
    };
  }, []);

  return null;
}
