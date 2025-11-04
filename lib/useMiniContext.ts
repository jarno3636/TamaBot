// lib/useMiniContext.ts
"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/** True if running inside Warpcast/Base Mini */
export function isInMini(): boolean {
  try {
    return !!sdk?.isInMiniApp?.();
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
        setInMini(!!sdk?.isInMiniApp?.());
        if (sdk?.actions?.ready) {
          // Hide splash quickly
          await Promise.race([
            Promise.resolve(sdk.actions.ready()),
            new Promise((r) => setTimeout(r, 800)),
          ]);
        }
        const c = sdk?.context;
        setCtx(c);
        const rawFid = Number(c?.user?.fid);
        const f = Number.isFinite(rawFid) && rawFid > 0 ? rawFid : null;
        setFid(f);
        setUser({
          fid: f ?? undefined,
          username: c?.user?.username,
          pfpUrl: c?.user?.pfpUrl || c?.user?.pfp_url,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user, ctx };
}
