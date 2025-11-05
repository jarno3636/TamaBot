// contexts/miniapp-context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";

interface MiniAppContextType {
  isFrameReady: boolean;
  setFrameReady: () => void;
  addFrame: () => Promise<{ url: string; token: string } | null>;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  // ⬇️ Guard: don’t crash if MiniKit context isn’t available during prerender/not-found render
  let mk:
    | { isFrameReady: boolean; setFrameReady: () => void; context: any }
    | null = null;
  try {
    mk = useMiniKit();
  } catch {
    mk = null;
  }

  // If we can’t access MiniKit yet, provide safe no-ops so server/prerender doesn’t explode
  const isFrameReady = mk?.isFrameReady ?? false;
  const setFrameReady = mk?.setFrameReady ?? (() => {});
  const context = mk?.context ?? null;

  let addFrameInner: (() => Promise<{ url: string; token: string } | null>) | null = null;
  try {
    const addFrame = useAddFrame();
    addFrameInner = async () => {
      try {
        const r = await addFrame();
        return r ?? null;
      } catch {
        return null;
      }
    };
  } catch {
    // outside provider / prerender path
    addFrameInner = async () => null;
  }

  // Set ready on mount (client only; no-op on server)
  useEffect(() => {
    if (!isFrameReady) setFrameReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFrameReady]);

  // Auto prompt add on first ready (ignore if context null)
  useEffect(() => {
    if (isFrameReady && context && !context?.client?.added) {
      addFrameInner?.();
    }
  }, [isFrameReady, context]);

  return (
    <MiniAppContext.Provider
      value={{
        isFrameReady,
        setFrameReady,
        addFrame: addFrameInner!,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const ctx = useContext(MiniAppContext);
  if (!ctx) throw new Error("useMiniApp must be used within a MiniAppProvider");
  return ctx;
}
