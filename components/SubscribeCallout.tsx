// components/SubscribeCallout.tsx
"use client";

import { useState } from "react";
import { useFid, isFarcasterUA } from "@/lib/useFid";

const CHAN = process.env.NEXT_PUBLIC_FC_CHANNEL || "tamabot";
const CHANNEL_URL = `https://warpcast.com/~/channel/${CHAN}`;

async function openPreferMini(url: string) {
  try {
    const w = window as any;
    const mk = w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit;
    if (mk?.openUrl) return void mk.openUrl(url);
    if (mk?.openURL) return void mk.openURL(url);
  } catch {}
  try {
    const mod = (await import("@farcaster/miniapp-sdk")) as any;
    const sdk = mod?.sdk ?? mod?.default;
    if (sdk?.actions?.openUrl) return void sdk.actions.openUrl(url);
    if (sdk?.actions?.openURL) return void sdk.actions.openURL(url);
  } catch {}
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function SubscribeCallout() {
  const { fid, insideMini } = useFid();
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onJoinChannel() {
    await openPreferMini(CHANNEL_URL);
  }

  async function onSubscribeBackend() {
    if (!fid) return;
    setErr(null); setBusy(true);
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fid }),
      });
      if (!r.ok) throw new Error(await r.text());
      setOk(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to subscribe");
    } finally {
      setBusy(false);
    }
  }

  if (ok) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#8b5cf6] via-[#06b6d4] to-[#f59e0b] p-[2px]">
      <div className="rounded-2xl bg-black/70 p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Join the TamaBot channel</div>
            <div className="text-sm opacity-80">
              Get updates, challenges, and bonus XP drops.
              {insideMini || isFarcasterUA() ? " You're in Warpcast—perfect!" : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onJoinChannel}
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 font-semibold"
            >
              Join channel
            </button>
            <button
              onClick={onSubscribeBackend}
              disabled={!fid || busy}
              className="px-4 py-2 rounded-xl bg-white/90 text-black hover:bg:white font-semibold disabled:opacity-60"
              title={!fid ? "Sign in with Farcaster first" : ""}
            >
              {busy ? "Saving…" : "Subscribe"}
            </button>
          </div>
        </div>
        {!fid && <div className="text-xs mt-2 opacity-80">Sign in (or open from Warpcast) so we can link your FID.</div>}
        {err && <div className="text-xs mt-2 text-red-300">{err}</div>}
      </div>
    </div>
  );
}
