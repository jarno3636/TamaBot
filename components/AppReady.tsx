// components/AppReady.tsx
"use client";
import { useEffect } from "react";

export default function AppReady() {
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    let count = 0;
    const ping = () => {
      try { (window as any).Farcaster?.mini?.sdk?.actions?.ready?.(); } catch {}
      try { (window as any).farcaster?.actions?.ready?.(); } catch {}
      if (++count > 40 && iv) clearInterval(iv);
    };
    ping(); iv = setInterval(ping, 150);
    return () => iv && clearInterval(iv);
  }, []);
  return null;
}
