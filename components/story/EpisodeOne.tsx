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
 * Utilities
 * ────────────────────────────────────────────────────────────── */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function saveToLocal(save: SaveShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

function loadFromLocal(): SaveShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveShape;
    if (!parsed?.episodeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────
 * Micro-Anomaly Hook
 * ────────────────────────────────────────────────────────────── */

function useMicroAnomaly(active: boolean) {
  const [anomaly, setAnomaly] = useState<null | string>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const trigger = () => {
      const roll = Math.random();
      if (roll < 0.18) {
        setAnomaly("flicker");
      } else if (roll < 0.26) {
        setAnomaly("desync");
      } else {
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        setAnomaly(null);
      }, 120 + Math.random() * 180);
    };

    const interval = window.setInterval(trigger, 2600 + Math.random() * 2200);
    return () => {
      window.clearInterval(interval);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [active]);

  return anomaly;
}

/* ──────────────────────────────────────────────────────────────
 * Episode Component
 * ────────────────────────────────────────────────────────────── */

export default function EpisodeOne({ onExit }: { onExit: () => void }) {
  const existing = useMemo(() => loadFromLocal(), []);
  const [phase, setPhase] = useState<
    "intro" | "signal" | "choice" | "aftermath" | "result"
  >(existing ? "result" : "intro");

  const [secondsLeft, setSecondsLeft] = useState(20);
  const [save, setSave] = useState<SaveShape | null>(existing);

  /* ───────────────────────── Sound Toggle ───────────────────────── */

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

  /* ───────────────────────── Timer ───────────────────────── */

  useEffect(() => {
    if (phase !== "choice") return;
    setSecondsLeft(20);

    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "choice" && secondsLeft === 0) {
      resolveChoice("STALL");
    }
  }, [secondsLeft, phase]);

  /* ───────────────────────── Micro Anomaly ───────────────────────── */

  const anomaly = useMicroAnomaly(phase === "choice");

  /* ───────────────────────── Story Content ───────────────────────── */

  const scene = {
    intro: {
      heading: "EPISODE 01 // AWAKENING PROTOCOL",
      body: [
        "Cold boot.",
        "No sound. No confirmation.",
        "Your Basebot opens its eyes in a space defined only by permission.",
        "The system does not greet you. It registers you.",
      ],
      prompt: "Continue",
    },
    signal: {
      heading: "UNSOLICITED DIRECTIVE",
      body: [
        "A signal arrives without transit.",
        "It does not identify itself.",
        "Controls appear that you did not summon.",
        "There is a delay between your thought and the cursor.",
        "The delay is intentional.",
      ],
      prompt: "Open the panel",
    },
    choice: {
      heading: "MAKE A DECISION",
      sub: "20 seconds. Not enforced — inferred.",
      warning:
        "Failure to act will be recorded as a choice made without you.",
    },
  };

  /* ───────────────────────── Resolve Choice ───────────────────────── */

  function resolveChoice(choiceId: EpisodeOneChoiceId) {
    const flags = {
      complied: choiceId === "ACCEPT",
      cautious: choiceId === "STALL",
      adversarial: choiceId === "SPOOF",
      severed: choiceId === "PULL_PLUG",
    };

    const profileMap = {
      ACCEPT: { archetype: "Operator", trust: 68, threat: 25 },
      STALL: { archetype: "Ghost", trust: 54, threat: 38 },
      SPOOF: { archetype: "Saboteur", trust: 28, threat: 72 },
      PULL_PLUG: { archetype: "Severed", trust: 18, threat: 55 },
    } as const;

    const artifactMap = {
      ACCEPT: {
        name: "Handshake Record",
        desc: "A completed interaction that cannot be revoked.",
      },
      STALL: {
        name: "Timing Residue",
        desc: "A measurable hesitation preserved by the system.",
      },
      SPOOF: {
        name: "Contradictory Entry",
        desc: "Two conflicting records occupying the same moment.",
      },
      PULL_PLUG: {
        name: "Termination Trace",
        desc: "Evidence that something was intentionally cut.",
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

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 md:p-7 transition ${
        anomaly === "flicker" ? "brightness-110" : ""
      }`}
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.92), rgba(2,6,23,0.68))",
        transform: anomaly === "desync" ? "translateX(1px)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold tracking-wide text-white/70">
          EPISODE 01
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="rounded-full border px-3 py-1 text-[11px] font-extrabold"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: soundEnabled
                ? "rgba(56,189,248,0.12)"
                : "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.82)",
            }}
          >
            SOUND: {soundEnabled ? "ON" : "OFF"}
          </button>

          <button
            onClick={onExit}
            className="rounded-full border px-3 py-1 text-[11px] font-extrabold text-white/80"
          >
            EXIT
          </button>
        </div>
      </div>

      {/* Intro / Signal */}
      {(phase === "intro" || phase === "signal") && (
        <div className="mt-6">
          <h2 className="text-[18px] md:text-[22px] font-extrabold text-white">
            {phase === "intro" ? scene.intro.heading : scene.signal.heading}
          </h2>

          <div className="mt-3 grid gap-2">
            {(phase === "intro" ? scene.intro.body : scene.signal.body).map(
              (l, i) => (
                <p key={i} className="text-[14px] text-white/70">
                  {l}
                </p>
              )
            )}
          </div>

          <button
            onClick={() =>
              setPhase(phase === "intro" ? "signal" : "choice")
            }
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold bg-white/10 text-white"
          >
            {phase === "intro" ? scene.intro.prompt : scene.signal.prompt}
          </button>
        </div>
      )}

      {/* Choice */}
      {phase === "choice" && (
        <div className="mt-6">
          <h2 className="text-[22px] font-extrabold text-white">
            {scene.choice.heading}
          </h2>
          <p className="mt-1 text-[13px] text-white/70">
            {scene.choice.sub}
          </p>

          <p className="mt-3 text-[12px] text-red-300">
            {scene.choice.warning}
          </p>

          <div className="mt-4 text-[12px] text-white/80">
            Time Remaining: {secondsLeft}s
          </div>

          <div className="mt-5 grid gap-3">
            <button onClick={() => resolveChoice("ACCEPT")}>ACCEPT</button>
            <button onClick={() => resolveChoice("STALL")}>STALL</button>
            <button onClick={() => resolveChoice("SPOOF")}>SPOOF</button>
            <button onClick={() => resolveChoice("PULL_PLUG")}>PULL PLUG</button>
          </div>
        </div>
      )}

      {/* Aftermath */}
      {phase === "aftermath" && save && (
        <div className="mt-6">
          <p className="text-[14px] text-white/80">
            The system has finished observing you.
          </p>

          <p className="mt-2 text-[12px] text-white/60">
            This interaction has been recorded.
          </p>

          <button
            className="mt-6 rounded-full px-5 py-2 text-[12px] bg-white/10 text-white"
            onClick={() => setPhase("result")}
          >
            Continue
          </button>
        </div>
      )}

      {/* Result */}
      {phase === "result" && save && (
        <div className="mt-6">
          <p className="text-[14px] text-white/80">
            You are no longer unclassified.
          </p>

          <button
            className="mt-6 rounded-full px-5 py-2 text-[12px] bg-white/10 text-white"
            onClick={onExit}
          >
            Return
          </button>
        </div>
      )}
    </section>
  );
}
