// components/MiniDiag.tsx
"use client";

import { useMiniApp } from "@/contexts/miniapp-context";

type MiniLoose = {
  inMini?: boolean;
  isReady?: boolean;
  // allow unknown extra fields without tripping TS
  [k: string]: unknown;
};

export default function MiniDiag() {
  // read the known keys, but keep a loose handle for optional extras
  const state = useMiniApp() as unknown as MiniLoose;
  const inMini = Boolean(state.inMini);
  const isReady = Boolean(state.isReady);

  // ctx is optional and not part of the strict type; access loosely
  const ctx = (state as any)?.ctx;

  return (
    <div className="rounded-xl border border-white/20 bg-black/70 text-white p-3 text-xs shadow-xl">
      <div className="font-semibold mb-1">MiniDiag</div>
      <div className="space-y-1">
        <Row k="inMini" v={String(inMini)} />
        <Row k="isReady" v={String(isReady)} />
        {/* Show ctx-derived rows only if it exists at runtime */}
        {ctx ? (
          <>
            <Row k="fid" v={ctx?.user?.fid != null ? String(ctx.user.fid) : "—"} />
            <Row k="username" v={ctx?.user?.username ?? "—"} />
            <Row k="client" v={ctx?.client?.platform ?? "—"} />
          </>
        ) : null}
      </div>

      {process.env.NEXT_PUBLIC_MINI_DEBUG === "true" && ctx ? (
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-white/80">
          {safeStringify(ctx)}
        </pre>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/70">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

function safeStringify(x: unknown) {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}
