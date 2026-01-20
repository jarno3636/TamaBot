"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const EP2_KEY = "basebots_ep2_designation_v1";
const EP2_DONE_KEY = "basebots_ep2_done";
const SOUND_KEY = "basebots_ep2_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile: { archetype: string };
};

type Ep2Save = {
  designation: string;
  lockedAt: number;
};

type Phase = "descent" | "input" | "binding" | "approach";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function loadEp1(): Ep1Save | null {
  try {
    const raw = localStorage.getItem(EP1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function validate(v: string) {
  if (!/^[A-Z0-9]*$/.test(v)) return "FORMAT ERROR";
  if (v.length !== 7) return "DESIGNATION MUST BE 7 CHARACTERS";
  return null;
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeTwo({ onExit }: { onExit: () => void }) {
  const ep1 = useMemo(() => loadEp1(), []);
  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [glitchTick, setGlitchTick] = useState(0);

  /* ───────────── Ambient glitch tick ───────────── */
  useEffect(() => {
    const t = setInterval(() => setGlitchTick((n) => n + 1), 1200);
    return () => clearInterval(t);
  }, []);

  /* ───────────── Sound ───────────── */
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/s2.mp3");
    a.loop = true;
    a.volume = 0.6;
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundEnabled) {
      a.pause();
      a.currentTime = 0;
      return;
    }
    a.play().catch(() => {});
  }, [soundEnabled]);

  function toggleSound() {
    setSoundEnabled((s) => {
      const next = !s;
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      return next;
    });
  }

  /* ───────────── Commit designation ───────────── */
  function commit() {
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }

    const save: Ep2Save = {
      designation: value,
      lockedAt: Date.now(),
    };

    localStorage.setItem(EP2_KEY, JSON.stringify(save));
    localStorage.setItem(EP2_DONE_KEY, "true");

    window.dispatchEvent(new Event("basebots-progress-updated"));

    setPhase("binding");
    setTimeout(() => setPhase("approach"), 1600);
  }

  /* ────────────────────────────────────────────── */

  return (
    <section
      role="region"
      aria-label="Episode Two: Designation"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        padding: "24px",
        color: "white",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.72))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.85)",
      }}
    >
      {/* Scanline overlay */}
      <div
        aria-hidden
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.12,
          mixBlendMode: "overlay",
        }}
      />

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={toggleSound}
          aria-label="Toggle sound"
          style={{
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 800,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.85)",
            cursor: "pointer",
          }}
        >
          SOUND: {soundEnabled ? "ON" : "OFF"}
        </button>

        <button
          onClick={onExit}
          style={{
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 800,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
          }}
        >
          EXIT
        </button>
      </div>

      {/* DESCENT */}
      {phase === "descent" && (
        <div style={{ marginTop: 28 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 0.5,
              textShadow:
                glitchTick % 2
                  ? "1px 0 rgba(56,189,248,0.6)"
                  : "-1px 0 rgba(168,85,247,0.6)",
            }}
          >
            VERTICAL TRANSFER
          </h2>

          <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
            The lift ascends through obsolete strata.  
            Your prior classification —{" "}
            <strong>{ep1?.profile?.archetype ?? "UNKNOWN"}</strong> — propagates
            ahead of you.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.6 }}>
            Upper systems demand a stable designation before arrival.
          </p>

          <button
            onClick={() => setPhase("input")}
            style={{
              marginTop: 24,
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.16)",
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "#020617",
              cursor: "pointer",
            }}
          >
            CONTINUE
          </button>
        </div>
      )}

      {/* INPUT */}
      {phase === "input" && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>
            ASSIGN DESIGNATION
          </h2>

          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
            Seven characters. Alphanumeric. Immutable once confirmed.
          </p>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            aria-label="Designation input"
            style={{
              marginTop: 18,
              width: "100%",
              borderRadius: 14,
              padding: "14px",
              fontFamily: "monospace",
              fontSize: 18,
              letterSpacing: 4,
              textAlign: "center",
              color: "white",
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.18)",
              outline: "none",
            }}
          />

          {error && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            onClick={commit}
            style={{
              marginTop: 22,
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.16)",
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.65))",
              color: "#020617",
              cursor: "pointer",
            }}
          >
            CONFIRM DESIGNATION
          </button>
        </div>
      )}

      {/* BINDING */}
      {phase === "binding" && (
        <div
          style={{
            marginTop: 60,
            textAlign: "center",
            fontFamily: "monospace",
            letterSpacing: 6,
            opacity: 0.85,
          }}
        >
          IDENTITY LOCKED
        </div>
      )}

      {/* APPROACH (UPDATED STORY) */}
      {phase === "approach" && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Designation accepted.
          </p>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
            Parallel systems reject consensus.  
            Your identifier appears in conflicting registries.
          </p>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.55 }}>
            You are being allowed through — not cleared.
          </p>

          <button
            onClick={onExit}
            style={{
              marginTop: 24,
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
            }}
          >
            RETURN TO HUB
          </button>
        </div>
      )}
    </section>
  );
}
