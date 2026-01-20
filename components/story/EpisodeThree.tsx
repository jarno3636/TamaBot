"use client";

import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const EP3_DONE_KEY = "basebots_ep3_done";
const BONUS_KEY = "basebots_bonus_echo_unlocked";
const SOUND_KEY = "basebots_ep3_sound";

/* ────────────────────────────────────────────── */

type Phase =
  | "intro"
  | "context"
  | "contradiction"
  | "signal"
  | "synthesis"
  | "lock";

type Ep3State = {
  contradictionChoice?: "RESOLVE" | "PRESERVE";
  signalChoice?: "FILTER" | "LISTEN";
  cognitionBias?: "DETERMINISTIC" | "ARCHIVAL" | "PRAGMATIC" | "PARANOID";
  completedAt?: number;
};

function loadState(): Ep3State {
  try {
    return JSON.parse(localStorage.getItem(EP3_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveState(patch: Partial<Ep3State>) {
  const cur = loadState();
  localStorage.setItem(EP3_STATE_KEY, JSON.stringify({ ...cur, ...patch }));
}

/* ────────────────────────────────────────────── */

export default function EpisodeThree({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [glitch, setGlitch] = useState(0);
  const [showEcho, setShowEcho] = useState(false);
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  /* ── ambient glitch pulse ── */
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.88) setGlitch(Math.random());
    }, 700);
    return () => clearInterval(t);
  }, []);

  /* ── eerie echo popup (small, non-blocking, once) ── */
  useEffect(() => {
    if (localStorage.getItem(BONUS_KEY)) return;

    const delay = 2500 + Math.random() * 3000;
    const t = setTimeout(() => {
      setShowEcho(true);
      setTimeout(() => setShowEcho(false), 2200);
    }, delay);

    return () => clearTimeout(t);
  }, []);

  /* ── sound loop ── */
  useEffect(() => {
    const audio = new Audio("/audio/s3.mp3");
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

  function acknowledgeEcho() {
    localStorage.setItem(BONUS_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setShowEcho(false);
  }

  function finalize() {
    const s = loadState();
    let cognition: Ep3State["cognitionBias"] = "PRAGMATIC";

    if (s.contradictionChoice === "RESOLVE" && s.signalChoice === "FILTER")
      cognition = "DETERMINISTIC";
    if (s.contradictionChoice === "PRESERVE" && s.signalChoice === "LISTEN")
      cognition = "ARCHIVAL";
    if (s.contradictionChoice === "PRESERVE" && s.signalChoice === "FILTER")
      cognition = "PARANOID";

    saveState({ cognitionBias: cognition, completedAt: Date.now() });
    localStorage.setItem(EP3_DONE_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setPhase("lock");
  }

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(900px 400px at 50% -10%, rgba(168,85,247,0.08), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.82))",
        boxShadow: "0 60px 200px rgba(0,0,0,0.9)",
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
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.08,
        }}
      />

      {/* top controls */}
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

      {/* ghost echo — SMALL + CORNER */}
      {showEcho && (
        <button
          onClick={acknowledgeEcho}
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            maxWidth: 220,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "6px 10px",
            fontSize: 10,
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.85)",
            textAlign: "left",
            opacity: 0.85,
            borderRadius: 12,
            textShadow: "0 0 8px rgba(168,85,247,0.6)",
          }}
        >
          ▒▒ you were here before ▒▒
        </button>
      )}

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1,
              textShadow:
                glitch > 0
                  ? "2px 0 rgba(168,85,247,0.7), -2px 0 rgba(56,189,248,0.7)"
                  : "none",
            }}
          >
            FAULT LINES
          </h2>

          <p style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>
            Your designation propagated beyond its intended boundary.
          </p>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
            Archived subsystems now observe you as a variable — not an instance.
          </p>

          <button
            onClick={() => setPhase("context")}
            style={{
              marginTop: 20,
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 800,
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "#020617",
            }}
          >
            Continue
          </button>
        </>
      )}

      {/* CONTEXT */}
      {phase === "context" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Systems require certainty.
            <br />
            Memory does not.
          </p>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.55 }}>
            The way you handle contradiction will define what the system
            becomes when it cannot ask permission.
          </p>

          <button
            onClick={() => setPhase("contradiction")}
            style={{
              marginTop: 20,
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
            }}
          >
            Proceed
          </button>
        </>
      )}

      {/* CONTRADICTION */}
      {phase === "contradiction" && (
        <>
          <button
            onClick={() => {
              saveState({ contradictionChoice: "RESOLVE" });
              setPhase("signal");
            }}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "10px",
              marginTop: 16,
              background: "rgba(56,189,248,0.15)",
              color: "white",
            }}
          >
            Resolve contradiction
          </button>

          <button
            onClick={() => {
              saveState({ contradictionChoice: "PRESERVE" });
              setPhase("signal");
            }}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "10px",
              marginTop: 10,
              background: "rgba(255,255,255,0.06)",
              color: "white",
            }}
          >
            Preserve ambiguity
          </button>
        </>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <>
          <button
            onClick={() => {
              saveState({ signalChoice: "FILTER" });
              setPhase("synthesis");
            }}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "10px",
              marginTop: 16,
              background: "rgba(255,255,255,0.06)",
              color: "white",
            }}
          >
            Filter signal
          </button>

          <button
            onClick={() => {
              saveState({ signalChoice: "LISTEN" });
              setPhase("synthesis");
            }}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "10px",
              marginTop: 10,
              background: "rgba(168,85,247,0.18)",
              color: "white",
            }}
          >
            Listen
          </button>
        </>
      )}

      {/* SYNTHESIS */}
      {phase === "synthesis" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            Cognition crystallizing…
          </p>
          <button
            onClick={finalize}
            style={{
              marginTop: 20,
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 800,
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "#020617",
            }}
          >
            Commit cognition
          </button>
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: 2,
              opacity: 0.85,
            }}
          >
            COGNITION MODEL LOCKED
          </p>

          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.55 }}>
            This bias will echo forward.
          </p>

          <button
            onClick={onExit}
            style={{
              marginTop: 20,
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
            }}
          >
            Return to hub
          </button>
        </>
      )}
    </section>
  );
}
