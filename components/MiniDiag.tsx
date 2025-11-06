// components/MiniDiag.tsx
"use client";
import { useMiniApp } from "@/contexts/miniapp-context";

export default function MiniDiag() {
  const { inMini, isReady, ctx } = useMiniApp();

  return (
    <div className="rounded-xl border border-white/20 bg-black/70 text-white p-3 text-xs shadow-xl">
      <div className="font-semibold mb-1">MiniDiag</div>
      <div className="space-y-1">
        <Row k="inMini" v={String(inMini)} />
        <Row k="isReady" v={String(isReady)} />
        <Row k="fid" v={ctx?.user?.fid != null ? String(ctx.user.fid) : "—"} />
        <Row k="username" v={ctx?.user?.username ?? "—"} />
        <Row k="client" v={ctx?.client?.platform ?? "—"} />
      </div>
      {process.env.NEXT_PUBLIC_MINI_DEBUG === "true" && (
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-white/80">
          {safeStringify(ctx)}
        </pre>
      )}
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
