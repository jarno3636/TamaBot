"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type MiniEnv =
  | "none"          // normal web
  | "farcaster_v2"  // window.farcaster.miniapp.sdk
  | "farcaster_v1"  // window.Farcaster.mini.sdk (older)
  | "minikit";      // @coinbase/onchainkit/minikit (MiniKitProvider)

type MiniState = {
  inMini: boolean;
  env: MiniEnv;
  isReady: boolean;
  user?: unknown | null;           // whatever the host yields
  forceDemo: (on: boolean) => void;
};

const Ctx = createContext<MiniState>({
  inMini: false,
  env: "none",
  isReady: false,
  user: null,
  forceDemo: () => {},
});

function detectEnv(): MiniEnv {
  // v2 (current)
  // @ts-ignore
  if (typeof window !== "undefined" && window.farcaster?.miniapp?.sdk) return "farcaster_v2";
  // legacy
  // @ts-ignore
  if (typeof window !== "undefined" && window.Farcaster?.mini?.sdk)   return "farcaster_v1";
  // MiniKit (OnchainKit)
  // @ts-ignore
  if (typeof window !== "undefined" && window.miniKit?.getUser)       return "minikit";
  return "none";
}

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [env, setEnv] = useState<MiniEnv>("none");
  const [isReady, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [demo, setDemo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.has("demo") || sp.has("miniapp");
  });

  // Poll for injected SDKs (Warpcast/Base app injects after load)
  useEffect(() => {
    let tries = 0;
    const max = 80; // ~12s
    const iv = setInterval(async () => {
      const e = detectEnv();
      setEnv(e);

      // ping "ready" if available
      try {
        // @ts-ignore
        window.farcaster?.actions?.ready?.();
      } catch {}
      try {
        // @ts-ignore
        window.farcaster?.miniapp?.sdk?.actions?.ready?.();
      } catch {}
      try {
        // @ts-ignore
        window.Farcaster?.mini?.sdk?.actions?.ready?.();
      } catch {}

      // try to grab a user if the host exposes it
      try {
        if (e === "farcaster_v2") {
          // @ts-ignore
          const u = await window.farcaster?.miniapp?.sdk?.user?.getCurrent?.();
          if (u) setUser(u);
        } else if (e === "farcaster_v1") {
          // @ts-ignore
          const u = await window.Farcaster?.mini?.sdk?.user?.getCurrent?.();
          if (u) setUser(u);
        } else if (e === "minikit") {
          // @ts-ignore
          const u = await window.miniKit?.getUser?.();
          if (u) setUser(u);
        }
      } catch {}

      // mark ready if any env is present
      if (e !== "none") setReady(true);

      if (++tries >= max || (e !== "none" && isReady)) clearInterval(iv);
    }, 150);

    return () => clearInterval(iv);
  }, [isReady]);

  const value = useMemo<MiniState>(() => {
    return {
      inMini: demo || env !== "none",
      env,
      isReady: demo || isReady,
      user,
      forceDemo: (on: boolean) => setDemo(on),
    };
  }, [demo, env, isReady, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMiniApp() {
  return useContext(Ctx);
}
