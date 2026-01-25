"use client";

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
 * Lore
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
 * Environment safety
 * ───────────────────────────────────────────── */

function canUseShare(): boolean {
  if (typeof window === "undefined") return false;
  // Farcaster/Base webview is very strict
  return typeof navigator !== "undefined";
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

  const tokenId = useMemo<bigint | null>(() => {
    if (!isValidFID(effectiveFid)) return null;
    try {
      return BigInt(effectiveFid);
    } catch {
      return null;
    }
  }, [effectiveFid]);

  /* ── Metadata ── */
  const { data: tokenJsonUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: tokenId !== null ? [tokenId] : undefined,
    query: { enabled: tokenId !== null },
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

  /* ── Bot state ── */
  const { data: botStateRaw } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getBotState",
    args: tokenId !== null ? [tokenId] : undefined,
    query: { enabled: tokenId !== null },
  });

  const botState = botStateRaw as BotState | undefined;
  const summary = buildShortSummary(botState);

  const siteOrigin =
    (typeof window !== "undefined" && window.location.origin) ||
    "https://basebots.vercel.app";

  const imagePngUrl =
    tokenId !== null ? `${siteOrigin}/api/basebots/image/${effectiveFid}` : "";

  /* ───────────────────────────────────────────── */

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "white", paddingBottom: 64 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <section
          style={{
            borderRadius: 24,
            padding: 24,
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>Meet Your Basebot</h1>
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            Identity forged through on-chain choice.
          </p>

          {/* SAFE SHARE */}
          {canUseShare() && imagePngUrl && (
            <div style={{ marginTop: 12 }}>
              <ShareRow
                url={imagePngUrl}
                imageUrl={imagePngUrl}
                label="Cast this Basebot"
              />
            </div>
          )}
        </section>

        {tokenId !== null && (
          <section
            style={{
              marginTop: 24,
              borderRadius: 24,
              padding: 24,
              background: "rgba(0,0,0,0.35)",
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
                }}
              />

              <div style={{ flex: 1, minWidth: 260 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{name}</h2>

                <div
                  style={{
                    marginTop: 20,
                    borderRadius: 16,
                    padding: 16,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {botState?.finalized && summary ? (
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
                        PERSONALITY SUMMARY
                      </div>
                      <p style={{ whiteSpace: "pre-line", lineHeight: 1.45 }}>
                        {summary}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontStyle: "italic", opacity: 0.7 }}>
                        “This unit has not yet committed to a path.
                        The city is still deciding what it will become.”
                      </p>
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
