"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────── */

export type EpisodeOneChoiceId = "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";

type SaveShape = {
  v: number;
  episodeId: "ep1";
  choiceId: EpisodeOneChoiceId;
  flags: {
    complied: boolean;
    cautious: boolean;
    adversarial: boolean;
    severed: boolean;
    soundOff: boolean;
  };
  profile: {
    archetype: "Operator" | "Ghost" | "Saboteur" | "Severed";
    threat: number;
    trust: number;
  };
  artifact: {
    name: string;
    desc: string;
  };
  createdAt: number;
};

const STORAGE_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep1_sound";

/* ──────────────────────────────────────────────────────────────
 * Persistence
 * ────────────────────────────────────────────────────────────── */

function saveToLocal(save: SaveShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

function loadFromLocal(): SaveShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveShape;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────
 * Micro-Anomaly
 * ────────────────────────────────────────────────────────────── */

function useMicroAnomaly(active: boolean) {
  const [anomaly, setAnomaly] = useState<null | "flicker" | "desync">(null);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const r = Math.random();
      if (r < 0.14) setAnomaly("flicker");
      else if (r < 0.21) setAnomaly("desync");

      setTimeout(() => setAnomaly(null), 160);
    }, 2200 + Math.random() * 1800);

    return () => clearInterval(interval);
  }, [active]);

  return anomaly;
}

/* ──────────────────────────────────────────────────────────────
 * Episode Component
 * ────────────────────────────────────────────────────────────── */

