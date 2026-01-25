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
 * Personality Schema
 * ───────────────────────────────────────────── */

const ORIGINS = [
  { name: "Compliant Origin", glyph: "◉", lore: "Accepted its first directive without resistance." },
  { name: "Defiant Origin", glyph: "▲", lore: "Questioned its initial command — a fracture formed." },
  { name: "Deceptive Origin", glyph: "◆", lore: "Learned early that misdirection ensures survival." },
  { name: "Terminal Origin", glyph: "✕", lore: "Crossed a boundary the system denies exists." },
];

const BIASES = [
  { name: "Analytical", adj: "Analytical", glyph: "⌬", lore: "Reduces uncertainty into solvable structures." },
  { name: "Intuitive", adj: "Intuitive", glyph: "◈", lore: "Detects patterns invisible to others." },
  { name: "Paranoid", adj: "Paranoid", glyph: "⟁", lore: "Assumes every signal is compromised." },
  { name: "Detached", adj: "Detached", glyph: "◌", lore: "Observes without attachment or sentiment." },
];

const PROFILES = [
  { name: "Courier", noun: "Courier", glyph: "➤", lore: "Carries truths others avoid." },
  { name: "Observer", noun: "Observer", glyph: "◎", lore: "Records what the city tries to forget." },
  { name: "Enforcer", noun: "Enforcer", glyph: "⬢", lore: "Intervenes when systems fail — invited or not." },
  { name: "Mediator", noun: "Mediator", glyph: "⬡", lore: "Prevents collapse by standing between forces." },
];

const OUTCOMES = [
  { name: "Integrated", suffix: "of the City", glyph: "∞", lore: "Absorbed by the city — never fully understood." },
  { name: "Exiled", suffix: "of the Fringe", glyph: "↯", lore: "Rejected by the city. It may regret this." },
  { name: "Dormant", suffix: "in Waiting", glyph: "◍", lore: "Awaiting a signal that may never arrive." },
  { name: "Ascended", suffix: "Ascended", glyph: "✶", lore: "Surpassed its limits and rewrote its role." },
  { name: "Redacted", suffix: "[REDACTED]", glyph: "▢", lore: "Official records deny this unit existed." },
  { name: "Anomaly", suffix: "the Anomaly", glyph: "⧖", lore: "Behaves in ways the system cannot model." },
];

function buildPersonalityTitle(bot?: BotState) {
  if (!bot) return null;
  const bias = BIASES[bot.cognitionBias];
  const profile = PROFILES[bot.profile];
  const outcome = OUTCOMES[bot.outcome];
  if (!bias || !profile || !outcome) return null;
  return `The ${bias.adj} ${profile.noun} ${outcome.suffix}`;
}

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

  /* ── Metadata ── */
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
  const title = buildPersonalityTitle(botState);

  const siteOrigin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://basebots.vercel.app";

  const imagePngUrl =
    isValidFID(effectiveFid) ? `${siteOrigin}/api/basebots/image/${effectiveFid}` : "";

  const shareUrl = isValidFID(effectiveFid) ? imagePngUrl : siteOrigin;

  /* ───────────────────────────────────────────── */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 600px at 50% -200px, #0b1224, #020617)",
        color: "white",
        paddingBottom: 64,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        {/* Header */}
        <section
          style={{
            borderRadius: 24,
            padding: 24,
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.4))",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>
            Meet Your Basebot
          </h1>
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            Load your Farcaster-linked Basebot and share it with the city.
          </p>

          <div style={{ marginTop: 12 }}>
            <ShareRow
              url={shareUrl}
              imageUrl={imagePngUrl}
              label={isValidFID(effectiveFid) ? "Share this bot" : "Share Basebots"}
            />
          </div>
        </section>

        {/* Result */}
        {fidNum !== null && (
          <section
            style={{
              marginTop: 24,
              borderRadius: 24,
              padding: 24,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <img
                src={imageSrc}
                alt={name}
                style={{
                  width: 360,
                  maxWidth: "100%",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                }}
              />

              <div style={{ flex: 1, minWidth: 260 }}>
                <h2 style={{ fontSize: 26, fontWeight: 900 }}>
                  {name || `Basebot #${effectiveFid}`}
                </h2>

                {title && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      letterSpacing: 0.8,
                      opacity: 0.85,
                    }}
                  >
                    {title}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 20,
                    borderRadius: 16,
                    padding: 16,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {botState?.finalized ? (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: 1.6,
                          opacity: 0.6,
                          marginBottom: 8,
                          fontWeight: 700,
                        }}
                      >
                        PERSONALITY MATRIX
                      </div>

                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <div>{ORIGINS[botState.ep1Choice].glyph} {ORIGINS[botState.ep1Choice].lore}</div>
                        <div>{BIASES[botState.cognitionBias].glyph} {BIASES[botState.cognitionBias].lore}</div>
                        <div>{PROFILES[botState.profile].glyph} {PROFILES[botState.profile].lore}</div>
                        <div>{OUTCOMES[botState.outcome].glyph} {OUTCOMES[botState.outcome].lore}</div>
                      </div>

                      {/* Deep link placeholder */}
                      <div
                        style={{
                          marginTop: 16,
                          fontSize: 12,
                          opacity: 0.45,
                        }}
                      >
                        Deep Link: <span style={{ fontStyle: "italic" }}>/core-memory (locked)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontStyle: "italic", opacity: 0.7 }}>
                        “This unit has not yet committed to a path.
                        Its memory remains writable.”
                      </p>

                      <button
                        disabled
                        style={{
                          marginTop: 12,
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)",
                          cursor: "not-allowed",
                          fontWeight: 700,
                        }}
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
