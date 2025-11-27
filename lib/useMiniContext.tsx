"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

type MiniUser = {
  fid: number;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
};

type MiniState = {
  fid: number | null;
  user: MiniUser | null;
  inMini: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<MiniState | null>(null);

/** ---- SAFE storage helpers ---- */
function safeStorageGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    if (!("localStorage" in window)) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    if (!("localStorage" in window)) return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore – some in-app browsers block storage
  }
}

export function MiniContextProvider({ children }: { children: React.ReactNode }) {
  const { context } = useMiniKit(); // present when inside Mini
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<MiniUser | null>(null);
  const [loading, setLoading] = useState(true);
  const first = useRef(true);

  const readQueryFid = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const u = new URL(window.location.href);
      const qfid = u.searchParams.get("fid");
      const n = qfid ? Number(qfid) : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Prefer MiniKit context when inside Mini
      const miniUser = (context as any)?.user;
      if (miniUser?.fid) {
        const f = Number(miniUser.fid);
        const u: MiniUser = {
          fid: f,
          username: miniUser.username ?? null,
          displayName: miniUser.displayName ?? miniUser.display_name ?? null,
          pfpUrl: miniUser.pfpUrl ?? miniUser.pfp_url ?? null,
        };

        setFid(f);
        setUser(u);
        safeStorageSet("fc:minUser", JSON.stringify(u));
        return;
      }

      // 2) Fallback via query param (?fid=1234)
      const qfid = readQueryFid();
      if (qfid) {
        setFid(qfid);
        try {
          const r = await fetch(`/api/neynar/user/${qfid}`);
          const j = await r.json();
          const p = j?.result?.user;
          const u: MiniUser = p
            ? {
                fid: qfid,
                username: p?.username ?? null,
                displayName: p?.display_name ?? null,
                pfpUrl: p?.pfp_url ?? null,
              }
            : { fid: qfid };
          setUser(u);
          safeStorageSet("fc:minUser", JSON.stringify(u));
        } catch {
          setUser({ fid: qfid });
        }
        return;
      }

      // 3) Persisted from a previous Mini session
      const raw = safeStorageGet("fc:minUser");
      if (raw) {
        try {
          const v = JSON.parse(raw);
          if (v?.fid) {
            const f = Number(v.fid);
            setFid(f);
            setUser({
              fid: f,
              username: v.username ?? null,
              displayName: v.displayName ?? null,
              pfpUrl: v.pfpUrl ?? null,
            });
            return;
          }
        } catch {
          // ignore bad JSON
        }
      }

      setFid(null);
      setUser(null);
    } finally {
      setLoading(false);
      first.current = false;
    }
  }, [context, readQueryFid]);

  useEffect(() => {
    refresh();

    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const onShow = () => {
      refresh();
    };
    const onVis = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const value = useMemo<MiniState>(
    () => ({
      fid,
      user,
      inMini: !!context,
      loading,
      refresh,
    }),
    [fid, user, loading, context, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMiniContext(): MiniState {
  const v = useContext(Ctx);
  if (!v) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("useMiniContext called outside of MiniContextProvider");
    }
    return {
      fid: null,
      user: null,
      inMini: false,
      loading: true,
      refresh: async () => {},
    };
  }
  return v;
}
