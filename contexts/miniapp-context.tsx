// contexts/miniapp-context.tsx
"use client";

import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";

interface MiniAppContextType {
  isFrameReady: boolean;
  setFrameReady: () => void;
  addFrame: () => Promise<{ url: string; token: string } | null>;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const { isFrameReady, setFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();

  const handleAddFrame = useCallback(async () => {
    try {
      const result = await addFrame();
      return result ?? null;
    } catch (error) {
      console.error("[miniapp-context] addFrame error", error);
      return null;
    }
  }, [addFrame]);

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  useEffect(() => {
    if (isFrameReady && !context?.client?.added) {
      void handleAddFrame();
    }
  }, [context?.client?.added, handleAddFrame, isFrameReady]);

  return (
    <MiniAppContext.Provider value={{ isFrameReady, setFrameReady, addFrame: handleAddFrame }}>
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const ctx = useContext(MiniAppContext);
  if (!ctx) throw new Error("useMiniApp must be used within a MiniAppProvider");
  return ctx;
}
