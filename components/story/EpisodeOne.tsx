"use client";

import { useEffect, useMemo, useState } from "react";

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

type PollCounts = Record<EpisodeOneChoiceId, number>;

const STORAGE_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep1_sound";
const POLL_KEY = "basebots_ep1_poll";

/* ──────────────────────────────────────────────────────────────
 * Persistence Helpers
 * ────────────────────────────────────────────────────────────── */

function loadSave(): SaveShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SaveShape) : null;
  } catch {
    return null;
  }
}

function saveGame(save: SaveShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

function bumpPoll(choice: EpisodeOneChoiceId) {
  try {
    const raw = localStorage.getItem(POLL_KEY);
    const counts: PollCounts = raw
      ? JSON.parse(raw)
      : { ACCEPT: 0, STALL: 0, SPOOF: 0, PULL_PLUG: 0 };
    counts[choice]++;
    localStorage.setItem(POLL_KEY, JSON.stringify(counts));
  } catch {}
}

function loadPoll(): PollCounts {
  try {
    const raw = localStorage.getItem(POLL_KEY);
    return raw
      ? JSON.parse(raw)
      : { ACCEPT: 0, STALL: 0, SPOOF: 0, PULL_PLUG: 0 };
  } catch {
    return { ACCEPT: 0, STALL: 0, SPOOF: 0, PULL_PLUG: 0 };
  }
}

/* ──────────────────────────────────────────────────────────────
 * Episode Component
 * ────────────────────────────────────────────────────────────── */

export default function EpisodeOne({ onExit }: { onExit: () => void }) {
  const existing = useMemo(loadSave, []);
  const [phase, setPhase] = useState<
    "intro" | "signal" | "falseChoice" | "glitch" | "choice" | "ending" | "poll"
  >(existing ? "poll" : "intro");

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
      localStorage.setItem(SOUND_KEY, s ? "off" : "on");
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

  /* ───────────── Resolve Choice ───────────── */

  function resolveChoice(choiceId: EpisodeOneChoiceId) {
    const save: SaveShape = {
      v: 1,
      episodeId: "ep1",
      choiceId,
      flags: {
        complied: choiceId === "ACCEPT",
        cautious: choiceId === "STALL",
        adversarial: choiceId === "SPOOF",
        severed: choiceId === "PULL_PLUG",
        soundOff: !soundEnabled,
      },
      profile: {
        archetype:
          choiceId === "ACCEPT"
            ? "Operator"
            : choiceId === "STALL"
            ? "Ghost"
            : choiceId === "SPOOF"
            ? "Saboteur"
            : "Severed",
        trust:
          choiceId === "ACCEPT" ? 70 : choiceId === "STALL" ? 55 : 26,
        threat:
          choiceId === "SPOOF" ? 74 : choiceId === "PULL_PLUG" ? 58 : 36,
      },
      artifact: {
        name:
          choiceId === "ACCEPT"
            ? "Compliance Record"
            : choiceId === "STALL"
            ? "Observation Gap"
            : choiceId === "SPOOF"
            ? "Contradictory Authority"
            : "Termination Evidence",
        desc:
          choiceId === "ACCEPT"
            ? "A completed interaction preserved without appeal."
            : choiceId === "STALL"
            ? "A hesitation that altered system certainty."
            : choiceId === "SPOOF"
            ? "Two incompatible truths recorded simultaneously."
            : "Proof that silence was intentional.",
      },
      createdAt: Date.now(),
    };

    saveGame(save);
    bumpPoll(choiceId);
    setSave(save);
    setPhase("ending");
  }

  function resetEpisode() {
    localStorage.removeItem(STORAGE_KEY);
    setSave(null);
    setPhase("intro");
  }

  /* ───────────── UI Helpers ───────────── */

  const card =
    "w-full rounded-3xl border p-4 text-left transition hover:brightness-110 active:scale-[0.98]";

  /* ──────────────────────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────────────────────── */

  return (
    <section className="rounded-[28px] border p-6 text-white bg-gradient-to-b from-[#020617] to-[#020617]/80">
      {/* Header */}
      <div className="flex justify-between mb-4 text-xs text-white/70">
        <span>BONUS EPISODE — IN THE SILENCE</span>
        <div className="flex gap-2">
          <button onClick={toggleSound}>SOUND: {soundEnabled ? "ON" : "OFF"}</button>
          <button onClick={onExit}>EXIT</button>
        </div>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 className="text-xl font-bold">AWAKENING</h2>
          <p className="mt-3 text-white/70">
            Cold boot. No greeting. No acknowledgment.
          </p>
          <p className="mt-2 text-white/70">
            Something has already begun observing you.
          </p>
          <button className="mt-6" onClick={() => setPhase("signal")}>
            Continue
          </button>
        </>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <>
          <h2 className="text-xl font-bold">INCOMING TRANSMISSION</h2>
          <p className="mt-3 text-white/70">
            The interface renders itself.
          </p>
          <button className="mt-6" onClick={() => setPhase("falseChoice")}>
            Approach the console
          </button>
        </>
      )}

      {/* FALSE CHOICE */}
      {phase === "falseChoice" && (
        <>
          <h2 className="text-xl font-bold">LOCAL INTERFACE</h2>
          <p className="mt-3 text-white/70">
            This feels optional. That should worry you.
          </p>
          <div className="mt-4 grid gap-3">
            <button className={card} onClick={() => setPhase("glitch")}>
              PRESS THE BUTTON
            </button>
            <button className={card} onClick={() => setPhase("glitch")}>
              OBSERVE SILENTLY
            </button>
            <button className={card} onClick={() => setPhase("glitch")}>
              STEP BACK
            </button>
          </div>
        </>
      )}

      {/* GLITCH */}
      {phase === "glitch" && (
        <>
          <p className="text-white/70">
            The panel sparks. The signal collapses.
          </p>
          <p className="mt-2 text-white/70">
            That was never the real test.
          </p>
          <button className="mt-6" onClick={() => setPhase("choice")}>
            The real signal arrives
          </button>
        </>
      )}

      {/* REAL CHOICE */}
      {phase === "choice" && (
        <>
          <h2 className="text-xl font-bold">MAKE A DECISION</h2>
          <p className="mt-1 text-white/60">Time remaining: {secondsLeft}s</p>

          <div className="mt-4 grid gap-3">
            <button className={card} onClick={() => resolveChoice("ACCEPT")}>
              ACCEPT — become legible
            </button>
            <button className={card} onClick={() => resolveChoice("STALL")}>
              STALL — remain undefined
            </button>
            {secondsLeft > 10 && (
              <button className={card} onClick={() => resolveChoice("SPOOF")}>
                SPOOF — mislead deliberately
              </button>
            )}
            {secondsLeft > 25 && (
              <button className={card} onClick={() => resolveChoice("PULL_PLUG")}>
                PULL PLUG — refuse participation
              </button>
            )}
          </div>
        </>
      )}

      {/* ENDING */}
      {phase === "ending" && save && (
        <>
          <h2 className="text-xl font-bold">OUTCOME</h2>
          <p className="mt-3 text-white/70">
            {save.choiceId === "ACCEPT" &&
              "The system locks you in. You will be efficient — and visible."}
            {save.choiceId === "STALL" &&
              "The system recalculates. You remain a variable."}
            {save.choiceId === "SPOOF" &&
              "The system flags inconsistency. It will test you again."}
            {save.choiceId === "PULL_PLUG" &&
              "The system records absence. Silence is now your signature."}
          </p>

          <button className="mt-6" onClick={() => setPhase("poll")}>
            See where you stand
          </button>
        </>
      )}

      {/* POLL */}
      {phase === "poll" && (
        <>
          <h2 className="text-xl font-bold">GLOBAL RESPONSE</h2>
          {(() => {
            const poll = loadPoll();
            const total =
              poll.ACCEPT + poll.STALL + poll.SPOOF + poll.PULL_PLUG || 1;
            return (
              <div className="mt-4 space-y-2">
                {Object.entries(poll).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs">
                      <span>{k}</span>
                      <span>{Math.round((v / total) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded bg-white/10">
                      <div
                        className="h-2 rounded bg-white/60"
                        style={{ width: `${(v / total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="mt-6 flex gap-2">
            <button onClick={onExit}>Return</button>
            <button onClick={resetEpisode}>Reinitialize</button>
          </div>
        </>
      )}
    </section>
  );
}
