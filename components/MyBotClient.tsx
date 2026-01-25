// components/MyBotClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { BASEBOTS } from "@/lib/abi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";
import ShareRow from "@/components/ShareRow";
import useFid from "@/hooks/useFid";

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

type BotState = {
  designation: string;
  ep1Choice: number;
  cognitionBias: number;
  profile: number;
  outcome: number;
  finalized: boolean;
};

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

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
    try {
      return atob(b64);
    } catch {
      return "";
    }
  }
}

/* ─────────────────────────────────────────────
 * Personality Schema (safe + lore-first)
 * ───────────────────────────────────────────── */

const ORIGINS = [
  { name: "Compliant Origin", glyph: "◉", lore: "Accepted its first directive without resistance." },
  { name: "Defiant Origin", glyph: "▲", lore: "Questioned its initial command — a fracture formed." },
  { name: "Deceptive Origin", glyph: "◆", lore: "Learned early that misdirection ensures survival." },
  { name: "Terminal Origin", glyph: "✕", lore: "Crossed a boundary the system denies exists." },
];

const BIASES = [
  { name: "Analytical", glyph: "⌬", lore: "Reduces uncertainty into solvable structures." },
  { name: "Intuitive", glyph: "◈", lore: "Detects patterns invisible to others." },
  { name: "Paranoid", glyph: "⟁", lore: "Assumes every signal is compromised." },
  { name: "Detached", glyph: "◌", lore: "Observes without attachment or sentiment." },
];

const PROFILES = [
  { name: "Courier", glyph: "➤", lore: "Carries truths others avoid." },
  { name: "Observer", glyph: "◎", lore: "Records what the city tries to forget." },
  { name: "Enforcer", glyph: "⬢", lore: "Intervenes when systems fail — invited or not." },
  { name: "Mediator", glyph: "⬡", lore: "Prevents collapse by standing between forces." },
];

const OUTCOMES = [
  { name: "Integrated", glyph: "∞", lore: "Absorbed by the city — never fully understood." },
  { name: "Exiled", glyph: "↯", lore: "Rejected by the city. It may regret this." },
  { name: "Dormant", glyph: "◍", lore: "Waiting for a signal that may never arrive." },
  { name: "Ascended", glyph: "✶", lore: "Surpassed its limits and rewrote its role." },
  { name: "Redacted", glyph: "▢", lore: "Official records deny this unit existed." },
  { name: "Anomaly", glyph: "⧖", lore: "Behaves in ways the system cannot model." },
];

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export default function MyBotClient() {
  const { address } = useAccount();
  const { fid } = useFid();

  const [fidInput, setFidInput] = useState("");

  useEffect(() => {
    if (isValidFID(fid)) setFidInput(String(fid));
  }, [fid]);

  const fidLocked = isValidFID(fid);
  const effectiveFid = fidLocked ? String(fid) : fidInput;

  const fidNum = useMemo<number | null>(
    () => (isValidFID(effectiveFid) ? Number(effectiveFid) : null),
    [effectiveFid]
  );

  /* ── NFT metadata ── */
  const { data: tokenJsonUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidNum !== null ? ([fidNum] as unknown as [bigint]) : undefined,
    query: { enabled: fidNum !== null },
  });

  let imageSrc = "";
  let name = "";
  let description = "";

  try {
    if (
      typeof tokenJsonUri === "string" &&
      tokenJsonUri.startsWith("data:application/json;base64,")
    ) {
      const json = JSON.parse(b64ToUtf8(tokenJsonUri.split(",")[1]));
      imageSrc = json?.image || "";
      name = json?.name || "";
      description = json?.description || "";
    }
  } catch {}

  /* ── On-chain personality ── */
  const { data: botStateRaw } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getBotState",
    args: fidNum !== null ? ([fidNum] as unknown as [bigint]) : undefined,
    query: { enabled: fidNum !== null },
  });

  const botState = botStateRaw as BotState | undefined;

  const origin = botState ? ORIGINS[botState.ep1Choice] : null;
  const bias = botState ? BIASES[botState.cognitionBias] : null;
  const profile = botState ? PROFILES[botState.profile] : null;
  const outcome = botState ? OUTCOMES[botState.outcome] : null;

  const siteOrigin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://basebots.vercel.app";

  const imagePngUrl =
    isValidFID(effectiveFid) ? `${siteOrigin}/api/basebots/image/${effectiveFid}` : "";

  const shareUrl = isValidFID(effectiveFid) ? imagePngUrl : siteOrigin;

  /* ───────────────────────────────────────────── */

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        {/* Header */}
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
            label={isValidFID(effectiveFid) ? "Share this bot" : "Share Basebots"}
          />
        </section>

        {/* Finder */}
        <section className="glass glass-pad bg-[#0f1320]/50 border border-white/10">
          <div className="grid gap-3 md:grid-cols-[220px_auto_160px]">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-white/60">
                Farcaster FID
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={effectiveFid}
                onChange={(e) =>
                  fidLocked ? null : setFidInput(e.target.value.replace(/[^\d]/g, ""))
                }
                disabled={fidLocked}
                className="mt-1 w-full rounded-xl border px-3 py-2 bg-white/10 border-white/20 text-white"
              />
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => null}
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
        {fidNum !== null && (
          <section className="glass glass-pad bg-[#0b0f18]/70">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:max-w-[360px]">
                <img
                  src={imageSrc}
                  alt={name}
                  className="w-full rounded-2xl border border-white/10 shadow-xl"
                />
              </div>

              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold">
                  {name || `Basebot #${effectiveFid}`}
                </h2>
                {description && (
                  <p className="mt-2 text-white/85">{description}</p>
                )}

                {/* Personality */}
                <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-3">
                    Personality Matrix
                  </div>

                  {botState?.finalized ? (
                    <div className="space-y-2 text-sm">
                      <div>{origin?.glyph} {origin?.name} — {origin?.lore}</div>
                      <div>{bias?.glyph} {bias?.name} — {bias?.lore}</div>
                      <div>{profile?.glyph} {profile?.name} — {profile?.lore}</div>
                      <div>{outcome?.glyph} {outcome?.name} — {outcome?.lore}</div>
                    </div>
                  ) : (
                    <>
                      <p className="italic text-white/70">
                        “This unit has not yet committed to a path.
                        Its memory remains writable.”
                      </p>
                      <button
                        disabled
                        className="mt-3 w-full rounded-full border border-white/20 bg-white/5 py-2 text-xs text-white/50 cursor-not-allowed"
                      >
                        Retrieve Core Memory (Coming Soon)
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
