// lib/useMiniContext.ts
"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export function useMiniContext() {
  const [loading, setLoading] = useState(true);
  const [inMini, setInMini] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<{ fid?: number; username?: string; pfpUrl?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setInMini(!!sdk?.isInMiniApp?.());
        if (sdk?.actions?.ready) await sdk.actions.ready(); // hide splash
        const ctx = sdk?.context; // user, client, platform, etc.
        const f = Number(ctx?.user?.fid);
        setFid(Number.isFinite(f) && f > 0 ? f : null);
        setUser({
          fid: Number.isFinite(f) && f > 0 ? f : undefined,
          username: ctx?.user?.username,
          pfpUrl: ctx?.user?.pfpUrl || ctx?.user?.pfp_url,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, inMini, fid, user, ctx: sdk?.context };
}