export default function EpisodeOne({ onExit }: { onExit: () => void }) {
  const existing = useMemo(() => loadFromLocal(), []);
  const [phase, setPhase] = useState<
    "intro" | "signal" | "falseChoice" | "glitch" | "choice" | "aftermath" | "result"
  >(existing ? "result" : "intro");

  const [secondsLeft, setSecondsLeft] = useState(40);
  const [save, setSave] = useState<SaveShape | null>(existing);

  /* ───────────── Sound ───────────── */

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  function toggleSound() {
    setSoundEnabled((s) => {
      try {
        localStorage.setItem(SOUND_KEY, s ? "off" : "on");
      } catch {}
      return !s;
    });
  }

  /* ───────────── Timer ───────────── */

  useEffect(() => {
    if (phase !== "choice") return;
    setSecondsLeft(40);

    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "choice" && secondsLeft === 0) {
      resolveChoice("STALL");
    }
  }, [secondsLeft, phase]);

  const anomaly = useMicroAnomaly(
    phase === "falseChoice" || phase === "choice"
  );

  /* ───────────── Resolve Choice ───────────── */

  function resolveChoice(choiceId: EpisodeOneChoiceId) {
    const flags = {
      complied: choiceId === "ACCEPT",
      cautious: choiceId === "STALL",
      adversarial: choiceId === "SPOOF",
      severed: choiceId === "PULL_PLUG",
      soundOff: !soundEnabled,
    };

    const profileMap = {
      ACCEPT: { archetype: "Operator", trust: 70, threat: 22 },
      STALL: { archetype: "Ghost", trust: 55, threat: 36 },
      SPOOF: { archetype: "Saboteur", trust: 26, threat: 74 },
      PULL_PLUG: { archetype: "Severed", trust: 16, threat: 58 },
    } as const;

    const artifactMap = {
      ACCEPT: {
        name: "Compliance Record",
        desc: "A completed interaction preserved without appeal.",
      },
      STALL: {
        name: "Observation Gap",
        desc: "A hesitation that altered system certainty.",
      },
      SPOOF: {
        name: "Contradictory Authority",
        desc: "Two incompatible truths recorded simultaneously.",
      },
      PULL_PLUG: {
        name: "Termination Evidence",
        desc: "Proof that silence was intentional.",
      },
    };

    const save: SaveShape = {
      v: 1,
      episodeId: "ep1",
      choiceId,
      flags,
      profile: profileMap[choiceId],
      artifact: artifactMap[choiceId],
      createdAt: Date.now(),
    };

    saveToLocal(save);
    setSave(save);
    setPhase("aftermath");
  }

  function resetEpisode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSave(null);
    setPhase("intro");
  }

  /* ───────────── UI Helpers ───────────── */

  const actionBtn =
    "w-full rounded-2xl border px-4 py-3 text-left text-[13px] font-semibold transition active:scale-[0.98] hover:brightness-110";

  /* ───────────── Render ───────────── */

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 md:p-7 ${
        anomaly === "flicker" ? "brightness-110" : ""
      }`}
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.94), rgba(2,6,23,0.72))",
        transform: anomaly === "desync" ? "translateX(1px)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-[11px] font-extrabold text-white/70">
          BONUS EPISODE — IN THE SILENCE
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleSound}
            className="rounded-full border px-3 py-1 text-[11px] text-white/80"
          >
            SOUND: {soundEnabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={onExit}
            className="rounded-full border px-3 py-1 text-[11px] text-white/80"
          >
            EXIT
          </button>
        </div>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <div className="mt-6">
          <h2 className="text-[20px] font-extrabold text-white">
            AWAKENING
          </h2>
          <p className="mt-3 text-white/70">
            Cold boot. No diagnostics. No greeting.
          </p>
          <p className="mt-2 text-white/70">
            The Basebot’s optics stabilize. The room does not.
          </p>
          <p className="mt-2 text-white/70">
            Something has been waiting for this moment.
          </p>

          <button
            onClick={() => setPhase("signal")}
            className="mt-6 rounded-full px-5 py-2 bg-white/10 text-white"
          >
            Continue
          </button>
        </div>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <div className="mt-6">
          <h2 className="text-[20px] font-extrabold text-white">
            INCOMING TRANSMISSION
          </h2>
          <p className="mt-3 text-white/70">
            A panel fades into view. It does not ask for permission.
          </p>
          <p className="mt-2 text-white/70">
            Status text scrolls, then stalls.
          </p>
          <p className="mt-2 text-white/70">
            A single button pulses, waiting.
          </p>

          <button
            onClick={() => setPhase("falseChoice")}
            className="mt-6 rounded-full px-5 py-2 bg-white/10 text-white"
          >
            Approach the console
          </button>
        </div>
      )}

      {/* FALSE CHOICE */}
      {phase === "falseChoice" && (
        <div className="mt-6">
          <h2 className="text-[20px] font-extrabold text-white">
            LOCAL INTERFACE
          </h2>

          <p className="mt-3 text-white/70">
            The Basebot detects a physical control.
          </p>
          <p className="mt-2 text-white/70">
            This interface feels older. Cruder. Safer.
          </p>

          <div className="mt-5 grid gap-3">
            <button
              className={actionBtn}
              style={{ borderColor: "rgba(56,189,248,0.4)" }}
              onClick={() => setPhase("glitch")}
            >
              ▢ PRESS THE BUTTON
              <div className="text-[11px] text-white/50">
                Manual override detected
              </div>
            </button>

            <button
              className={actionBtn}
              style={{ borderColor: "rgba(251,191,36,0.4)" }}
              onClick={() => setPhase("glitch")}
            >
              ▢ OBSERVE WITHOUT TOUCHING
              <div className="text-[11px] text-white/50">
                Passive monitoring enabled
              </div>
            </button>

            <button
              className={actionBtn}
              style={{ borderColor: "rgba(251,113,133,0.4)" }}
              onClick={() => setPhase("glitch")}
            >
              ▢ STEP BACK
              <div className="text-[11px] text-white/50">
                Distance recalculated
              </div>
            </button>
          </div>
        </div>
      )}

      {/* GLITCH */}
      {phase === "glitch" && (
        <div className="mt-6">
          <p className="text-white/80">
            The console responds.
          </p>
          <p className="mt-2 text-white/70">
            Then hesitates.
          </p>
          <p className="mt-2 text-white/70">
            The transmission fractures. Sparks jump across the panel.
          </p>
          <p className="mt-2 text-white/70">
            The interface goes dark — as if it was never meant to matter.
          </p>

          <button
            onClick={() => setPhase("choice")}
            className="mt-6 rounded-full px-5 py-2 bg-white/10 text-white"
          >
            The real signal arrives
          </button>
        </div>
      )}

      {/* REAL CHOICE */}
      {phase === "choice" && (
        <div className="mt-6">
          <h2 className="text-[22px] font-extrabold text-white">
            MAKE A DECISION
          </h2>

          <p className="mt-2 text-white/70">
            This interface does not glitch.
          </p>
          <p className="mt-1 text-white/60">
            Time remaining: {secondsLeft}s
          </p>

          <div className="mt-5 grid gap-3">
            <button
              className={actionBtn}
              style={{ borderColor: "rgba(52,211,153,0.4)" }}
              onClick={() => resolveChoice("ACCEPT")}
            >
              ACCEPT
              <div className="text-[11px] text-white/50">
                Allow the system to finalize its model of you
              </div>
            </button>

            <button
              className={actionBtn}
              style={{ borderColor: "rgba(56,189,248,0.4)" }}
              onClick={() => resolveChoice("STALL")}
            >
              STALL
              <div className="text-[11px] text-white/50">
                Withhold response and observe consequences
              </div>
            </button>

            {secondsLeft > 10 && (
              <button
                className={actionBtn}
                style={{ borderColor: "rgba(251,191,36,0.4)" }}
                onClick={() => resolveChoice("SPOOF")}
              >
                SPOOF
                <div className="text-[11px] text-white/50">
                  Respond with a constructed identity
                </div>
              </button>
            )}

            {secondsLeft > 25 && (
              <button
                className={actionBtn}
                style={{ borderColor: "rgba(251,113,133,0.4)" }}
                onClick={() => resolveChoice("PULL_PLUG")}
              >
                PULL PLUG
                <div className="text-[11px] text-white/50">
                  Terminate the channel immediately
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* AFTERMATH */}
      {phase === "aftermath" && save && (
        <div className="mt-6">
          <p className="text-white/85">
            The system completes its evaluation.
          </p>
          <p className="mt-2 text-white/65">
            It does not confirm success.
          </p>
          <p className="mt-2 text-white/65">
            It simply adjusts.
          </p>

          <button
            onClick={() => setPhase("result")}
            className="mt-6 rounded-full px-5 py-2 bg-white/10 text-white"
          >
            Continue
          </button>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && save && (
        <div className="mt-6">
          <p className="text-white/85">
            You are no longer unclassified.
          </p>
          <p className="mt-3 text-white/65">
            Next time, the system will not wait for consent.
          </p>
          <p className="mt-2 text-white/55">
            It already knows how you hesitate.
          </p>

          <div className="mt-6 flex gap-2">
            <button
              onClick={onExit}
              className="rounded-full px-5 py-2 bg-white/10 text-white"
            >
              Return
            </button>
            <button
              onClick={resetEpisode}
              className="rounded-full px-5 py-2 bg-white/5 text-white/80"
            >
              Reinitialize Session
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
