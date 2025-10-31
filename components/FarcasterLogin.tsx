"use client";

import { useEffect, useState } from "react";
import { isInsideMini, miniSignin } from "@/lib/mini";

function setCookie(name: string, value: string, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
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
  const [insideMiniApp, setInsideMiniApp] = useState(false);

  useEffect(() => {
    const inside = isInsideMini();
    setInsideMiniApp(inside);

    // 1️⃣ MiniKit auto context
    const mk: any = (globalThis as any).MiniKit;
    if (mk?.user?.fid) {
      const f = Number(mk.user.fid);
      setFid(f);
      localStorage.setItem("fid", String(f));
      setCookie("fid", String(f));
      onLogin?.(f);
      setLoading(false);
      return;
    }

    // 2️⃣ Cookie/localStorage fallback
    const saved = Number(getCookie("fid") || localStorage.getItem("fid") || "");
    if (Number.isFinite(saved) && saved > 0) {
      setFid(saved);
      onLogin?.(saved);
    }
    setLoading(false);
  }, [onLogin]);

  /** MiniKit sign-in */
  async function handleMiniSignin() {
    setChecking(true);
    try {
      const res = await miniSignin();
      const newFid = res?.user?.fid;
      if (newFid) {
        setFid(newFid);
        localStorage.setItem("fid", String(newFid));
        setCookie("fid", String(newFid));
        onLogin?.(newFid);
      } else {
        throw new Error("No FID returned from MiniKit");
      }
    } catch (e: any) {
      console.error("MiniKit signin error:", e);
      setError("Failed to sign in inside Warpcast.");
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
      const j = await r.json();
      localStorage.setItem("fid", String(fid));
      setCookie("fid", String(fid));
      onLogin?.(fid);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setChecking(false);
    }
  }

  if (loading)
    return (
      <div className="text-sm text-zinc-500 animate-pulse">Detecting Farcaster session…</div>
    );

  if (fid)
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-green-100 px-3 py-1 text-sm text-green-800">
          Signed in (FID {fid})
        </div>
        <button
          onClick={() => {
            setFid(null);
            localStorage.removeItem("fid");
            setCookie("fid", "", -1);
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
            onChange={(e) =>
              setFid(e.target.value ? Number(e.target.value) : null)
            }
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
