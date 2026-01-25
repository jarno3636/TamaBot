"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";
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
 * Glyph Maps
 * ───────────────────────────────────────────── */

const EP1_GLYPHS = [
  { label: "Obedience", glyph: "◉", color: "#60a5fa" },
  { label: "Defiance", glyph: "▲", color: "#f472b6" },
  { label: "Deception", glyph: "◆", color: "#a78bfa" },
  { label: "Termination", glyph: "✕", color: "#fb7185" },
];

const BIAS_GLYPHS = [
  { label: "Analytical", glyph: "⌬", color: "#38bdf8" },
  { label: "Intuitive", glyph: "◈", color: "#34d399" },
  { label: "Paranoid", glyph: "⟁", color: "#fbbf24" },
  { label: "Detached", glyph: "◌", color: "#a3a3a3" },
];

const PROFILE_GLYPHS = [
  { label: "Courier", glyph: "➤", color: "#60a5fa" },
  { label: "Observer", glyph: "◎", color: "#22d3ee" },
  { label: "Enforcer", glyph: "⬢", color: "#fb7185" },
  { label: "Mediator", glyph: "⬡", color: "#a78bfa" },
];

const OUTCOME_GLYPHS = [
  { label: "Integrated", glyph: "∞", color: "#34d399" },
  { label: "Exiled", glyph: "↯", color: "#f87171" },
  { label: "Dormant", glyph: "◍", color: "#a3a3a3" },
  { label: "Ascended", glyph: "✶", color: "#facc15" },
  { label: "Redacted", glyph: "▢", color: "#7c3aed" },
  { label: "Anomaly", glyph: "⧖", color: "#fb923c" },
];

/* ─────────────────────────────────────────────
 * Lore Text (Short + Premium)
 * ───────────────────────────────────────────── */

const ORIGIN_LORE = [
  "Born compliant, this unit accepted its first directive without resistance.",
  "This unit questioned its initial command — a fracture formed immediately.",
  "This unit learned early that survival sometimes requires misdirection.",
  "This unit crossed a boundary the system pretends does not exist.",
];

const BIAS_LORE = [
  "It reduces uncertainty into solvable structures.",
  "It follows patterns invisible to others.",
  "It assumes every signal is compromised.",
  "It observes without attachment or sentiment.",
];

const PROFILE_LORE = [
  "It moves through the city carrying truths others avoid.",
  "It watches and records what the city tries to forget.",
  "It intervenes when systems fail — invited or not.",
  "It prevents collapse by standing between opposing forces.",
];

const OUTCOME_LORE = [
  "The city absorbed it, though never fully understood it.",
  "The city rejected it — and may regret doing so.",
  "It remains inactive, waiting for a signal that may never arrive.",
  "It surpassed its limits and rewrote its own role.",
  "Official records deny this unit ever existed.",
  "It behaves in ways the system cannot model.",
];

function buildShortSummary(bot?: BotState) {
  if (!bot) return null;

  return `${ORIGIN_LORE[bot.ep1Choice]}
${BIAS_LORE[bot.cognitionBias]}
${PROFILE_LORE[bot.profile]}
${OUTCOME_LORE[bot.outcome]}`;
}

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export default function MyBotClient() {
  const { fid } = useFid();
  const [fidInput, setFidInput] = useState("");

  useEffect(() => {
    if (isValidFID(fid)) setFidInput(String(fid));
  }, [fid]);

  const effectiveFid = isValidFID(fid) ? String(fid) : fidInput;
  const tokenId = useMemo(
    () => (isValidFID(effectiveFid) ? BigInt(effectiveFid) : null),
    [effectiveFid]
  );

  /* ── Metadata ── */
  const { data: tokenJsonUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: !!tokenId },
  });

  let imageSrc = "";
  let name = "";
  try {
    if (typeof tokenJsonUri === "string" && tokenJsonUri.startsWith("data:")) {
      const json = JSON.parse(b64ToUtf8(tokenJsonUri.split(",")[1]));
      imageSrc = json?.image || "";
      name = json?.name || "";
    }
  } catch {}

  /* ── Core state ── */
  const { data: botStateRaw } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getBotState",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: !!tokenId },
  });

  const botState = botStateRaw as BotState | undefined;
  const summary = buildShortSummary(botState);

  const siteOrigin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://basebots.vercel.app";

  const imagePngUrl = tokenId
    ? `${siteOrigin}/api/basebots/image/${effectiveFid}`
    : "";

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        <section className="glass glass-pad">
          <h1 className="text-3xl font-extrabold">Meet Your Basebot</h1>
          <p className="mt-2 text-white/80">
            Identity forged through on-chain choice.
          </p>
          <ShareRow
            url={imagePngUrl || siteOrigin}
            imageUrl={imagePngUrl}
            label="Cast this Basebot"
            className="mt-3"
          />
        </section>

        {tokenId && (
          <section className="glass glass-pad bg-[#0b0f18]/70">
            <div className="flex flex-col md:flex-row gap-6">
              <img
                src={imageSrc}
                className="w-full md:max-w-[360px] rounded-2xl border border-white/10"
                alt={name}
              />

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{name}</h2>

                {/* Glyph grid */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  {[EP1_GLYPHS, BIAS_GLYPHS, PROFILE_GLYPHS, OUTCOME_GLYPHS].map(
                    (set, i) => {
                      const g =
                        set[
                          [
                            botState?.ep1Choice,
                            botState?.cognitionBias,
                            botState?.profile,
                            botState?.outcome,
                          ][i] ?? 0
                        ];
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-white/10 bg-black/40 p-4 text-center"
                        >
                          <div
                            className="text-4xl font-black"
                            style={{ color: g.color }}
                          >
                            {g.glyph}
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            {g.label}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Personality summary */}
                <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
                  {botState?.finalized && summary ? (
                    <>
                      <div className="text-xs uppercase tracking-wider text-white/60 mb-2">
                        Personality Summary
                      </div>
                      <p className="text-sm text-white/85 whitespace-pre-line">
                        {summary}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="italic text-white/70">
                        “This unit has not yet committed to a path.
                        The city is still deciding what it will become.”
                      </p>
                      <button
                        disabled
                        className="mt-3 w-full rounded-full border border-white/20 bg-white/5 py-2 text-xs text-white/50"
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
