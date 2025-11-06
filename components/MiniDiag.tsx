// components/MiniDiag.tsx
"use client";
import { useMiniApp } from "@/contexts/miniapp-context";

export default function MiniDiag() {
  const { inMini, isReady, sdkOk, error, ctx } = useMiniApp();
  return (
    <div className="rounded-xl border border-white/20 bg-black/70 text-white p-3 text-xs shadow-xl">
      <div className="font-semibold mb-1">MiniDiag</div>
      <div>sdkOk: {String(sdkOk)}</div>
      <div>inMini: {String(inMini)}</div>
      <div>isReady: {String(isReady)}</div>
      {error ? <div className="text-red-400">error: {error}</div> : null}
      {ctx ? (
        <details className="mt-1">
          <summary>context</summary>
          <pre className="max-h-44 overflow-auto">{JSON.stringify(ctx, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
