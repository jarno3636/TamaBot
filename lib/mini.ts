// lib/mini.ts

/** Narrow window typing so TS stops yelling while we support multiple SDK shapes */
type MiniAny = {
  user?: { fid?: number | string };
  actions?: {
    ready?: () => Promise<void> | void;
    signin?: () => Promise<{ user?: { fid?: number | string } } | void> | void;
    addMiniApp?: () => Promise<void> | void;
    viewProfile?: (args: { fid: number }) => Promise<void> | void;
    composeCast?: (args: { text: string; embeds?: string[] }) => Promise<void> | void;
    openURL?: (url: string) => Promise<void> | void;
  };
  wallet?: {
    getEthereumProvider?: () => Promise<any> | any;
  };
  openURL?: (url: string) => void;            // older builds
  composeCast?: (args: { text: string; embeds?: string[] }) => void;
};

function w(): any {
  return typeof window === "undefined" ? null : (window as any);
}

/** Prefer new global name, fall back to older ones */
export function mini(): MiniAny | null {
  const win = w();
  return (win?.MiniKit as MiniAny) || (win?.miniApp as MiniAny) || null;
}

/** Heuristic UA check (works before SDK bootstraps) */
export function insideMini(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Warpcast|Farcaster|FarcasterMini/i.test(navigator.userAgent || "");
}

/** Convenience alias some components prefer */
export const isInsideMini = insideMini;

/** Tell host we're ready (hides splash in Warpcast) */
export async function miniReady() {
  try { await mini()?.actions?.ready?.(); } catch {}
}

/** Trigger “Sign in with Farcaster” inside Warpcast */
export async function miniSignin(): Promise<{ user?: { fid?: number | string } } | null> {
  try {
    const res = await mini()?.actions?.signin?.();
    return (res as any) || null;
  } catch {
    return null;
  }
}

/** Prompt user to add the app / enable notifications */
export async function miniAddApp() {
  try { await mini()?.actions?.addMiniApp?.(); } catch {}
}

/** Resolve current signed-in FID (MiniKit -> cookie fallback) */
export function currentFid(): number | null {
  const mk = mini();
  const fromMini = mk?.user?.fid;
  if (fromMini != null) {
    const n = Number(fromMini);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (typeof document !== "undefined") {
    const m = document.cookie.match(/(?:^| )fid=([^;]+)/);
    const n = m ? Number(decodeURIComponent(m[1])) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Get injected EIP-1193 provider from Mini wallet (if available) */
export async function getEthProvider(): Promise<any | null> {
  try { return await mini()?.wallet?.getEthereumProvider?.(); }
  catch { return null; }
}

/** Open a URL (Mini overlay in Warpcast; new tab on web) */
export function openUrl(url: string) {
  const m = mini();
  if (m?.actions?.openURL) return void m.actions.openURL(url);
  if (m?.openURL) return void m.openURL(url);
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

/** Compose a cast (Mini composer or warpcast.com fallback) */
export function composeCast(text: string, attachmentUrl?: string) {
  const embeds = attachmentUrl ? [attachmentUrl] : [];
  const m = mini();
  if (m?.actions?.composeCast) return void m.actions.composeCast({ text, embeds });
  if (m?.composeCast) return void m.composeCast({ text, embeds });
  openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`);
}

/** Jump to a Farcaster profile (if host supports it) */
export async function openProfile(fid: number) {
  try { await mini()?.actions?.viewProfile?.({ fid }); } catch {}
}
