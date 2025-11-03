// components/FarcasterLogin.tsx
"use client";

import { useEffect, useState } from "react";
import { miniSignin } from "@/lib/miniapp";
import { useFid, isInsideMini, clearFidStorage } from "@/lib/useFid";

function setCookie(name: string, value: string, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; samesite=lax`;
}

type MiniSigninResult = { user?: { fid?: number | string } } | null;

export default function FarcasterLogin({ onLogin }: { onLogin?: (fid: number) => void }) {
  const { fid, setFid, loading } = useFid();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insideMiniApp = isInsideMini();

  // Notify parent when fid becomes available
  useEffect(() => {
    if (fid && onLogin) onLogin(fid);
  }, [fid, onLogin]);

  /** MiniKit / miniapp context “signin” (reads context) */
  async function handleMiniSignin() {
    setChecking(true);
    try {
      const res: MiniSigninResult = await miniSignin();
      const raw = res?.user?.fid;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        setFid(n);
        setCookie("fid", String(n));
      } else {
        throw new Error("No valid FID returned from MiniKit");
      }
    } catch (e: any) {
      console.error("MiniKit signin error:", e);
      setError("Failed to read session inside Warpcast.");
    } finally {
      setChecking(false);
    }
  }

  /** Web / Neynar lookup */
  async function confirmWithNeynar() {
    if (!fid) {
      setError("Enter your FID first.");
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const r = await fetch(`/api/neynar/user/${fid}`);
      if (!r.ok) throw new Error(`Neynar lookup failed (${r.status})`);
      await r.json(); // ok
      setCookie("fid", String(fid));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setChecking(false);
    }
  }

  if (loading)
    return <div className="text-sm text-zinc-500 animate-pulse">Detecting Farcaster session…</div>;

  if (fid)
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-green-100 px-3 py-1 text-sm text-green-800">
          Signed in (FID {fid})
        </div>
        <button
          onClick={() => {
            clearFidStorage();
            setFid(null);
          }}
          className="text-sm underline text-zinc-400 hover:text-white"
        >
          Sign out
        </button>
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/80">Sign in with Farcaster</div>

      {insideMiniApp ? (
        <button
          onClick={handleMiniSignin}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-sky-500 hover:opacity-90 font-medium text-white"
        >
          {checking ? "Signing in…" : "Sign in in Warpcast"}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            className="border border-white/20 rounded-lg px-3 py-2 w-40 bg-black/40 text-white placeholder:text-white/40"
            placeholder="Enter your FID"
            inputMode="numeric"
            onChange={(e) => {
              const n = e.target.value ? Number(e.target.value) : NaN;
              if (Number.isFinite(n) && n > 0) setFid(n);
            }}
          />
          <button
            onClick={confirmWithNeynar}
            disabled={checking || !fid}
            className="rounded-lg bg-purple-600 text-white px-3 py-2 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Confirm"}
          </button>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="text-xs text-zinc-400">
        {insideMiniApp
          ? "Detected Warpcast Mini App environment."
          : "Outside Warpcast? Enter your FID and we’ll verify it via Neynar."}
      </div>
    </div>
  );
}
