"use client";

import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const EP3_DONE_KEY = "basebots_ep3_done";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Phase =
  | "intro"
  | "anomaly"
  | "contradiction"
  | "decision"
  | "signal"
  | "lock";

type Ep3State = {
  contradictionChoice?: "RESOLVE" | "PRESERVE";
  signalChoice?: "FILTER" | "LISTEN";
  completedAt?: number;
};

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function saveState(patch: Partial<Ep3State>) {
  try {
    const current = JSON.parse(
      localStorage.getItem(EP3_STATE_KEY) || "{}"
    ) as Ep3State;

    const next: Ep3State = {
      ...current,
      ...patch,
    };

    localStorage.setItem(EP3_STATE_KEY, JSON.stringify(next));
  } catch {}
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeThree({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");

  /* ──────────────────────────────────────────────
   * Completion handler
   * ────────────────────────────────────────────── */

  function completeEpisode() {
    saveState({ completedAt: Date.now() });

    // legacy + hub unlock
    localStorage.setItem(EP3_DONE_KEY, "true");

    // notify hub immediately
    window.dispatchEvent(new Event("basebots-progress-updated"));

    setPhase("lock");
  }

  /* ──────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────── */

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-6 md:p-8 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.78))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.82)",
      }}
    >
      {/* INTRO */}
      {phase === "intro" && (
        <div className="mt-4">
          <h2 className="text-xl font-extrabold tracking-wide">
            FAULT LINES
          </h2>

          <p className="mt-4 text-sm text-white/75 leading-relaxed">
            Subsurface memory strata destabilize.  
            Archived actions contradict live telemetry.
          </p>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Both records validate. Neither yields priority.
          </p>

          <button
            onClick={() => setPhase("anomaly")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* ANOMALY */}
      {phase === "anomaly" && (
        <div className="mt-4">
          <p className="text-sm text-white/75 leading-relaxed">
            Diagnostic routines fail to reconcile divergence.
          </p>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            A contradiction persists across all verification layers.
          </p>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            The system defers judgment.
          </p>

          <button
            onClick={() => setPhase("contradiction")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Proceed
          </button>
        </div>
      )}

      {/* CONTRADICTION */}
      {phase === "contradiction" && (
        <div className="mt-4">
          <p className="text-sm text-white/75 leading-relaxed">
            Two deployment logs remain active.
          </p>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Selecting one will invalidate the other.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                saveState({ contradictionChoice: "RESOLVE" });
                setPhase("decision");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background:
                  "linear-gradient(90deg, rgba(168,85,247,0.85), rgba(56,189,248,0.80))",
                color: "rgba(2,6,23,0.98)",
              }}
            >
              Resolve contradiction  
              <span className="block text-xs opacity-70">
                Enforce a single truth
              </span>
            </button>

            <button
              onClick={() => {
                saveState({ contradictionChoice: "PRESERVE" });
                setPhase("decision");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Preserve both records  
              <span className="block text-xs opacity-60">
                Accept inconsistency
              </span>
            </button>
          </div>
        </div>
      )}

      {/* DECISION */}
      {phase === "decision" && (
        <div className="mt-4">
          <p className="text-sm text-white/75 leading-relaxed">
            Resolution incomplete.
          </p>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            External signal interference detected.
          </p>

          <button
            onClick={() => setPhase("signal")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Inspect signal
          </button>
        </div>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <div className="mt-4">
          <p className="text-sm text-white/75 leading-relaxed">
            Fragmented external traffic bypasses suppression filters.
          </p>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Listening risks contamination.  
            Filtering risks ignorance.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                saveState({ signalChoice: "FILTER" });
                completeEpisode();
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Suppress signal  
              <span className="block text-xs opacity-60">
                Maintain system integrity
              </span>
            </button>

            <button
              onClick={() => {
                saveState({ signalChoice: "LISTEN" });
                completeEpisode();
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background:
                  "linear-gradient(90deg, rgba(168,85,247,0.85), rgba(56,189,248,0.80))",
                color: "rgba(2,6,23,0.98)",
              }}
            >
              Record fragments  
              <span className="block text-xs opacity-70">
                Accept external influence
              </span>
            </button>
          </div>
        </div>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <div className="mt-10 text-center">
          <p className="font-mono text-sm tracking-widest text-white/80">
            MEMORY STATE COMMITTED
          </p>

          <p className="mt-3 text-xs text-white/50">
            Ascent continues.
          </p>

          <button
            onClick={onExit}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Return to hub
          </button>
        </div>
      )}
    </section>
  );
}
