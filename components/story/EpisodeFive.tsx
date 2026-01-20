"use client";

import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const EP3_KEY = "basebots_ep3_state_v1";
const EP4_KEY = "basebots_ep4_profile_v1";
const EP5_KEY = "basebots_ep5_outcome_v1";
const EP5_DONE_KEY = "basebots_ep5_done";
const SOUND_KEY = "basebots_ep5_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId?: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
};

type Ep3State = {
  cognitionBias?: "DETERMINISTIC" | "ARCHIVAL" | "PRAGMATIC" | "PARANOID";
};

type Ep4Profile = {
  profile?: "EXECUTOR" | "OBSERVER" | "OPERATOR" | "SENTINEL";
};

type Outcome =
  | "AUTHORIZED"
  | "OBSERVED"
  | "SILENT"
  | "UNTRACKED"
  | "FLAGGED";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function deriveOutcome(
  ep1?: Ep1Save["choiceId"],
  bias?: Ep3State["cognitionBias"],
  profile?: Ep4Profile["profile"]
): Outcome {
  if (ep1 === "PULL_PLUG") return "UNTRACKED";
  if (ep1 === "SPOOF") return "SILENT";
  if (profile === "SENTINEL") return "FLAGGED";
  if (profile === "OBSERVER") return "OBSERVED";
  return "AUTHORIZED";
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeFive({ onExit }: { onExit: () => void }) {
  const ep1 = useMemo(() => load<Ep1Save>(EP1_KEY), []);
  const ep3 = useMemo(() => load<Ep3State>(EP3_KEY), []);
  const ep4 = useMemo(() => load<Ep4Profile>(EP4_KEY), []);

  const outcome = useMemo(
    () =>
      deriveOutcome(
        ep1?.choiceId,
        ep3?.cognitionBias,
        ep4?.profile
      ),
    [ep1, ep3, ep4]
  );

  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  /* ── ambient audio ── */
  useEffect(() => {
    const audio = new Audio("/audio/s5.mp3");
    audio.loop = true;
    audio.volume = 0.5;

    if (soundOn) audio.play().catch(() => {});
    return () => audio.pause();
  }, [soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  }

  /* ── finalize metadata once ── */
  useEffect(() => {
    const payload = {
      directive: ep1?.choiceId ?? "UNKNOWN",
      cognition: ep3?.cognitionBias ?? "UNKNOWN",
      profile: ep4?.profile ?? "UNASSIGNED",
      outcome,
      completedAt: Date.now(),
    };

    localStorage.setItem(EP5_KEY, JSON.stringify(payload));
    localStorage.setItem(EP5_DONE_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
  }, [outcome]);

  /* ────────────────────────────────────────────── */

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.14)",
        padding: 26,
        color: "white",
        background:
          "radial-gradient(1200px 480px at 50% -10%, rgba(52,211,153,0.10), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.78))",
        boxShadow: "0 70px 260px rgba(0,0,0,0.95)",
      }}
    >
      {/* scanlines */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.07,
        }}
      />

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={toggleSound}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "4px 10px",
            fontSize: 11,
            background: "rgba(255,255,255,0.04)",
            color: "white",
          }}
        >
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={onExit}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "4px 10px",
            fontSize: 11,
            background: "rgba(255,255,255,0.04)",
            color: "white",
          }}
        >
          Exit
        </button>
      </div>

      {/* TITLE */}
      <h2
        style={{
          marginTop: 16,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 1.2,
        }}
      >
        EMERGENCE
      </h2>

      {/* BODY */}
      <p style={{ marginTop: 14, fontSize: 14, opacity: 0.85 }}>
        Surface protocols execute without further input.
      </p>

      <p style={{ marginTop: 10, fontSize: 13, opacity: 0.6 }}>
        The city does not greet new intelligence.
        <br />
        It reacts.
      </p>

      <div
        style={{
          marginTop: 20,
          borderRadius: 18,
          padding: "14px",
          fontFamily: "monospace",
          fontSize: 13,
          letterSpacing: 2,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.18)",
          textAlign: "center",
        }}
      >
        {outcome}
      </div>

      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.55 }}>
        This response was shaped by every prior decision —
        <br />
        including the ones you did not recognize as choices.
      </p>

      <p style={{ marginTop: 10, fontSize: 12, opacity: 0.45 }}>
        The system will now operate where you cannot follow.
      </p>

      <button
        onClick={onExit}
        style={{
          marginTop: 22,
          borderRadius: 999,
          padding: "8px 18px",
          fontSize: 12,
          fontWeight: 800,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.04)",
          color: "white",
        }}
      >
        Return to hub
      </button>
    </section>
  );
}
