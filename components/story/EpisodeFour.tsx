"use client";

import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const EP4_KEY = "basebots_ep4_profile_v1";
const EP4_DONE_KEY = "basebots_ep4_done";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Phase = "intro" | "analysis" | "assignment" | "lock";

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

function mapBiasToProfile(bias?: Ep3State["cognitionBias"]): Profile {
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

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeFour({ onExit }: { onExit: () => void }) {
  const ep3 = useMemo(() => loadEp3(), []);
  const profile = useMemo(
    () => mapBiasToProfile(ep3.cognitionBias),
    [ep3.cognitionBias]
  );

  const [phase, setPhase] = useState<Phase>("intro");

  function commit() {
    localStorage.setItem(
      EP4_KEY,
      JSON.stringify({
        profile,
        sourceBias: ep3.cognitionBias ?? "UNKNOWN",
        assignedAt: Date.now(),
      })
    );

    localStorage.setItem(EP4_DONE_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));

    setPhase("lock");
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-6 md:p-8 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.12)",
        background:
          "radial-gradient(900px 420px at 50% -10%, rgba(168,85,247,0.10), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.82))",
        boxShadow: "0 50px 180px rgba(0,0,0,0.9)",
      }}
    >
      {/* ambient grid */}
      <div
        aria-hidden
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          opacity: 0.08,
          maskImage:
            "radial-gradient(600px 280px at 50% 20%, black 40%, transparent 70%)",
        }}
      />

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 className="text-xl font-extrabold tracking-wide">
            THRESHOLD
          </h2>

          <p className="mt-4 text-sm text-white/80 leading-relaxed">
            Cognitive scaffolding complete.
          </p>

          <p className="mt-2 text-sm text-white/60">
            The system prepares to finalize behavioral posture.
          </p>

          <button
            onClick={() => setPhase("analysis")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "rgba(2,6,23,1)",
              boxShadow: "0 0 28px rgba(56,189,248,0.25)",
            }}
          >
            Continue
          </button>
        </>
      )}

      {/* ANALYSIS */}
      {phase === "analysis" && (
        <>
          <p className="text-sm text-white/75 leading-relaxed">
            Prior contradiction handling produced a stable cognition bias:
          </p>

          <div
            className="mt-4 rounded-2xl border px-4 py-3 text-sm font-mono tracking-wide"
            style={{
              borderColor: "rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.35)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
            }}
          >
            {ep3.cognitionBias ?? "UNCLASSIFIED"}
          </div>

          <p className="mt-4 text-sm text-white/60">
            This bias constrains response strategies under uncertainty.
          </p>

          <button
            onClick={() => setPhase("assignment")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold border"
            style={{ borderColor: "rgba(255,255,255,0.22)" }}
          >
            Proceed
          </button>
        </>
      )}

      {/* ASSIGNMENT */}
      {phase === "assignment" && (
        <>
          <p className="text-sm text-white/75 leading-relaxed">
            Behavioral profile synthesized:
          </p>

          <div
            className="mt-4 rounded-3xl border p-5 text-center"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            }}
          >
            <div className="text-lg font-extrabold tracking-widest">
              {profile}
            </div>
            <div className="mt-2 text-xs text-white/60">
              Derived from cognition bias
            </div>
          </div>

          <p className="mt-4 text-sm text-white/60">
            This profile will govern surface interaction and long-term behavior.
          </p>

          <button
            onClick={commit}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              background:
                "linear-gradient(90deg, rgba(168,85,247,0.85), rgba(56,189,248,0.85))",
              color: "rgba(2,6,23,1)",
            }}
          >
            Lock profile
          </button>
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p className="font-mono text-sm tracking-widest text-white/80">
            PROFILE ASSIGNED
          </p>

          <p className="mt-3 text-xs text-white/50">
            Emergence protocols unlocked.
          </p>

          <button
            onClick={onExit}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold border"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            Return to hub
          </button>
        </>
      )}
    </section>
  );
}
