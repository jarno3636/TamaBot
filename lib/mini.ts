// lib/mini.ts
"use client";

import {
  SITE_URL,
  MINIAPP_URL,
  isFarcasterUA,
  isBaseAppUA,
  buildFarcasterComposeUrl,
  fcPreferMini,
  ensureReady,
  getMiniSdk,
  openInMini,
  composeCast,
} from "./miniapp";

/** Basic UA/iframe check — matches your MiniAppGate heuristic */
export function isInsideMini(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const inIframe = window.self !== window.top;
    const pathHint = window.location?.pathname?.startsWith?.("/mini");
    return isFarcasterUA() || inIframe || !!pathHint;
  } catch {
    return isFarcasterUA();
  }
}

/** Alias some projects call `insideMini()` directly */
export const insideMini = isInsideMini;

/** Signal “ready” to Warpcast/Base so splash doesn’t hang */
export async function miniReady(timeoutMs = 1200): Promise<void> {
  // 1) Farcaster SDK
  await ensureReady(timeoutMs);

  // 2) Base MiniKit (if present)
  try {
    const w = window as any;
    const mk = w?.miniKit || w?.coinbase?.miniKit || null;
    if (mk?.setFrameReady) await Promise.resolve(mk.setFrameReady());
  } catch {
    /* ignore */
  }
}

/** Best-effort FID detection (URL param ➜ MiniKit context ➜ storage) */
export function currentFid(): number | null {
  if (typeof window === "undefined") return null;

  // URL ?fid=123
  const p = new URLSearchParams(window.location.search);
  const fromQuery = p.get("fid");
  if (fromQuery && /^\d+$/.test(fromQuery)) return Number(fromQuery);

  // Base MiniKit context
  try {
    const w = window as any;
    const fid = w?.miniKit?.context?.fid || w?.coinbase?.miniKit?.context?.fid;
    if (fid && /^\d+$/.test(String(fid))) return Number(fid);
  } catch {
    /* ignore */
  }

  // Local/session storage fallbacks used in some flows
  try {
    const ls = window.localStorage?.getItem("fid") || window.sessionStorage?.getItem("fid");
    if (ls && /^\d+$/.test(ls)) return Number(ls);
  } catch {
    /* ignore */
  }

  return null;
}

/** Open a user’s Farcaster profile (FID) in the native host when possible */
export async function openProfile(fid?: number | null): Promise<void> {
  if (!fid) return;
  const url = `https://warpcast.com/~/profiles/${fid}`;
  const handled = await openInMini(url);
  if (!handled && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

/** Open any URL via Mini host first; fallback to web */
export async function openUrl(url: string): Promise<void> {
  const handled = await openInMini(url);
  if (!handled && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

/** Simple sign-in launcher (adjust path if you have a specific route) */
export async function miniSignin(): Promise<void> {
  // If you have a real login route, put it here:
  const loginUrl = `${SITE_URL}/login`;
  await openUrl(loginUrl);
}

/** Re-exports used elsewhere */
export {
  SITE_URL,
  MINIAPP_URL,
  isFarcasterUA,
  isBaseAppUA,
  buildFarcasterComposeUrl,
  fcPreferMini,
  getMiniSdk,
  composeCast,
};
