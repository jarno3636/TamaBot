"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type MiniEnv = "none" | "warpcast" | "hosted";
type MiniUser = { fid: number } | null;

export type MiniState = {
  inMini: boolean;         // true when we’re actually inside Warpcast (or forced)
  env: MiniEnv;            // which environment we detected
  isReady: boolean;        // SDK says ready (or forced)
  user: MiniUser;          // best-effort user (if available)
  forceDemo: (on: boolean) => void;
  // compatibility alias
  isFrameReady?: boolean;
};

const Ctx = createContext<MiniState | null>(null);

function uaSaysWarpcast() {
  if (typeof navigator === "undefined") return false;
  return /Warpcast|Farcaster|FarcasterMini/i.test(navigator.userAgent || "");
}

function getQueryFlag(name: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(window.location.href);
    return ["1","true","yes","on"].includes((u.searchParams.get(name) || "").toLowerCase());
  } catch { return false; }
}

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = useState(false);
  const [env, setEnv] = useState<MiniEnv>("none");
  const [inMini, setInMini] = useState(false);
  const [isReady, setReady] = useState(false);
  const [user, setUser] = useState<MiniUser>(null);

  const readyOnce = useRef(false);

  // Allow local override: ?demo=1 makes everything behave as if inside mini app
  useEffect(() => {
    if (getQueryFlag("demo")) setDemo(true);
  }, []);

  // Detect presence of the Mini SDKs and Warpcast host
  useEffect(() => {
    const isWarpcastUA = uaSaysWarpcast();
    const hasV2 = typeof (window as any)?.farcaster?.miniapp?.sdk !== "undefined";
    const hasLegacy = typeof (window as any)?.Farcaster?.mini?.sdk !== "undefined";
    const hasAny = hasV2 || hasLegacy;

    setEnv(isWarpcastUA ? "warpcast" : hasAny ? "hosted" : "none");
    setInMini(isWarpcastUA || hasAny || demo);

    // If nothing is present and not demo, don’t loop
    if (!isWarpcastUA && !hasAny && !demo) return;

    // Wire up “ready” from whichever SDK exists
    function markReady() {
      if (!readyOnce.current) {
        readyOnce.current = true;
        setReady(true);
      }
    }

    // v2 SDK (preferred)
    try {
      const v2 = (window as any)?.farcaster?.miniapp?.sdk;
      if (v2?.actions?.ready) {
        // proactively ping ready repeatedly (hosts vary)
        const iv = setInterval(() => {
          try { v2.actions.ready(); } catch {}
        }, 150);
        // and also listen to an event if exposed
        try { v2.on?.("ready", markReady); } catch {}
        // safety timeout: assume ready after 2.5s even if no event
        const t = setTimeout(markReady, 2500);
        return () => { clearInterval(iv); clearTimeout(t); try { v2.off?.("ready", markReady); } catch {} };
      }
    } catch {}

    // Legacy SDK shim
    try {
      const legacy = (window as any)?.Farcaster?.mini?.sdk;
      if (legacy?.actions?.ready) {
        const iv = setInterval(() => {
          try { legacy.actions.ready(); } catch {}
        }, 150);
        const t = setTimeout(markReady, 2500);
        return () => { clearInterval(iv); clearTimeout(t); };
      }
    } catch {}

    // Demo fallback: if demo is on, mark ready after a tick
    if (demo) {
      const t = setTimeout(markReady, 200);
      return () => clearTimeout(t);
    }
  }, [demo]);

  // Best-effort user detection (safe no-op elsewhere)
  useEffect(() => {
    async function tryGetUser() {
      try {
        // v2 example: some hosts expose a user/get method; if not, skip silently
        const v2 = (window as any)?.farcaster?.miniapp?.sdk;
        if (v2?.user?.getUser) {
          const u = await v2.user.getUser().catch(() => null);
          if (u?.fid) setUser({ fid: Number(u.fid) });
          return;
        }
      } catch {}
      try {
        // legacy example
        const legacy = (window as any)?.Farcaster?.mini?.sdk;
        const u = await legacy?.user?.getUser?.().catch(() => null);
        if (u?.fid) setUser({ fid: Number(u.fid) });
      } catch {}
    }
    if (inMini) tryGetUser();
  }, [inMini]);

  const value: MiniState = useMemo(() => ({
    inMini: inMini || demo,
    env,
    isReady: isReady || demo,
    user,
    forceDemo: (on: boolean) => setDemo(on),
    isFrameReady: isReady || demo, // alias for older code
  }), [demo, env, inMini, isReady, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMiniApp() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe default so app won’t crash before provider mounts
    return { inMini: false, env: "none" as MiniEnv, isReady: false, user: null, forceDemo: () => {}, isFrameReady: false };
  }
  return ctx;
}
