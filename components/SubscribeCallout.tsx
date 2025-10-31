// components/SubscribeCallout.tsx
"use client";

import { useEffect, useState } from "react";
import { currentFid, insideMini } from "@/lib/mini";

export default function SubscribeCallout() {
  const [fid, setFid] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFid(currentFid());
  }, []);

  async function onSubscribe() {
    setErr(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fid })
      });
      if (!res.ok) throw new Error(await res.text());
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to subscribe");
    }
  }

  if (done) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#8b5cf6] via-[#06b6d4] to-[#f59e0b] p-[2px]">
      <div className="rounded-2xl bg-black/70 p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Join the TamaBot channel</div>
            <div className="text-sm opacity-80">
              Get updates, challenges, and bonus XP drops. {insideMini() ? "You're in Warpcast—perfect!" : ""}
            </div>
          </div>
          <button
            onClick={onSubscribe}
            disabled={!fid}
            className="px-4 py-2 rounded-xl bg-white/90 text-black hover:bg-white font-semibold disabled:opacity-60"
          >
            Subscribe
          </button>
        </div>
        {!fid && <div className="text-xs mt-2 opacity-80">Sign in with Farcaster first to enable subscribe.</div>}
        {err && <div className="text-xs mt-2 text-red-300">{err}</div>}
      </div>
    </div>
  );
}
