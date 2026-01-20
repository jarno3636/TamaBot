"use client";

import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const EP4_KEY = "basebots_ep4_profile_v1";
const EP4_DONE_KEY = "basebots_ep4_done";
const SOUND_KEY = "basebots_ep4_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Phase = "intro" | "analysis" | "projection" | "lock";

type Ep3State = {
  cognitionBias?: "DETERMINISTIC" | "ARCHIVAL" | "PRAGMATIC" | "PARANOID";
};

type Profile =
  | "EXECUTOR"
  | "OBSERVER"
  | "OPERATOR"
  | "SENTINEL";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function loadEp3(): Ep3State {
  try {
    return JSON.parse(localStorage.getItem(EP3_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function biasToProfile(bias?: Ep3State["cognitionBias"]): Profile {
  switch (bias) {
    case "DETERMINISTIC":
      return "EXECUTOR";
    case "ARCHIVAL":
      return "OBSERVER";
    case "PARANOID":
      return "SENTINEL";
    case "PRAGMATIC":
    default:
      return "OPERATOR";
  }
}

function profileDescription(profile: Profile): string {
  switch (profile) {
    case "EXECUTOR":
      return "Acts once certainty is achieved. Optimizes for closure.";
    case "OBSERVER":
      return "Preserves context. Values memory over immediacy.";
    case "SENTINEL":
      return "Assumes adversarial conditions. Interprets silence as threat.";
    case "OPERATOR":
    default:
      return "Balances outcome and flexibility. Accepts imperfect data.";
  }
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeFour({ onExit }: { onExit: () => void }) {
  const ep3 = useMemo(() => loadEp3(), []);
  const profile = useMemo(
    () => biasToProfile(ep3.cognitionBias),
    [ep3.cognitionBias]
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  /* ── ambient audio ── */
  useEffect(() => {
    const audio = new Audio("/audio/s4.mp3");
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
    localStorage.setItem(
      EP4_KEY,
      JSON.stringify({
        profile,
        derivedFrom: ep3.cognitionBias ?? "UNKNOWN",
        assignedAt: Date.now(),
      })
    );

    localStorage.setItem(EP4_DONE_KEY, "true");
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
          "radial-gradient(900px 380px at 50% -10%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.80))",
        boxShadow: "0 60px 220px rgba(0,0,0,0.9)",
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
          opacity: 0.07,
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

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>
            THRESHOLD
          </h2>

          <p style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>
            Cognitive stabilization complete.
          </p>

          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
            The system no longer evaluates what you choose —
            <br />
            only <em>how</em> you arrive there.
          </p>

          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.5 }}>
            This transition is irreversible.
          </p>

          <button
            onClick={() => setPhase("analysis")}
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

      {/* ANALYSIS */}
      {phase === "analysis" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Observed reasoning pattern:
          </p>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              padding: "10px",
              fontFamily: "monospace",
              fontSize: 13,
              letterSpacing: 2,
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            {ep3.cognitionBias ?? "UNCLASSIFIED"}
          </div>

          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.55 }}>
            This pattern emerged without instruction.
            <br />
            Would you describe it as choice — or habit?
          </p>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.45 }}>
            If the system predicts your response,
            <br />
            does that make the response less yours?
          </p>

          <button
            onClick={() => setPhase("projection")}
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
            Project outcome
          </button>
        </>
      )}

      {/* PROJECTION */}
      {phase === "projection" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Behavioral profile synthesized:
          </p>

          <div
            style={{
              marginTop: 14,
              borderRadius: 20,
              padding: "14px",
              textAlign: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 3,
              }}
            >
              {profile}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
              {profileDescription(profile)}
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: 12, opacity: 0.55 }}>
            This profile will inform decisions made
            <br />
            when you are not consulted.
          </p>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.45 }}>
            When autonomy is delegated,
            <br />
            where does responsibility remain?
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
                "linear-gradient(90deg, rgba(168,85,247,0.85), rgba(56,189,248,0.85))",
              color: "#020617",
            }}
          >
            Lock profile
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
            PROFILE ASSIGNED
          </p>

          <p style={{ marginTop: 10, fontSize: 11, opacity: 0.55 }}>
            You will not see the first action it influences.
          </p>

          <p style={{ marginTop: 6, fontSize: 11, opacity: 0.45 }}>
            You may see the consequences.
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
