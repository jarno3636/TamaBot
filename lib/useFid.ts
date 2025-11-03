// lib/useFid.ts
"use client";

import { useEffect, useState } from "react";

function getMiniKit(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;
}

async function getMiniSdk(): Promise<any | null> {
  if (typeof window === "undefined") return null;
  try {
    const mod = (await import("@farcaster/miniapp-sdk")) as any;
    return mod?.sdk ?? mod?.default ?? (window as any)?.farcaster?.miniapp?.sdk ?? null;
  } catch {
    return (window as any)?.farcaster?.miniapp?.sdk ?? null;
  }
}

export function isFarcasterUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Warpcast|Farcaster|FarcasterMini/i.test(navigator.userAgent || "");
}

export function isInsideMini(): boolean {
  if (typeof window === "undefined") return false;
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  return isFarcasterUA() || inIframe || !!getMiniKit();
}

function setCookie(name: string, value: string, days = 365) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; samesite=lax`;
  } catch {}
}

export function clearFidStorage() {
  try { localStorage.removeItem("fid"); } catch {}
  try { document.cookie = `fid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`; } catch {}
}

export function useFid() {
  const [fid, setFidState] = useState<number | null>(null);
  const [inside, setInside] = useState(false);
  const [loading, setLoading] = useState(true);

  // set + persist helper
  function setFid(n: number | null) {
    setFidState(n);
    if (n && Number.isFinite(n) && n > 0) {
      try { localStorage.setItem("fid", String(n)); } catch {}
      setCookie("fid", String(n));
    }
  }

  useEffect(() => {
    setInside(isInsideMini());

    // 1) URL ?fid=123
    try {
      const p = new URLSearchParams(window.location.search);
      const q = p.get("fid");
      if (q && /^\d+$/.test(q)) {
        const n = Number(q);
        setFid(n);
        setLoading(false);
        return;
      }
    } catch {}

    // 2) Base MiniKit globals
    try {
      const mk = getMiniKit();
      const mkFid = mk?.user?.fid ?? mk?.context?.user?.fid;
      const n = Number(mkFid);
      if (Number.isFinite(n) && n > 0) {
        setFid(n);
        setLoading(false);
        return;
      }
    } catch {}

    // 3) Farcaster MiniApp SDK (Warpcast)
    (async () => {
      try {
        const sdk = await getMiniSdk();
        const sdkFid =
          sdk?.user?.fid ??
          sdk?.context?.user?.fid ??
          sdk?.actions?.user?.fid ??
          null;
        const n = Number(sdkFid);
        if (Number.isFinite(n) && n > 0) {
          setFid(n);
          setLoading(false);
          return;
        }
      } catch {}

      // 4) Storage fallback
      try {
        const ls = localStorage.getItem("fid") || sessionStorage.getItem("fid");
        const n = Number(ls);
        setFidState(Number.isFinite(n) && n > 0 ? n : null);
      } catch {}

      setLoading(false);
    })();
  }, []);

  return { fid, setFid, insideMini: inside, loading };
}
