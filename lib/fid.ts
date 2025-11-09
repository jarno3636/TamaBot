// lib/fid.ts
"use client";

/**
 * Best-effort FID detection:
 * - ?fid=123 or ?viewerFid=123 in URL
 * - MiniKit context (if running inside Farcaster mini app)
 * - last used FID from localStorage
 */
export function tryDetectFIDFromEnvironment(): number | null {
  if (typeof window === "undefined") return null;

  try {
    const sp = new URLSearchParams(window.location.search);
    const keys = ["fid", "viewerFid", "userFid"];
    for (const k of keys) {
      const v = sp.get(k);
      if (v && /^\d+$/.test(v)) return Number(v);
    }
  } catch {}

  try {
    // MiniKit / Farcaster mini-app contexts (defensive checks)
    const anyWin = window as any;
    const mkFid =
      anyWin?.MiniKit?.context?.user?.fid ??
      anyWin?.farcaster?.session?.fid ??
      anyWin?.frame?.context?.user?.fid ??
      null;
    if (typeof mkFid === "number" && mkFid > 0) return mkFid;
  } catch {}

  try {
    const last = localStorage.getItem("basebots.fid");
    if (last && /^\d+$/.test(last)) return Number(last);
  } catch {}

  return null;
}

/** Normalize to string for inputs */
export function detectedFIDString(): string {
  const n = tryDetectFIDFromEnvironment();
  return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

/** Store last used FID for future auto-fill */
export function rememberFID(fid: string | number) {
  try {
    const s = String(fid ?? "").trim();
    if (/^\d+$/.test(s)) localStorage.setItem("basebots.fid", s);
  } catch {}
}
