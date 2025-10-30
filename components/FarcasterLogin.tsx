"use client";

import { useEffect, useState } from "react";

function setCookie(name: string, value: string, days = 365) {
  const d = new Date(); d.setTime(d.getTime() + days*24*60*60*1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; samesite=lax`;
}
function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function FarcasterLogin({ onLogin }: { onLogin?: (fid: number) => void }) {
  const [fid, setFid] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1) MiniKit user context
    const mk: any = (globalThis as any).MiniKit;
    if (mk?.user?.fid) {
      const f = Number(mk.user.fid);
      setFid(f); localStorage.setItem("fid", String(f)); setCookie("fid", String(f));
      onLogin?.(f);
      setLoading(false);
      return;
    }
    // 2) Existing cookie/localStorage
    const saved = Number(getCookie("fid") || localStorage.getItem("fid") || "");
    if (Number.isFinite(saved) && saved > 0) {
      setFid(saved);
      onLogin?.(saved);
    }
    setLoading(false);
  }, [onLogin]);

  const confirmWithNeynar = async () => {
    if (!fid) { setError("Enter your FID first."); return; }
    setError(null);
    setChecking(true);
    try {
      // Hit our proxy (server keeps NEYNAR_API_KEY private)
      const r = await fetch(`/api/neynar/user/${fid}`);
      if (!r.ok) throw new Error(`Neynar lookup failed (${r.status})`);
      const j = await r.json();
      // Optional sanity: j.result.user.username etc.
      localStorage.setItem("fid", String(fid));
      setCookie("fid", String(fid));
      onLogin?.(fid);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div className="text-sm">Detecting Farcaster…</div>;

  if (fid) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-green-50 px-3 py-1 text-sm text-green-700">Signed in (FID {fid})</div>
        <button
          onClick={() => { setFid(null); localStorage.removeItem("fid"); setCookie("fid", "", -1); }}
          className="text-sm underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-600">Sign in with Farcaster</div>
      <div className="flex gap-2">
        <input
          className="border rounded-lg px-3 py-2 w-40"
          placeholder="Enter your FID"
          inputMode="numeric"
          onChange={(e) => setFid(e.target.value ? Number(e.target.value) : null)}
        />
        <button
          onClick={confirmWithNeynar}
          disabled={checking || !fid}
          className="rounded-lg bg-purple-600 text-white px-3 py-2 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Confirm with Neynar"}
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="text-xs text-zinc-500">
        Inside Warpcast, this auto-detects via MiniKit. Outside Warpcast, paste your FID and we’ll verify via Neynar.
      </div>
    </div>
  );
}
