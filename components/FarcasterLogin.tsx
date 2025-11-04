// components/FarcasterLogin.tsx
"use client";

import { useEffect, useState } from "react";
import { useMiniContext } from "@/lib/useMiniContext";

export default function FarcasterLogin({ onLogin }: { onLogin?: (fid: number) => void }) {
  const { loading, inMini, fid } = useMiniContext();
  const [manual, setManual] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fid) {
      try { localStorage.setItem("fid", String(fid)); } catch {}
      onLogin?.(fid);
    }
  }, [fid, onLogin]);

  if (loading) {
    return <div className="text-sm text-zinc-500 animate-pulse">Detecting Farcaster session…</div>;
  }
  if (fid) {
    return (
      <div className="rounded-xl bg-green-100 px-3 py-1 text-sm text-green-800 inline-block">
        Signed in (FID {fid})
      </div>
    );
  }

  async function confirmWithNeynar() {
    if (!manual) return;
    setChecking(true); setError(null);
    try {
      const r = await fetch(`/api/neynar/user/${manual}`);
      if (!r.ok) throw new Error(`Neynar lookup failed (${r.status})`);
      try { localStorage.setItem("fid", String(manual)); } catch {}
      onLogin?.(manual);
    } catch (e: any) {
      setError(e?.message || "Failed to verify");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/80">Sign in with Farcaster</div>

      {inMini ? (
        <div className="text-xs text-zinc-400">
          Detected Farcaster app. If this message stays, close and reopen the mini app to refresh context.
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            className="border border-white/20 rounded-lg px-3 py-2 w-40 bg-black/40 text-white placeholder:text-white/40"
            placeholder="Enter your FID"
            inputMode="numeric"
            onChange={(e) => {
              const n = Number(e.target.value || "");
              setManual(Number.isFinite(n) && n > 0 ? n : null);
            }}
          />
          <button
            onClick={confirmWithNeynar}
            disabled={checking || !manual}
            className="rounded-lg bg-purple-600 text-white px-3 py-2 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Confirm"}
          </button>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
