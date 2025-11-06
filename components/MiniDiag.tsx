"use client";
import React from "react";
import { useMiniApp } from "@/contexts/miniapp-context";

export default function MiniDiag() {
  const s = useMiniApp();
  return (
    <pre className="text-xs leading-5 whitespace-pre-wrap p-3 rounded-xl bg-white/5 border border-white/10">
      {JSON.stringify({
        env: s.env,
        inMini: s.inMini,
        isReady: s.isReady,
        isFrameReady: s.isFrameReady,
        user: s.user,
        hasV2: !!(typeof window !== "undefined" && (window as any)?.farcaster?.miniapp?.sdk),
        hasLegacy: !!(typeof window !== "undefined" && (window as any)?.Farcaster?.mini?.sdk),
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "(server)",
      }, null, 2)}
    </pre>
  );
}
