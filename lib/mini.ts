// lib/mini.ts
export function insideMini(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Warpcast|Farcaster|FarcasterMini/i.test(navigator.userAgent || "");
}

export function mini() {
  return (globalThis as any).MiniKit || null;
}

export function currentFid(): number | null {
  const mk = mini();
  if (mk?.user?.fid) return Number(mk.user.fid);
  // fallback from cookie if you set it on login callback
  const m = typeof document !== "undefined" ? document.cookie.match(/(?:^| )fid=([^;]+)/) : null;
  const n = m ? Number(decodeURIComponent(m[1])) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Open a URL (Mini will open overlay inside Warpcast; normal window on web)
export function openUrl(url: string) {
  const mk = mini();
  if (mk?.openURL) mk.openURL(url);
  else if (typeof window !== "undefined") window.open(url, "_blank");
}

// Compose a cast (Mini overlay or fallback to warpcast composer)
export function composeCast(text: string, attachmentUrl?: string) {
  const mk = mini();
  if (mk?.composeCast) mk.composeCast({ text, embeds: attachmentUrl ? [attachmentUrl] : [] });
  else openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`);
}
