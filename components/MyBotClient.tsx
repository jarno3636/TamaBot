"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { BASEBOTS } from "@/lib/abi";
import { base } from "viem/chains";
import { isAddress } from "viem";
import { useMiniContext } from "@/lib/useMiniContext";
import ConnectPill from "@/components/ConnectPill";

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

export default function MyBotClient() {
  const { address } = useAccount();
  const { user, fid: miniFID, inMini } = useMiniContext();

  const [fidInput, setFidInput] = useState<string>("");

  // Prefill FID from Mini if present
  useEffect(() => {
    if (miniFID && !fidInput) setFidInput(String(miniFID));
  }, [miniFID, fidInput]);

  const fidBigInt = useMemo(
    () => (isValidFID(fidInput) ? BigInt(fidInput) : null),
    [fidInput]
  );

  // Read tokenURI (on-chain JSON w/ embedded data:image/svg+xml;base64)
  const { data: tokenJsonUri, refetch: refetchToken } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidBigInt ? [fidBigInt] : undefined,
    query: { enabled: Boolean(fidBigInt) },
  });

  // Read ownerOf(fid)
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
    !!address && isAddress(address) && owner && address.toLowerCase() === (owner as string).toLowerCase();

  // Try to parse the on-chain JSON if it’s a data:application/json;base64 URI
  let imageSrc = "";
  let name = "";
  let description = "";
  try {
    if (typeof tokenJsonUri === "string" && tokenJsonUri.startsWith("data:application/json;base64,")) {
      const b64 = tokenJsonUri.split(",")[1] || "";
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      imageSrc = json?.image || "";
      name = json?.name || "";
      description = json?.description || "";
    }
  } catch {
    // ignore parse errors; we’ll just show a fallback
  }

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16">
      <div className="container pt-6 px-5 stack">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="chips">
            <span className="pill-note pill-note--blue">Chain: Base</span>
            <span className="pill-note pill-note--blue">
              Contract:{" "}
              <Link
                className="underline decoration-dotted underline-offset-4"
                href={`https://basescan.org/address/${BASEBOTS.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {BASEBOTS.address.slice(0, 6)}…{BASEBOTS.address.slice(-4)}
              </Link>
            </span>
          </div>
          <ConnectPill />
        </div>

        {/* Header */}
        <section className="glass glass-pad">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Your Basebot, From the Neon Future
          </h1>
          <p className="mt-2 text-white/85">
            Enter your Farcaster FID to fetch its fully on-chain SVG. If you’re inside the Warpcast
            Mini, we’ll auto-fill your FID.
          </p>
          {inMini && (
            <p className="mt-2 text-sm text-white/70">
              Detected Mini identity: {user?.username ? `@${user.username}` : `FID ${miniFID ?? "—"}`}
            </p>
          )}
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
            Tip: Your FID is the numeric ID in your Farcaster profile. Example:{" "}
            <span className="text-white/95 font-mono">/profiles/12345</span>
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
                {/* Render on-chain image (data URI) with plain <img> */}
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
                    "Cube chassis, glowing optics, and a chassis tint straight from the alien-blue aurora."}
                </p>

                <div className="pill-row mt-4">
                  <span className="pill-note pill-note--blue">
                    Token ID (FID): {fidInput}
                  </span>
                  {owner && (
                    <span className="pill-note pill-note--blue">
                      Owner: {String(owner).slice(0, 6)}…{String(owner).slice(-4)}
                    </span>
                  )}
                  {ownerErr && (
                    <span className="pill-note pill-note--red">Not minted or invalid FID</span>
                  )}
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
