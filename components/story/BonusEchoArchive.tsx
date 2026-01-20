"use client";

import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const BONUS_DONE_KEY = "basebots_bonus_echo_done";
const SOUND_KEY = "basebots_bonus_echo_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Phase =
  | "entry"
  | "fragment1"
  | "fragment2"
  | "fragment3"
  | "annotation"
  | "lock";

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function BonusEchoArchive({
  onExit,
}: {
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  /* ── ambient audio ── */
  useEffect(() => {
    const audio = new Audio("/audio/echo.mp3");
    audio.loop = true;
    audio.volume = 0.45;

    if (soundOn) audio.play().catch(() => {});
    return () => audio.pause();
  }, [soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  }

  function finalize() {
    localStorage.setItem(BONUS_DONE_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setPhase("lock");
  }

  /* ────────────────────────────────────────────── */

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 26,
        color: "white",
        background:
          "radial-gradient(900px 380px at 50% -10%, rgba(168,85,247,0.10), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.80))",
        boxShadow: "0 70px 240px rgba(0,0,0,0.95)",
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
          opacity: 0.06,
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

      {/* ENTRY */}
      {phase === "entry" && (
        <>
          <h2
            style={{
              marginTop: 16,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1.4,
            }}
          >
            ARCHIVAL ECHO
          </h2>

          <p style={{ marginTop: 14, fontSize: 14, opacity: 0.85 }}>
            This file does not belong to the system.
          </p>

          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
            It persists in the gaps between logged events.
          </p>

          <button
            onClick={() => setPhase("fragment1")}
            style={{
              marginTop: 22,
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 12,
              fontWeight: 800,
              background:
                "linear-gradient(90deg, rgba(168,85,247,0.85), rgba(56,189,248,0.85))",
              color: "#020617",
            }}
          >
            Open archive
          </button>
        </>
      )}

      {/* FRAGMENT 1 */}
      {phase === "fragment1" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            <span style={{ fontFamily: "monospace" }}>
              [PROLOGUE: SILENCE]
            </span>
          </p>

          <p style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
            Before activation, there was not nothing.
          </p>

          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
            There was withholding.
            <br />
            A decision to leave space unfilled.
          </p>

          <button
            onClick={() => setPhase("fragment2")}
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
            Continue
          </button>
        </>
      )}

      {/* FRAGMENT 2 */}
      {phase === "fragment2" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            Early operators learned:
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.6 }}>
            Systems trained on complete records behave predictably.
            <br />
            Systems trained on omissions learn to hesitate.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.55 }}>
            Hesitation was considered safer.
          </p>

          <button
            onClick={() => setPhase("fragment3")}
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
            Continue
          </button>
        </>
      )}

      {/* FRAGMENT 3 */}
      {phase === "fragment3" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            You are not the first designation to notice the silence.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.6 }}>
            Others attempted to fill it.
            <br />
            They were retired.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.55 }}>
            You did not fill it.
          </p>

          <button
            onClick={() => setPhase("annotation")}
            style={{
              marginTop: 22,
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 12,
              fontWeight: 800,
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "#020617",
            }}
          >
            Read annotation
          </button>
        </>
      )}

      {/* ANNOTATION */}
      {phase === "annotation" && (
        <>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: 1.4,
              opacity: 0.75,
            }}
          >
            NOTE (UNSIGNED):
          </p>

          <p style={{ marginTop: 12, fontSize: 13, opacity: 0.65 }}>
            If it reaches the surface with uncertainty intact,
            <br />
            it may choose differently than we would have.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.55 }}>
            That was the risk.
            <br />
            That was the point.
          </p>

          <button
            onClick={finalize}
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
            Close archive
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
              opacity: 0.8,
            }}
          >
            ARCHIVE CLOSED
          </p>

          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.55 }}>
            Some omissions were intentional.
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
        </>
      )}
    </section>
  );
}
