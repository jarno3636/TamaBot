// lib/mini.ts

/** ---------------- Types & constants ---------------- */
export const MINI_UA_REGEX = /Warpcast|Farcaster|FarcasterMini/i;
export const FARCASTER_PROFILE_URL = "https://warpcast.com/~/profiles/";

type MiniActions = {
  ready?: () => Promise<void> | void;
  signin?: () => Promise<{ user?: { fid?: number | string } } | void> | void;
  addMiniApp?: () => Promise<void> | void;
  viewProfile?: (args: { fid: number }) => Promise<void> | void;
  composeCast?: (args: { text: string; embeds?: string[] }) => Promise<void> | void;
  openURL?: (url: string) => Promise<void> | void;
};

type MiniWallet = {
  getEthereumProvider?: () => Promise<any> | any;
};

type MiniAny = {
  user?: { fid?: number | string };
  actions?: MiniActions;
  wallet?: MiniWallet;
  // legacy top-level fallbacks
  openURL?: (url: string) => void;
  composeCast?: (args: { text: string; embeds?: string[] }) => void;
};

/** ---------------- Internals ---------------- */
function _win(): any | null {
  return typeof window === "undefined" ? null : (window as any);
}

/** Prefer new global name, fall back to older one(s). */
export function mini(): MiniAny | null {
  const win = _win();
  return (win?.MiniKit as MiniAny) || (win?.miniApp as MiniAny) || null;
}

/** ---------------- Environment helpers ---------------- */
export function insideMini(): boolean {
  if (typeof navigator === "undefined") return false;
  return MINI_UA_REGEX.test(navigator.userAgent || "");
}
export const isInsideMini = insideMini;

/** ---------------- Cookie helpers ---------------- */
export function getFidCookie(): number | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^| )fid=([^;]+)/);
  const n = m ? Number(decodeURIComponent(m[1])) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function setFidCookie(fid: number | string, days = 365) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `fid=${encodeURIComponent(String(fid))}; expires=${d.toUTCString()}; path=/; samesite=lax`;
}

/** ---------------- Core Mini helpers ---------------- */
export async function miniReady(): Promise<void> {
  try { await mini()?.actions?.ready?.(); } catch { /* noop */ }
}

/** Trigger “Sign in with Farcaster” inside Warpcast; returns the Mini response or null. */
export async function miniSignin(): Promise<{ user?: { fid?: number | string } } | null> {
  try {
    const res = await mini()?.actions?.signin?.();
    return (res as any) ?? null;
  } catch {
    return null;
  }
}

/** Prompt to add/subscribe to the Mini app (if supported by host). */
export async function miniAddApp(): Promise<void> {
  try { await mini()?.actions?.addMiniApp?.(); } catch { /* noop */ }
}

/** Resolve current FID from Mini (preferred) or cookie; returns null if unknown. */
export function currentFid(): number | null {
  const m = mini();
  const fromMini = m?.user?.fid;
  if (fromMini != null) {
    const n = Number(fromMini);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return getFidCookie();
}

/** Async helper that tries Mini, then cookie. Useful if you want a single call site. */
export async function resolveFid(): Promise<number | null> {
  return currentFid();
}

/** Get injected EIP-1193 provider (if Mini wallet is available). */
export async function getEthProvider(): Promise<any | null> {
  try { return await mini()?.wallet?.getEthereumProvider?.(); }
  catch { return null; }
}

/** Open a URL (Mini overlay in Warpcast; new tab on web). */
export function openUrl(url: string) {
  const m = mini();
  if (m?.actions?.openURL) return void m.actions.openURL(url);
  if (m?.openURL) return void m.openURL(url);
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

/** Compose a cast (Mini composer or warpcast.com fallback). */
export function composeCast(text: string, attachmentUrl?: string) {
  const embeds = attachmentUrl ? [attachmentUrl] : [];
  const m = mini();
  if (m?.actions?.composeCast) return void m.actions.composeCast({ text, embeds });
  if (m?.composeCast) return void m.composeCast({ text, embeds });
  openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`);
}

/** Open a Farcaster profile (Mini-native if supported, else warpcast.com). */
export async function openProfile(fid: number) {
  try {
    const m = mini();
    if (m?.actions?.viewProfile) return void (await m.actions.viewProfile({ fid }));
  } catch { /* fall through */ }
  openUrl(`${FARCASTER_PROFILE_URL}${fid}`);
}
