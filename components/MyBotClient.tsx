// components/MyBotClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { BASEBOTS } from "@/lib/abi";
import ShareRow from "@/components/ShareRow";
import useFid from "@/hooks/useFid";

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

function b64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    try { return atob(b64); } catch { return ""; }
  }
}

export default function MyBotClient() {
  const { address } = useAccount(); // harmless, may be unused
  const { fid } = useFid();         // ✅ canonical FID source
  const [fidInput, setFidInput] = useState<string>("");

  // Populate input when hook resolves/changes
  useEffect(() => {
    if (isValidFID(fid)) setFidInput(String(fid));
  }, [fid]);

  const fidBigInt = useMemo<bigint | null>(
    () => (isValidFID(fidInput) ? BigInt(fidInput) : null),
    [fidInput]
  );

  // Pull the on-chain tokenURI (basic bot JSON with image data URL)
  const { data: tokenJsonUri, refetch: refetchToken } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidBigInt !== null ? [fidBigInt] : undefined,
    query: { enabled: fidBigInt !== null },
  });

  // Decode image/name/description from tokenURI
  let imageSrc = "", name = "", description = "";
  try {
    if (typeof tokenJsonUri === "string" && tokenJsonUri.startsWith("data:application/json;base64,")) {
      const b64 = tokenJsonUri.split(",")[1] || "";
      const json = JSON.parse(b64ToUtf8(b64));
      imageSrc = json?.image || "";
      name = json?.name || "";
      description = json?.description || "";
    }
  } catch {
    /* ignore decode errors; UI will show "No image yet" */
  }

  // Determine absolute origin (works in web and mini)
  const siteOrigin =
    (typeof window !== "undefined" && window.location?.origin) ||
    (process.env.NEXT_PUBLIC_URL || "").replace(/\/$/, "") ||
    "https://basebots.vercel.app";

  // Page to share (permalink to this bot)
  const shareUrl = fidInput ? `${siteOrigin}/bot/${fidInput}` : (siteOrigin || "/");

  // ✅ Public PNG for Farcaster embed (from your /api route)
  const imagePngUrl = isValidFID(fidInput) ? `${siteOrigin}/api/basebots/image/${fidInput}` : "";

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        {/* Header + Share */}
        <section className="glass glass-pad relative">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Meet Your Basebot</h1>
          <p className="mt-2 text-white/85">
            Type your Farcaster FID to load your bot’s on-chain image and share it.
          </p>
          <ShareRow
            url={shareUrl}                 // link for X/Twitter
            imageUrl={imagePngUrl}         // 👈 PNG embed for Farcaster
            className="mt-3"
            label={isValidFID(fidInput) ? "Share this bot" : "Share Basebots"}
          />
        </section>

        {/* Finder */}
        <section className="glass glass-pad bg-[#0f1320]/50 border border-white/10">
          <div className="grid gap-3 md:grid-cols-[220px_auto_160px]">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-white/60">Farcaster FID</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={fidInput}
                onChange={(e) => setFidInput(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="e.g. 12345"
                className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
              />
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => { if (fidBigInt !== null) refetchToken(); }}
                className="btn-pill btn-pill--blue !font-bold"
              >
                Load bot
              </button>
              <Link href="/" className="btn-ghost">Mint</Link>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/70">
            Tip: Your FID is the numeric ID on your Farcaster profile.
          </p>
        </section>

        {/* Result */}
        {fidBigInt !== null ? (
          <section className="glass glass-pad relative overflow-hidden bg-[#0b0f18]/70">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="w-full md:max-w-[360px]">
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={name || `Basebot #${fidInput}`}
                    className="w-full rounded-2xl border border-white/10 shadow-xl"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-2xl border border-dashed border-white/20 grid place-items-center text-white/50">
                    No image yet — is this FID minted?
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold">{name || `Basebot #${fidInput}`}</h2>
                {description ? <p className="mt-2 text-white/85">{description}</p> : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
