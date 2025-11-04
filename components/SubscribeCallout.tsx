// components/SubscribeCallout.tsx
"use client";

import { useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniContext } from "@/lib/useMiniContext";

const CHAN = process.env.NEXT_PUBLIC_FC_CHANNEL || "tamabot";
const CHANNEL_URL = `https://warpcast.com/~/channel/${CHAN}`;

async function openPreferMini(url: string) {
  try {
    if (sdk?.actions?.openUrl) return void (await sdk.actions.openUrl(url));
    if ((sdk as any)?.actions?.openURL) return void (await (sdk as any).actions.openURL(url));
  } catch {}
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function SubscribeCallout() {
  const { inMini, fid } = useMiniContext();
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1: take them to Mini App settings / channel to enable notifications
  async function onEnableNotif() {
    // You can deep-link to your app page/settings; channel is a handy entry
    await openPreferMini(CHANNEL_URL);
  }

  // Step 2: after the client pings our webhook with token/url, we keep a UX “Subscribe” button
  // that stores a local intent too (optional). This example just stores the fid server-side.
  async function onAckSubscribe() {
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
              Get updates, challenges, and bonus XP drops.{inMini ? " You're in Warpcast—perfect!" : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEnableNotif}
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 font-semibold"
            >
              Enable notifications
            </button>
            <button
              onClick={onAckSubscribe}
              disabled={!fid || busy}
              className="px-4 py-2 rounded-xl bg-white/90 text-black hover:bg-white font-semibold disabled:opacity-60"
              title={!fid ? "Open from Warpcast so we can read your FID automatically" : ""}
            >
              {busy ? "Saving…" : "Subscribe"}
            </button>
          </div>
        </div>
        {!fid && (
          <div className="text-xs mt-2 opacity-80">
            Open from Warpcast/Base to link your FID automatically.
          </div>
        )}
        {err && <div className="text-xs mt-2 text-red-300">{err}</div>}
      </div>
    </div>
  );
}
