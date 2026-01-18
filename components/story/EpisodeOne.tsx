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
      if (r < 0.15) setAnomaly("flicker");
      else if (r < 0.22) setAnomaly("desync");

      setTimeout(() => setAnomaly(null), 180);
    }, 2200 + Math.random() * 2000);

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
    "intro" | "signal" | "choice" | "aftermath" | "result"
  >(existing ? "result" : "intro");

  const [secondsLeft, setSecondsLeft] = useState(40);
  const [save, setSave] = useState<SaveShape | null>(existing);

  /* ───────────── Sound (Episode-Scoped) ───────────── */

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

  /* ───────────── Timer Logic ───────────── */

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

  /* ───────────── Micro-Anomaly ───────────── */

  const anomaly = useMicroAnomaly(phase === "choice");

  /* ───────────── Story Content ───────────── */

  const scene = {
    intro: {
      heading: "BONUS EPISODE // IN THE SILENCE",
      body: [
        "Cold boot.",
        "No sound. No confirmation.",
        "Your Basebot opens its eyes in a space defined only by permission.",
        "The system does not greet you.",
        "It registers that you are present — and listening.",
      ],
      prompt: "Continue",
    },
    signal: {
      heading: "UNSOLICITED DIRECTIVE",
      body: [
        "A signal arrives without transit.",
        "It behaves as if you were already expected.",
        "Controls render that you did not request.",
        "There is a delay between your thought and the cursor.",
        "The delay is intentional.",
      ],
      prompt: "Open the panel",
    },
    choice: {
      heading: "MAKE A DECISION",
      sub: "40 seconds. Options will be withdrawn as certainty increases.",
      warning:
        "If no action is taken, the system will finalize a choice on your behalf.",
    },
  };

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
        desc: "A measurable delay that altered system confidence.",
      },
      SPOOF: {
        name: "Inconsistent Authority",
        desc: "Two truths competing for the same moment.",
      },
      PULL_PLUG: {
        name: "Termination Evidence",
        desc: "Proof that silence was deliberate.",
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

  /* ───────────── Reset ───────────── */

  function resetEpisode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSave(null);
    setPhase("intro");
  }

  /* ───────────── Render ───────────── */

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 md:p-7 transition ${
        anomaly === "flicker" ? "brightness-110" : ""
      }`}
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.94), rgba(2,6,23,0.70))",
        transform: anomaly === "desync" ? "translateX(1px)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold tracking-wide text-white/70">
          IN THE SILENCE
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="rounded-full border px-3 py-1 text-[11px] font-extrabold text-white/80"
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
          <h2 className="text-[20px] font-extrabold text-white">
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
            className="mt-6 rounded-full px-5 py-2 text-[12px] bg-white/10 text-white"
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

          <p className="mt-4 text-[12px] text-white/80">
            Time Remaining: {secondsLeft}s
          </p>

          <div className="mt-5 grid gap-3">
            <button onClick={() => resolveChoice("ACCEPT")}>
              ACCEPT — allow the system to proceed with you accounted for
            </button>

            <button onClick={() => resolveChoice("STALL")}>
              STALL — remain silent and observe what changes
            </button>

            {secondsLeft > 10 && (
              <button onClick={() => resolveChoice("SPOOF")}>
                SPOOF — respond with something that is not you
              </button>
            )}

            {secondsLeft > 25 && (
              <button onClick={() => resolveChoice("PULL_PLUG")}>
                PULL PLUG — terminate the channel immediately
              </button>
            )}
          </div>
        </div>
      )}

      {/* Aftermath */}
      {phase === "aftermath" && save && (
        <div className="mt-6">
          <p className="text-[15px] text-white/85">
            The system finishes processing what you allowed it to see.
          </p>

          <p className="mt-2 text-[13px] text-white/65">
            Your response altered its internal confidence.
          </p>

          <p className="mt-4 text-[12px] text-white/60">
            Some future interactions will now assume intent.
          </p>

          <button
            className="mt-6 rounded-full px-5 py-2 text-[12px] bg-white/10 text-white"
            onClick={() => setPhase("result")}
          >
            Continue
          </button>
        </div>
      )}

      {/* Result + Teaser */}
      {phase === "result" && save && (
        <div className="mt-6">
          <p className="text-[15px] text-white/85">
            You are no longer unclassified.
          </p>

          <p className="mt-3 text-[13px] text-white/65">
            In the next episode, the system will no longer wait for you to respond.
          </p>

          <p className="mt-2 text-[12px] text-white/55">
            It will act first — and explain later.
          </p>

          <div className="mt-6 flex gap-2">
            <button
              onClick={onExit}
              className="rounded-full px-5 py-2 text-[12px] bg-white/10 text-white"
            >
              Return
            </button>

            <button
              onClick={resetEpisode}
              className="rounded-full px-5 py-2 text-[12px] bg-white/5 text-white/80"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
