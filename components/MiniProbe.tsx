// components/MiniProbe.tsx
"use client";
import { useEffect, useState } from "react";

type Sniff = {
  ua: string;
  farcasterMini: boolean;
  globals: string[];
  sdkUser: any;
  sdkContextUser: any;
  recentMessages: any[];
};

export default function MiniProbe() {
  const [state, setState] = useState<Sniff | null>(null);

  useEffect(() => {
    const recent: any[] = [];
    const onMsg = (ev: MessageEvent) => {
      try { recent.push(ev.data); setState(s => s ? { ...s, recentMessages: [...recent].slice(-5) } : s); } catch {}
    };
    window.addEventListener("message", onMsg);

    (async () => {
      // Try official SDK (if injected by Warpcast)
      let sdk: any = null, ctxUser: any = null, sdkUser: any = null;
      try {
        // The global injected by the v2 host script
        sdk = (window as any).Farcaster?.mini?.sdk || (window as any).farcaster?.miniapp?.sdk;
        await sdk?.actions?.ready?.();
        const ctx = await (sdk?.context || null);
        ctxUser = ctx?.user || ctx?.requesterUser || null;
        sdkUser = sdk?.user || null;
      } catch {}

      const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
      const keys = Object.keys(window || {});
      const farcasterMini = !!(sdk || (window as any).farcaster || (window as any).Farcaster);

      setState({
        ua,
        farcasterMini,
        globals: keys.filter(k => /farcaster|Farcaster|mini/i.test(k)).sort(),
        sdkUser,
        sdkContextUser: ctxUser,
        recentMessages: [],
      });

      // Ask host for context just in case
      try {
        window.parent?.postMessage?.({ type: "farcaster:context:request" }, "*");
        (window as any).ReactNativeWebView?.postMessage?.(JSON.stringify({ type: "context:request" }));
      } catch {}
    })();

    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-bold">Mini Probe</h1>
      <pre className="whitespace-pre-wrap rounded-md bg-black/40 p-3">{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}
