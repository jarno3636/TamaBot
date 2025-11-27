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
        .join(""),
    );
  } catch {
    try {
      return atob(b64);
    } catch {
      return "";
    }
  }
}

export default function MyBotClient() {
  const { address } = useAccount(); // harmless, may be unused
  const { fid } = useFid();         // canonical FID from mini app

  const [fidInput, setFidInput] = useState<string>("");

  // Populate from Farcaster
  useEffect(() => {
    if (isValidFID(fid)) setFidInput(String(fid));
  }, [fid]);

  const fidLocked = isValidFID(fid); // as soon as we know the user's FID
  const effectiveFid = fidLocked && isValidFID(fid) ? String(fid) : fidInput;

  // 🔒 BigInt-safe FID (won't throw on older WebViews)
  const fidBigInt = useMemo<bigint | null>(() => {
    try {
      if (typeof BigInt !== "function") return null;
      return isValidFID(effectiveFid) ? BigInt(effectiveFid) : null;
    } catch {
      return null;
    }
  }, [effectiveFid]);

  // Pull the on-chain tokenURI (basic bot JSON with image data URL)
  const { data: tokenJsonUri, refetch: refetchToken } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidBigInt !== null ? [fidBigInt] : undefined,
    query: { enabled: fidBigInt !== null },
  });

  // Decode image/name/description from tokenURI
  let imageSrc = "",
    name = "",
    description = "";
  try {
    if (
      typeof tokenJsonUri === "string" &&
      tokenJsonUri.startsWith("data:application/json;base64,")
    ) {
      const b64 = tokenJsonUri.split(",")[1] || "";
      const json = JSON.parse(b64ToUtf8(b64));
      imageSrc = json?.image || "";
      name = json?.name || "";
      description = json?.description || "";
    }
  } catch {
    /* ignore decode errors */
  }

  // Determine absolute origin (works in web and mini)
  const siteOrigin =
    (typeof window !== "undefined" && window.location?.origin) ||
    (process.env.NEXT_PUBLIC_URL || "").replace(/\/$/, "") ||
    "https://basebots.vercel.app";

  // OG page to share (renders rich card w/ the PNG as og:image)
  const shareUrl = isValidFID(effectiveFid)
    ? `${siteOrigin}/og/bot/${effectiveFid}`
    : siteOrigin || "/";

  // Optional: direct PNG if you want to pass it through for Farcaster embeds
  const imagePngUrl = isValidFID(effectiveFid)
    ? `${siteOrigin}/api/basebots/image/${effectiveFid}`
    : "";

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        {/* Header + Share */}
        <section className="glass glass-pad relative">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Meet Your Basebot
          </h1>
          <p className="mt-2 text-white/85">
            Load your Farcaster-linked Basebot and share it with the city.
          </p>
          <ShareRow
            url={shareUrl}
            imageUrl={imagePngUrl}
            className="mt-3"
            label={
              isValidFID(effectiveFid) ? "Share this bot" : "Share Basebots"
            }
          />
        </section>

        {/* Finder */}
        <section className="glass glass-pad bg-[#0f1320]/50 border border-white/10">
          <div className="grid gap-3 md:grid-cols-[220px_auto_160px]">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-2">
                Farcaster FID
                {fidLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-[2px] text-[11px] text-emerald-300 border border-emerald-400/40">
                    ✓ Loaded from your profile
                  </span>
                )}
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={effectiveFid}
                onChange={(e) =>
                  fidLocked
                    ? null
                    : setFidInput(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="e.g. 12345"
                disabled={fidLocked}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 ${
                  fidLocked
                    ? "bg-white/5 border-emerald-400/40 cursor-not-allowed text-white/80"
                    : "bg-white/10 border-white/20 focus:ring-[#79ffe1]/60"
                }`}
              />
              {fidLocked ? (
                <p className="mt-1 text-[11px] text-emerald-300">
                  This FID comes from the Farcaster mini app session and can’t
                  be edited here. To view a different FID, open Basebots from
                  that profile.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-white/60">
                  Tip: Your FID is the numeric ID on your Farcaster profile.
                </p>
              )}
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (fidBigInt !== null) refetchToken();
                }}
                className="btn-pill btn-pill--blue !font-bold"
              >
                Load bot
              </button>
              <Link href="/" className="btn-ghost">
                Mint
              </Link>
            </div>
          </div>
        </section>

        {/* Result */}
        {fidBigInt !== null && (
          <section className="glass glass-pad relative overflow-hidden bg-[#0b0f18]/70">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="w-full md:max-w-[360px]">
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={name || `Basebot #${effectiveFid}`}
                    className="w-full rounded-2xl border border-white/10 shadow-xl"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-2xl border border-dashed border-white/20 grid place-items-center text-white/50">
                    No image yet — is this FID minted?
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold">
                  {name || `Basebot #${effectiveFid}`}
                </h2>
                {description ? (
                  <p className="mt-2 text-white/85">{description}</p>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
