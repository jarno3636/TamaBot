"use client";
import { useMiniContext } from "@/lib/useMiniContext";

export default function MiniDebug() {
  if (process.env.NEXT_PUBLIC_MINI_DEBUG !== "true") return null;
  const { loading, inMini, fid, user } = useMiniContext();

  return (
    <div
      className="fixed bottom-2 right-2 z-[9999] rounded-md bg-black/70 text-white text-xs px-2 py-1 border border-white/15 shadow"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      mini:{String(inMini)} · load:{String(loading)} · fid:{fid ?? "—"} ·
      pfp:{user?.pfpUrl ? "y" : "n"}
    </div>
  );
}
