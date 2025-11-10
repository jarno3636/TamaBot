// components/MyBotClient.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { BASEBOTS } from "@/lib/abi";
import AudioToggle from "@/components/AudioToggle";
import ShareRow from "@/components/ShareRow";
import { detectedFIDString, rememberFID } from "@/lib/fid";
import { Copy } from "lucide-react";

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
  const { address } = useAccount();
  const [fidInput, setFidInput] = useState<string>("");
  const [mode, setMode] = useState<"hd" | "onchain">("hd");

  // Prime input from env / URL / storage
  useEffect(() => {
    const first = detectedFIDString();
    if (first) setFidInput(first);
  }, []);

  // Persist valid FIDs locally
  useEffect(() => {
    if (isValidFID(fidInput)) rememberFID(fidInput);
  }, [fidInput]);

  // Use a null check (not &&) later to avoid 0n unions in JSX
  const fidBigInt = useMemo<bigint | null>(
    () => (isValidFID(fidInput) ? BigInt(fidInput) : null),
    [fidInput]
  );

  const { data: tokenJsonUri, refetch: refetchToken } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidBigInt !== null ? [fidBigInt] : undefined,
    query: { enabled: fidBigInt !== null },
  });

  const { data: owner, error: ownerErr, refetch: refetchOwner } = useReadContract({
    ...BASEBOTS,
    functionName: "ownerOf",
    args: fidBigInt !== null ? [fidBigInt] : undefined,
    query: { enabled: fidBigInt !== null },
  });

  const iOwnThis =
    !!address && typeof owner === "string" &&
    address.toLowerCase() === String(owner).toLowerCase();

  // Parse on-chain metadata → SVG data URI
  let imageSrc = "", name = "", description = "";
  try {
    if (typeof tokenJsonUri === "string" && tokenJsonUri.startsWith("data:application/json;base64,")) {
      const b64 = tokenJsonUri.split(",")[1] || "";
      const json = JSON.parse(b64ToUtf8(b64));
      imageSrc = json?.image || "";
      name = json?.name || "";
      description = json?.description || "";
    }
  } catch {}

  const siteRoot = process.env.NEXT_PUBLIC_FC_MINIAPP_LINK || process.env.NEXT_PUBLIC_URL || "";
  const siteUrl = siteRoot || "/";
  const hdSrc   = fidBigInt !== null ? `/api/img/${fidInput}.png` : "";
  const shareUrl = fidBigInt !== null ? `${siteRoot}/bot/${fidInput}` : siteUrl;

  const doCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    } catch {}
  }, [shareUrl]);

  const doShare = useCallback(async () => {
    const n = navigator as any;
    if (n?.share) {
      try { await n.share({ title: `Basebot #${fidInput}`, url: shareUrl }); } catch {}
    } else {
      await doCopy();
    }
  }, [shareUrl, fidInput, doCopy]);

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        <AudioToggle src="/audio/basebots-loop.mp3" />

        <section className="glass glass-pad relative">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Meet Your Basebot</h1>
          <p className="mt-2 text-white/85">
            Every Basebot is a tiny guardian stamped with your Farcaster FID. Type your FID and we’ll pull your bot’s portrait.
          </p>
          <ShareRow url={fidBigInt !== null ? shareUrl : siteUrl} className="mt-3" />
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
                onClick={() => { if (fidBigInt === null) return; refetchOwner(); refetchToken(); }}
                className="btn-pill btn-pill--blue !font-bold"
              >
                View my bot
              </button>
              <Link href="/" className="btn-ghost">Mint a bot</Link>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/70">Tip: Your FID is the numeric ID in your Farcaster profile.</p>
        </section>

        {/* Result */}
        {fidBigInt !== null ? (
          <section className="glass glass-pad relative overflow-hidden bg-[#0b0f18]/70">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, #79ffe155 0%, transparent 60%)" }}
            />
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* IMAGE */}
              <div className="w-full md:max-w-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mode === "hd" ? hdSrc : (imageSrc || hdSrc)}
                  alt={name || `Basebot #${fidInput}`}
                  className="w-full rounded-2xl border border-white/10 shadow-xl bg-black/10"
                />

                {/* VIEW TOGGLE */}
                <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                  <button
                    className={`px-3 py-1 rounded-lg text-sm ${mode==="hd" ? "bg-white/15 font-semibold" : ""}`}
                    onClick={() => setMode("hd")}
                  >
                    HD render
                  </button>
                  <button
                    className={`px-3 py-1 rounded-lg text-sm ${mode==="onchain" ? "bg-white/15 font-semibold" : ""}`}
                    onClick={() => setMode("onchain")}
                  >
                    On-chain SVG
                  </button>
                </div>

                {/* SHARE / DOWNLOAD */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={doShare} className="btn-pill btn-pill--blue !font-bold">Share</button>
                  <button onClick={doCopy} className="btn-ghost flex items-center gap-1">
                    <Copy className="h-4 w-4" /> Copy link
                  </button>
                  <a
                    href={hdSrc}
                    download={`basebot-${fidInput}.png`}
                    className="btn-ghost"
                  >
                    Download PNG
                  </a>
                </div>
              </div>

              {/* META */}
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold">{name || `Basebot #${fidInput}`}</h2>
                <p className="mt-2 text-white/85">
                  {description || "Chrome shell. Soft glow. Patient eyes. Your BaseBot registers the skyline and awaits your first command."}
                </p>

                <div className="pill-row mt-4">
                  <span className="pill-note pill-note--blue">Token ID (FID): {fidInput}</span>
                  {typeof owner === "string" && (
                    <span className="pill-note pill-note--blue">
                      Owner: {owner.slice(0, 6)}…{owner.slice(-4)}
                    </span>
                  )}
                  {ownerErr && <span className="pill-note pill-note--red">Not minted or invalid FID</span>}
                  {iOwnThis ? (
                    <span className="pill-note pill-note--green">You own this bot</span>
                  ) : (
                    typeof owner === "string" && <span className="pill-note pill-note--yellow">Owned by someone else</span>
                  )}
                </div>

                <div className="cta-row mt-5">
                  <Link
                    href={`https://basescan.org/token/${BASEBOTS.address}?a=${fidInput}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                  >
                    View on BaseScan
                  </Link>
                  <Link href="/" className="btn-pill btn-pill--blue !font-bold">
                    Mint another
                  </Link>
                  <Link href={`/bot/${fidInput}`} className="btn-ghost">Open share page</Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
