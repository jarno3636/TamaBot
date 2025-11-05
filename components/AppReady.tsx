"use client";
import { useEffect } from "react";
import { farcasterReady } from "@/lib/farcasterReady";

export default function AppReady() {
  useEffect(() => {
    (async () => {
      // Try official v2 SDK
      const ctx = await farcasterReady();
      if (ctx?.user) {
        console.log("🎯 Mini app context user:", ctx.user);
        return;
      }

      // Fallback to old globals
      let tries = 0;
      const interval = setInterval(() => {
        tries++;
        try { (window as any)?.farcaster?.actions?.ready?.(); } catch {}
        try { (window as any)?.Farcaster?.mini?.sdk?.actions?.ready?.(); } catch {}
        if (tries > 60) clearInterval(interval);
      }, 150);

      window.addEventListener("focus", () => {
        try { (window as any)?.farcaster?.actions?.ready?.(); } catch {}
      });
    })();
  }, []);

  return null;
}
