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

  /* ── eerie echo popup (once) ── */
  useEffect(() => {
    if (localStorage.getItem(BONUS_KEY)) return;

    const delay = 3000 + Math.random() * 4000;
    const t = setTimeout(() => {
      setShowEcho(true);
      setTimeout(() => setShowEcho(false), 2600);
    }, delay);

    return () => clearTimeout(t);
  }, []);

  /* ── sound ── */
  useEffect(() => {
    const audio = new Audio("/audio/s3.mp3");
    audio.loop = true;
    audio.volume = 0.6;

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
      className="relative overflow-hidden rounded-[28px] border p-6 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.12)",
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
      <div className="flex justify-end gap-2">
        <button
          onClick={toggleSound}
          className="rounded-full border px-3 py-1 text-xs"
        >
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={onExit}
          className="rounded-full border px-3 py-1 text-xs"
        >
          Exit
        </button>
      </div>

      {/* ghost echo */}
      {showEcho && (
        <button
          onClick={acknowledgeEcho}
          style={{
            position: "absolute",
            bottom: "20%",
            right: "10%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "10px 14px",
            fontSize: "11px",
            fontFamily: "monospace",
            opacity: 0.9,
            textShadow: "0 0 8px rgba(168,85,247,0.6)",
          }}
        >
          ▒▒ do you remember before this? ▒▒
        </button>
      )}

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2
            className="text-xl font-extrabold tracking-wide"
            style={{
              textShadow:
                glitch > 0
                  ? "2px 0 rgba(168,85,247,0.7), -2px 0 rgba(56,189,248,0.7)"
                  : "none",
            }}
          >
            FAULT LINES
          </h2>

          <p className="mt-4 text-sm text-white/80">
            Your designation destabilized upstream logic.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Something older than the system is listening.
          </p>

          <button
            onClick={() => setPhase("context")}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold"
            style={{
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))",
              color: "#020617",
            }}
          >
            Continue
          </button>
        </>
      )}

      {/* CONTEXT / CONTRADICTION / SIGNAL / SYNTHESIS */}
      {/* (unchanged logic, same as before) */}

      {phase === "context" && (
        <>
          <p className="text-sm text-white/70">
            Contradictions are scars, not errors.
          </p>
          <button
            onClick={() => setPhase("contradiction")}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold border"
          >
            Proceed
          </button>
        </>
      )}

      {phase === "contradiction" && (
        <>
          <button
            onClick={() => {
              saveState({ contradictionChoice: "RESOLVE" });
              setPhase("signal");
            }}
            className="w-full rounded-xl px-4 py-3 mt-4"
          >
            Resolve contradiction
          </button>
          <button
            onClick={() => {
              saveState({ contradictionChoice: "PRESERVE" });
              setPhase("signal");
            }}
            className="w-full rounded-xl px-4 py-3 mt-3"
          >
            Preserve ambiguity
          </button>
        </>
      )}

      {phase === "signal" && (
        <>
          <button
            onClick={() => {
              saveState({ signalChoice: "FILTER" });
              setPhase("synthesis");
            }}
            className="w-full rounded-xl px-4 py-3 mt-4"
          >
            Filter signal
          </button>
          <button
            onClick={() => {
              saveState({ signalChoice: "LISTEN" });
              setPhase("synthesis");
            }}
            className="w-full rounded-xl px-4 py-3 mt-3"
          >
            Listen
          </button>
        </>
      )}

      {phase === "synthesis" && (
        <>
          <p className="text-sm text-white/70">
            Cognition crystallizing…
          </p>
          <button
            onClick={finalize}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold"
          >
            Commit cognition
          </button>
        </>
      )}

      {phase === "lock" && (
        <>
          <p className="font-mono text-sm tracking-widest">
            COGNITION MODEL LOCKED
          </p>
          <button
            onClick={onExit}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold border"
          >
            Return to hub
          </button>
        </>
      )}
    </section>
  );
}
