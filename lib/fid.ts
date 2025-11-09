// lib/fid.ts
export function coerceFID(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Try multiple known places a Farcaster Mini-App might expose the viewer FID. */
function tryFidFromMiniApp(): number | null {
  const w = typeof window !== "undefined" ? (window as any) : undefined;
  if (!w) return null;

  // A few common SDK shapes; all optional/safe:
  const candidates = [
    w?.farcaster?.context?.user?.fid,
    w?.farcaster?.session?.user?.fid,
    w?.MiniKit?.context?.user?.fid,
    w?.miniKit?.context?.user?.fid,
    w?.miniapp?.context?.user?.fid,
    w?.__MINIAPP__?.viewer?.fid,
    w?.__FC__?.viewer?.fid,
  ];

  for (const c of candidates) {
    const fid = coerceFID(c);
    if (fid) return fid;
  }
  return null;
}

/** Extract `fid` from URL ?fid=... */
function tryFidFromURL(): number | null {
  try {
    const usp = new URLSearchParams(window.location.search);
    const q = usp.get("fid");
    return coerceFID(q);
  } catch {
    return null;
  }
}

const LS_KEY = "basebots:last_fid";

export function saveFIDToLocalStorage(fid: number) {
  try { localStorage.setItem(LS_KEY, String(fid)); } catch {}
}
function tryFidFromLocalStorage(): number | null {
  try { return coerceFID(localStorage.getItem(LS_KEY)); } catch { return null; }
}

/** Resolves a reasonable FID if available; returns null if nothing found. */
export function resolveInitialFID(): number | null {
  // Order matters:
  return (
    tryFidFromURL() ??
    tryFidFromMiniApp() ??
    tryFidFromLocalStorage() ??
    null
  );
}
