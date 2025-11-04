// components/HostInspect.tsx (replace if you already added it)
"use client";
import { useEffect, useState } from "react";

export default function HostInspect() {
  const [info, setInfo] = useState<any>({});
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w: any = window;

    const snapshot = {
      ua: navigator.userAgent,
      farcasterMini: !!w?.farcaster?.miniapp,
      miniKit: !!(w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit),
      sdkContextUser: w?.farcaster?.miniapp?.context?.user ?? null,
      sdkUser: w?.farcaster?.miniapp?.user ?? null,
      miniKitUser: w?.miniKit?.user ?? w?.miniKit?.context?.user ?? null,
    };
    setInfo(snapshot);

    const onMsg = (ev: MessageEvent) => {
      setEvents((prev) => [...prev.slice(-6), ev.data]);
    };
    window.addEventListener("message", onMsg);

    // Ask host for context (harmless if ignored)
    try {
      window.parent?.postMessage?.({ type: "farcaster:context:request" }, "*");
      (w.ReactNativeWebView?.postMessage)?.(JSON.stringify({ type: "context:request" }));
    } catch {}

    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="fixed left-2 right-2 bottom-2 z-[100] grid gap-2">
      <pre className="max-h-40 overflow-auto rounded-md bg-black/80 p-2 text-[11px] text-white">
        {JSON.stringify(info, null, 2)}
      </pre>
      {events.length > 0 && (
        <pre className="max-h-40 overflow-auto rounded-md bg-black/80 p-2 text-[11px] text-white">
          {JSON.stringify({ recentMessages: events }, null, 2)}
        </pre>
      )}
    </div>
  );
}
