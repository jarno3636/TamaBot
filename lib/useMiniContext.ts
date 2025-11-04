// lib/useMiniContext.ts
"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/** True if running inside a Farcaster-compatible mini host */
export function isInMini(): boolean {
  try {
    // SDK signal OR MiniKit globals present OR in iframe
    const hasSdk = !!sdk?.isInMiniApp?.();
    if (hasSdk) return true;

    if (typeof window !== "undefined") {
      const w = window as any;
      const hasMiniKit = !!(w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit);
      if (hasMiniKit) return true;
      try {
        if (window.self !== window.top) return true; // embedded mini
      } catch {
        return true; // cross-origin iframe
      }
    }
    return false;
  } catch {
    return false;
  }
}

export type MiniUser = {
  fid?: number;
  username?: string;
  pfpUrl?: string;
};

export function useMiniContext() {
  const [loading, setLoading] = useState(true);
  const [inMini, setInMini] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<MiniUser | null>(null);
  const [ctx, setCtx] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const inside = isInMini();
        setInMini(inside);

        // Hide splash if the SDK exposes ready()
        try {
          const ready = (sdk as any)?.actions?.ready;
          if (typeof ready === "function") {
            await Promise.race([
              Promise.resolve(ready()),
              new Promise((r) => setTimeout(r, 800)),
            ]);
          }
        } catch {
          /* ignore */
        }

        // ---- Read context from any available host ----
        let context: any = null;
        let u: any = null;

        if (typeof window !== "undefined") {
          const w = window as any;
          const sc: any = sdk as any;
          const mk = w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;

          // Farcaster miniapp sdk often exposes context/user (not typed)
          context =
            sc?.context ??
            w?.farcaster?.miniapp?.context ??
            null;

          // Unified user object from either SDK context or MiniKit
          u =
            context?.user ??
            mk?.user ??
            mk?.context?.user ??
            null;
        }

        setCtx(context);

        const rawFid = Number(
          (u && (u.fid ?? u.user?.fid)) ??
            (context?.user?.fid) ??
            NaN
        );
        const f = Number.isFinite(rawFid) && rawFid > 0 ? rawFid : null;
        setFid(f);

        setUser({
          fid: f ?? undefined,
          username: u?.username ?? context?.user?.username,
          pfpUrl: u?.pfpUrl ?? u?.pfp_url ?? context?.user?.pfpUrl ?? context?.user?.pfp_url,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user, ctx };
}
