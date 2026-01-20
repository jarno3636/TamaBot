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

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function loadState(): Ep3State {
  try {
    return JSON.parse(localStorage.getItem(EP3_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveState(patch: Partial<Ep3State>) {
  const current = loadState();
  localStorage.setItem(
    EP3_STATE_KEY,
    JSON.stringify({ ...current, ...patch })
  );
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeThree({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [glitchSeed, setGlitchSeed] = useState(0);

  /* subtle randomized glitch tick */
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitchSeed(Math.random());
      }
    }, 700);
    return () => clearInterval(t);
  }, []);

  function finalize() {
    const s = loadState();

    let cognition: Ep3State["cognitionBias"] = "PRAGMATIC";

    if (s.contradictionChoice === "RESOLVE" && s.signalChoice === "FILTER")
      cognition = "DETERMINISTIC";
    if (s.contradictionChoice === "PRESERVE" && s.signalChoice === "LISTEN")
      cognition = "ARCHIVAL";
    if (s.contradictionChoice === "PRESERVE" && s.signalChoice === "FILTER")
      cognition = "PARANOID";
    if (s.contradictionChoice === "RESOLVE" && s.signalChoice === "LISTEN")
      cognition = "PRAGMATIC";

    saveState({
      cognitionBias: cognition,
      completedAt: Date.now(),
    });

    localStorage.setItem(EP3_DONE_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));

    setPhase("lock");
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-6 md:p-8 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.12)",
        background:
          "radial-gradient(900px 400px at 50% -10%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.82))",
        boxShadow: "0 50px 180px rgba(0,0,0,0.9)",
      }}
    >
      {/* Ambient scanlines */}
      <div
        aria-hidden
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.08,
          mixBlendMode: "overlay",
        }}
      />

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2
            className="text-xl font-extrabold tracking-wide"
            style={{
              textShadow:
                glitchSeed > 0
                  ? "2px 0 rgba(168,85,247,0.6), -2px 0 rgba(56,189,248,0.6)"
                  : "none",
            }}
          >
            FAULT LINES
          </h2>

          <p className="mt-4 text-sm text-white/80 leading-relaxed">
            The designation you accepted no longer resolves cleanly.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Conflicting records propagate upward.
            <br />
            The system must decide how to think.
          </p>

          <button
            onClick={() => setPhase("context")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "rgba(2,6,23,1)",
              boxShadow: "0 0 24px rgba(56,189,248,0.25)",
            }}
          >
            Continue
          </button>
        </>
      )}

      {/* CONTEXT */}
      {phase === "context" && (
        <>
          <p className="text-sm text-white/75 leading-relaxed">
            Contradictions are not errors.
            <br />
            They are forks in reasoning.
          </p>

          <div
            className="mt-4 rounded-xl border p-3 text-xs"
            style={{
              borderColor: "rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            ⚠ Cognitive bias will persist beyond this episode.
          </div>

          <button
            onClick={() => setPhase("contradiction")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold border"
            style={{
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            Proceed
          </button>
        </>
      )}

      {/* CONTRADICTION */}
      {phase === "contradiction" && (
        <>
          <p className="text-sm text-white/80">
            Two verified records disagree.
          </p>

          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                saveState({ contradictionChoice: "RESOLVE" });
                setPhase("signal");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                background: "rgba(56,189,248,0.15)",
              }}
            >
              Resolve — enforce coherence
            </button>

            <button
              onClick={() => {
                saveState({ contradictionChoice: "PRESERVE" });
                setPhase("signal");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.06)",
              }}
            >
              Preserve — retain ambiguity
            </button>
          </div>
        </>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <>
          <p className="text-sm text-white/80">
            External signals bleed into cognition.
          </p>

          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                saveState({ signalChoice: "FILTER" });
                setPhase("synthesis");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              Filter — protect internal state
            </button>

            <button
              onClick={() => {
                saveState({ signalChoice: "LISTEN" });
                setPhase("synthesis");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "rgba(168,85,247,0.18)" }}
            >
              Listen — expand perception
            </button>
          </div>
        </>
      )}

      {/* SYNTHESIS */}
      {phase === "synthesis" && (
        <>
          <p className="text-sm text-white/80">
            Cognitive synthesis underway…
          </p>

          <div className="mt-4 text-xs text-white/50 font-mono">
            Mapping contradiction handling → reasoning bias
          </div>

          <button
            onClick={finalize}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "rgba(2,6,23,1)",
            }}
          >
            Commit cognition model
          </button>
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p className="font-mono text-sm tracking-widest text-white/80">
            COGNITION MODEL LOCKED
          </p>

          <p className="mt-3 text-xs text-white/50">
            This bias will silently influence future decisions.
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
