// components/HostInspect.tsx
"use client";

import { useEffect, useState } from "react";

export default function HostInspect() {
  const [info, setInfo] = useState<string>("…");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w: any = window;
    const out: any = {
      keysWindow: Object.keys(w).sort(),
      farcasterMini: w?.farcaster?.miniapp ? true : false,
      miniKit: !!(w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit),
      sdkContextUser: w?.farcaster?.miniapp?.context?.user ?? null,
      sdkUser: w?.farcaster?.miniapp?.user ?? null,
      miniKitUser: w?.miniKit?.user ?? w?.miniKit?.context?.user ?? null,
    };

    setInfo(JSON.stringify(out, null, 2));
  }, []);

  return (
    <pre className="fixed bottom-10 left-2 right-2 z-[100] text-xs bg-black/80 text-white p-2 rounded-md overflow-auto max-h-40">
      {info}
    </pre>
  );
}
