"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { BASEBOTS } from "@/lib/abi";

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

/** Safe base64 -> string in the browser */
function b64ToUtf8(b64: string): string {
  try {
    // atob is available in browser; handles our data: JSON
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
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
  const { address } = useAccount();
  const [fidInput, setFidInput] = useState<string>("");

  const fidBigInt = useMemo(
    () => (isValidFID(fidInput) ? BigInt(fidInput) : null),
    [fidInput]
  );

  // tokenURI (on-chain JSON with data:image/svg+xml;base64)
  const { data: tokenJsonUri, refetch: refetchToken } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidBigInt ? [fidBigInt] : undefined,
    query: { enabled: Boolean(fidBigInt) },
  });

  // ownerOf(fid)
  const {
    data: owner,
    error: ownerErr,
    refetch: refetchOwner,
  } = useReadContract({
    ...BASEBOTS,
    functionName: "ownerOf",
    args: fidBigInt ? [fidBigInt] : undefined,
    query: { enabled: Boolean(fidBigInt) },
  });

  const iOwnThis =
    !!address && typeof owner === "string" &&
    address.toLowerCase() === owner.toLowerCase();

  // Parse on-chain JSON if it's a base64 data URI
  let imageSrc = "";
  let name = "";
  let description = "";
  try {
    if (typeof tokenJsonUri === "string") {
      const prefix = "data:application/json;base64,";
      if (tokenJsonUri.startsWith(prefix)) {
        const b64 = tokenJsonUri.slice(prefix.length);
        const jsonStr = b64ToUtf8(b64);
        const json = JSON.parse(jsonStr);
        imageSrc = json?.image || "";
        name = json?.name || "";
        description = json?.description || "";
      }
    }
  } catch {
    // ignore parse errors
  }

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16">
      <div className="container pt-6 px-5 stack">

        {/* Header / Story */}
        <section className="glass glass-pad">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Meet Your Escort
          </h1>
          <p className="mt-2 text-white/85">
            Every Basebot is a tiny guardian stamped with your Farcaster FID.
            Type your FID and we’ll pull your bot’s on-chain portrait—etched in SVG,
            colored by the city’s blue aurora, and ready to roll.
          </p>
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
                onClick={() => {
                  if (!fidBigInt) return;
                  refetchOwner();
                  refetchToken();
                }}
                className="btn-pill btn-pill--blue !font-bold"
              >
                View my bot
              </button>

              <Link href="/" className="btn-ghost">Mint a bot</Link>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/70">
            Tip: Your FID is the numeric ID in your Farcaster profile.
          </p>
        </section>

        {/* Result */}
        {fidBigInt && (
          <section className="glass glass-pad relative overflow-hidden bg-[#0b0f18]/70">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, #79ffe155 0%, transparent 60%)" }}
            />
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="w-full md:max-w-[360px]">
                {imageSrc ? (
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
                <h2 className="text-xl md:text-2xl font-bold">
                  {name || `Basebot #${fidInput}`}
                </h2>
                <p className="mt-2 text-white/85">
                  {description ||
                    "Chrome shell. Soft glow. Patient eyes. Your escort registers the skyline and awaits your first command."}
                </p>

                <div className="pill-row mt-4">
                  <span className="pill-note pill-note--blue">Token ID (FID): {fidInput}</span>
                  {owner && (
                    <span className="pill-note pill-note--blue">
                      Owner: {String(owner).slice(0, 6)}…{String(owner).slice(-4)}
                    </span>
                  )}
                  {ownerErr && <span className="pill-note pill-note--red">Not minted or invalid FID</span>}
                  {iOwnThis ? (
                    <span className="pill-note pill-note--green">You own this bot</span>
                  ) : (
                    owner && <span className="pill-note pill-note--yellow">Owned by someone else</span>
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
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bottom pills (moved here) */}
        <section className="flex flex-wrap gap-3 justify-center">
          <Link
            href="https://basescan.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="pill-note pill-note--blue"
          >
            Chain: Base ↗
          </Link>
          <Link
            href={`https://basescan.org/address/${BASEBOTS.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pill-note pill-note--blue"
          >
            Contract: {BASEBOTS.address.slice(0,6)}…{BASEBOTS.address.slice(-4)} ↗
          </Link>
        </section>

        {/* Footer */}
        <section className="text-center text-white/70">
          <p className="text-sm">
            “Diagnostics nominal. Optics bright. Awaiting orders, Commander.” 🤖
          </p>
        </section>
      </div>
    </main>
  );
}
