"use client";

import Image from "next/image";
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

type PollCounts = Record<EpisodeOneChoiceId, number>;

const STORAGE_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep1_sound";
const POLL_KEY = "basebots_ep1_poll";

/** ✅ episode completion flag */
const EP1_DONE_KEY = "basebots_ep1_done";

/**
 * Main page can listen for this changing to "unlock" bonus episode
 * when the user toggles sound in this episode.
 */
const UNLOCK_KEY = "basebots_bonus_unlock";

/* ──────────────────────────────────────────────────────────────
 * Persistence
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

function loadPoll(): PollCounts {
  try {
    const raw = localStorage.getItem(POLL_KEY);
    return raw ? (JSON.parse(raw) as PollCounts) : { ACCEPT: 0, STALL: 0, SPOOF: 0, PULL_PLUG: 0 };
  } catch {
    return { ACCEPT: 0, STALL: 0, SPOOF: 0, PULL_PLUG: 0 };
  }
}

function bumpPoll(choiceId: EpisodeOneChoiceId) {
  try {
    const current = loadPoll();
    current[choiceId] = (current[choiceId] ?? 0) + 1;
    localStorage.setItem(POLL_KEY, JSON.stringify(current));
  } catch {}
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/* ──────────────────────────────────────────────────────────────
 * UI helpers
 * ────────────────────────────────────────────────────────────── */

function cardShell() {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
    boxShadow: "0 26px 110px rgba(0,0,0,0.65)",
  } as const;
}

function choiceTone(choice: EpisodeOneChoiceId) {
  switch (choice) {
    case "ACCEPT":
      return {
        border: "rgba(52,211,153,0.28)",
        glow: "rgba(52,211,153,0.10)",
        wash:
          "radial-gradient(820px 260px at 15% 0%, rgba(52,211,153,0.18), transparent 60%), radial-gradient(760px 260px at 90% 30%, rgba(56,189,248,0.10), transparent 62%)",
        label: "OPERATOR",
      };
    case "STALL":
      return {
        border: "rgba(56,189,248,0.24)",
        glow: "rgba(56,189,248,0.10)",
        wash:
          "radial-gradient(820px 260px at 15% 0%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(760px 260px at 90% 30%, rgba(168,85,247,0.10), transparent 62%)",
        label: "GHOST",
      };
    case "SPOOF":
      return {
        border: "rgba(251,191,36,0.26)",
        glow: "rgba(251,191,36,0.10)",
        wash:
          "radial-gradient(820px 260px at 15% 0%, rgba(251,191,36,0.18), transparent 60%), radial-gradient(760px 260px at 90% 30%, rgba(244,63,94,0.10), transparent 62%)",
        label: "SABOTEUR",
      };
    default:
      return {
        border: "rgba(251,113,133,0.24)",
        glow: "rgba(251,113,133,0.10)",
        wash:
          "radial-gradient(820px 260px at 15% 0%, rgba(251,113,133,0.18), transparent 60%), radial-gradient(760px 260px at 90% 30%, rgba(168,85,247,0.10), transparent 62%)",
        label: "SEVERED",
      };
  }
}

function barTone(choice: EpisodeOneChoiceId) {
  switch (choice) {
    case "ACCEPT":
      return "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(56,189,248,0.85))";
    case "STALL":
      return "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.80))";
    case "SPOOF":
      return "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(244,63,94,0.75))";
    default:
      return "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(168,85,247,0.85))";
  }
}

function SceneImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        boxShadow: "0 28px 120px rgba(0,0,0,0.60)",
      }}
    >
      <div className="relative h-[180px] md:h-[220px]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={false}
          sizes="(max-width: 768px) 100vw, 900px"
          style={{ objectFit: "cover" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.10) 0%, rgba(2,6,23,0.82) 78%, rgba(2,6,23,0.92) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 300px at 20% 0%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(900px 300px at 90% 10%, rgba(168,85,247,0.14), transparent 62%)",
            opacity: 0.9,
          }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Episode Component
 * ────────────────────────────────────────────────────────────── */

export default function EpisodeOne({ onExit }: { onExit: () => void }) {
  const existing = useMemo(() => loadSave(), []);
  const [phase, setPhase] = useState<
    "intro" | "signal" | "local" | "localAfter" | "choice" | "ending" | "poll"
  >(existing ? "poll" : "intro");

  // ✅ 1:30 (90s) for choice window
  const CHOICE_WINDOW_SECONDS = 90;

  const [secondsLeft, setSecondsLeft] = useState(CHOICE_WINDOW_SECONDS);
  const [save, setSave] = useState<SaveShape | null>(existing);

  // local “doesn't matter” choice, only for flavor
  const [localPick, setLocalPick] = useState<null | "PRESS" | "LEAVE" | "BACK">(null);

  /* ───────────── Sound ───────────── */
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create the looping audio once
  useEffect(() => {
    const a = new Audio("/audio/s1.mp3"); // public/audio/s1.mp3
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.65;
    audioRef.current = a;

    return () => {
      try {
        a.pause();
        a.src = "";
      } catch {}
      audioRef.current = null;
    };
  }, []);

  // Keep audio state in sync with soundEnabled
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (!soundEnabled) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      return;
    }

    // Attempt to play (may be blocked until user gesture; that's fine)
    a.play().catch(() => {});
  }, [soundEnabled]);

  function toggleSound() {
    setSoundEnabled((s) => {
      const next = !s;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
        // ✅ ping main page unlock (listen for this changing)
        localStorage.setItem(UNLOCK_KEY, String(Date.now()));
      } catch {}
      return next;
    });
  }

  /* ───────────── Timer ───────────── */
  useEffect(() => {
    if (phase !== "choice") return;

    setSecondsLeft(CHOICE_WINDOW_SECONDS);
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "choice" && secondsLeft === 0) {
      resolveChoice("STALL");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  /* ───────────── Resolve real choice ───────────── */
  function resolveChoice(choiceId: EpisodeOneChoiceId) {
    const s: SaveShape = {
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
        trust: choiceId === "ACCEPT" ? 70 : choiceId === "STALL" ? 55 : choiceId === "SPOOF" ? 26 : 16,
        threat: choiceId === "ACCEPT" ? 22 : choiceId === "STALL" ? 36 : choiceId === "SPOOF" ? 74 : 58,
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
            ? "A credentialed profile registered to your Basebot without challenge."
            : choiceId === "STALL"
              ? "A session finalized with withheld identity — logged as non-cooperative."
              : choiceId === "SPOOF"
                ? "A forged credential accepted long enough to create two official records."
                : "A hard sever logged at the transport layer with a surviving trace.",
      },
      createdAt: Date.now(),
    };

    // ✅ mark EP1 complete for hub logic
    try {
      localStorage.setItem(EP1_DONE_KEY, "true");
    } catch {}

    saveGame(s);
    bumpPoll(choiceId);
    setSave(s);
    setPhase("ending");
  }

  function resetEpisode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EP1_DONE_KEY);
    } catch {}
    setSave(null);
    setLocalPick(null);
    setPhase("intro");
  }

  /* ───────────── Scene images (you provide files) ───────────── */
  const images = {
    intro: { src: "/story/ep1/01-awakening.webp", alt: "Awakening" },
    signal: { src: "/story/ep1/02-transmission.webp", alt: "Incoming transmission" },
    local: { src: "/story/ep1/03-local-node.webp", alt: "Local control node" },
    localAfter: { src: "/story/ep1/04-sparks.webp", alt: "Transmission collapse" },
    choice: { src: "/story/ep1/05-decision-window.webp", alt: "Decision window" },
    ending: { src: "/story/ep1/06-outcome.webp", alt: "Evaluation" },
    poll: { src: "/story/ep1/07-global-response.webp", alt: "Global response" },
  } as const;

  /* ───────────── Choice Card ───────────── */
  function ChoiceCard({
    choiceId,
    title,
    body,
    risk,
    payoff,
    disabled,
    hidden,
    onClick,
  }: {
    choiceId: EpisodeOneChoiceId;
    title: string;
    body: string;
    risk: string;
    payoff: string;
    disabled?: boolean;
    hidden?: boolean;
    onClick: () => void;
  }) {
    if (hidden) return null;

    const tone = choiceTone(choiceId);

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-3xl border p-4 text-left transition active:scale-[0.99]"
        style={{
          borderColor: tone.border,
          background: "rgba(0,0,0,0.24)",
          boxShadow: "0 24px 120px rgba(0,0,0,0.65)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <div aria-hidden className="absolute inset-0 opacity-95" style={{ background: tone.wash }} />
        <div
          aria-hidden
          className="absolute -top-16 left-0 right-0 h-28 opacity-35"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
            transform: "rotate(-7deg)",
          }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide"
                style={{
                  borderColor: tone.border,
                  background: tone.glow,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                {tone.label}
              </div>

              <div className="mt-2 text-[15px] font-extrabold text-white/95">{title}</div>
              <div className="mt-1 text-[12px] leading-relaxed text-white/70">{body}</div>
            </div>

            <div
              className="hidden md:flex items-center justify-center rounded-2xl border px-3 py-2 text-[10px] font-mono"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                color: "rgba(255,255,255,0.64)",
              }}
            >
              /{choiceId}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div
              className="rounded-2xl border px-3 py-2"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div className="text-[10px] font-semibold tracking-wide text-white/55">RISK</div>
              <div className="mt-1 text-[12px] text-white/72">{risk}</div>
            </div>
            <div
              className="rounded-2xl border px-3 py-2"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div className="text-[10px] font-semibold tracking-wide text-white/55">PAYOFF</div>
              <div className="mt-1 text-[12px] text-white/72">{payoff}</div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  function PollRow({
    choiceId,
    value,
    total,
    highlight,
  }: {
    choiceId: EpisodeOneChoiceId;
    value: number;
    total: number;
    highlight?: boolean;
  }) {
    const percent = pct(value, total);
    const grad = barTone(choiceId);

    return (
      <div
        className="rounded-2xl border p-3"
        style={{
          borderColor: highlight ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
          background: highlight ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold tracking-wide text-white/80">{choiceId}</div>
          <div className="text-[11px] text-white/60">
            {value} • {percent}%
          </div>
        </div>
        <div
          className="mt-2 h-[10px] rounded-full border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              background: grad,
              boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
            }}
          />
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────────────────────── */

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-5 md:p-7"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.94), rgba(2,6,23,0.70))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.78)",
      }}
    >
      {/* Minimal controls only (no header banner) */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            toggleSound();
            // also try to kick playback on user gesture if turning on
            const a = audioRef.current;
            if (a && !soundEnabled) a.play().catch(() => {});
          }}
          className="rounded-full border px-4 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: soundEnabled ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.84)",
          }}
        >
          SOUND: {soundEnabled ? "ON" : "OFF"}
        </button>

        <button
          type="button"
          onClick={resetEpisode}
          className="rounded-full border px-4 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.84)",
          }}
        >
          Reinitialize
        </button>

        <button
          type="button"
          onClick={onExit}
          className="rounded-full border px-4 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.84)",
          }}
        >
          Exit
        </button>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.intro} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">AWAKENING</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>Cold boot. No startup tone. No friendly status lights.</p>
              <p>
                Your Basebot wakes on a steel slab in a room built like a shipping container: sealed seams, vented corners, one door with
                no handle.
              </p>
              <p>A single ceiling strip flickers at a steady interval—like a metronome you didn’t agree to hear.</p>
              <p>The Basebot runs an internal check and returns one usable fact:</p>
              <p className="text-white/80 font-semibold">You’re inside a relay station… and it’s waiting for a credential it doesn’t have.</p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("signal")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(90deg, rgba(56,189,248,0.90), rgba(168,85,247,0.70))",
                color: "rgba(2,6,23,0.98)",
                boxShadow: "0 16px 60px rgba(56,189,248,0.14)",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.signal} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">SIGNAL DROP</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>A polished interface tries to load—logos, gradients, something that looks official.</p>
              <p>Then it doesn’t “arrive.” It drains.</p>
              <p>Colors wash out. Panels lose their borders. The whole thing collapses into bare text, as if the mask can’t hold.</p>
              <p className="text-white/80 font-semibold">A single line remains, steady and indifferent:</p>
              <p className="font-mono text-white/80">AUDIT GATE: OPERATOR PROFILE REQUIRED</p>
              <p>The door doesn’t unlock. The air stays cold. The Basebot’s servos stay quiet like they’re being listened to.</p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("local")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(90deg, rgba(251,113,133,0.92), rgba(168,85,247,0.70))",
                color: "rgba(2,6,23,0.98)",
                boxShadow: "0 16px 60px rgba(251,113,133,0.14)",
              }}
            >
              Find the local terminal
            </button>
          </div>
        </div>
      )}

      {/* LOCAL */}
      {phase === "local" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.local} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">LOCAL CONTROL NODE</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>You find the node inside a wall recess—older hardware, scratched metal, a physical actuator with worn edges.</p>
              <p>
                A label plate is half-peeled, but one thing is readable: <span className="font-semibold text-white/80">MANUAL OVERRIDE</span>.
              </p>
              <p>No blinking lights. No friendly prompts. Just a cable port, an actuator, and an empty badge slot.</p>
              <p className="text-white/80 font-semibold">Whatever this room is, it expects an “operator”—and your Basebot is currently unowned.</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setLocalPick("PRESS");
                  setPhase("localAfter");
                }}
                className="rounded-3xl border p-4 text-left transition active:scale-[0.99] hover:brightness-110"
                style={{
                  borderColor: "rgba(56,189,248,0.22)",
                  background:
                    "radial-gradient(700px 220px at 10% 0%, rgba(56,189,248,0.16), transparent 60%), rgba(0,0,0,0.24)",
                  boxShadow: "0 22px 90px rgba(0,0,0,0.60)",
                }}
              >
                <div className="text-[12px] font-extrabold text-white/90">Press override</div>
                <div className="mt-1 text-[11px] text-white/60">Force a handshake attempt.</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocalPick("LEAVE");
                  setPhase("localAfter");
                }}
                className="rounded-3xl border p-4 text-left transition active:scale-[0.99] hover:brightness-110"
                style={{
                  borderColor: "rgba(251,191,36,0.20)",
                  background:
                    "radial-gradient(700px 220px at 10% 0%, rgba(251,191,36,0.14), transparent 60%), rgba(0,0,0,0.24)",
                  boxShadow: "0 22px 90px rgba(0,0,0,0.60)",
                }}
              >
                <div className="text-[12px] font-extrabold text-white/90">Leave it alone</div>
                <div className="mt-1 text-[11px] text-white/60">Avoid triggering anything.</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocalPick("BACK");
                  setPhase("localAfter");
                }}
                className="rounded-3xl border p-4 text-left transition active:scale-[0.99] hover:brightness-110"
                style={{
                  borderColor: "rgba(251,113,133,0.20)",
                  background:
                    "radial-gradient(700px 220px at 10% 0%, rgba(251,113,133,0.14), transparent 60%), rgba(0,0,0,0.24)",
                  boxShadow: "0 22px 90px rgba(0,0,0,0.60)",
                }}
              >
                <div className="text-[12px] font-extrabold text-white/90">Step back</div>
                <div className="mt-1 text-[11px] text-white/60">Let the room declare itself.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCAL AFTER */}
      {phase === "localAfter" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.localAfter} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">OVERRIDE REJECTED</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              {localPick === "PRESS" && (
                <>
                  <p>Your Basebot presses the actuator. There’s real resistance—then a hard, mechanical click.</p>
                  <p>The node warms for half a second. A taste of ozone. A spark behind the panel seam.</p>
                  <p className="text-white/80 font-semibold">Not failure. Denial.</p>
                </>
              )}

              {localPick === "LEAVE" && (
                <>
                  <p>You don’t touch it. The room answers anyway.</p>
                  <p>The node flares like it was triggered remotely—quick heat, quick sparks, then a controlled shutdown.</p>
                  <p className="text-white/80 font-semibold">The system doesn’t need your hand on the switch.</p>
                </>
              )}

              {localPick === "BACK" && (
                <>
                  <p>You step back. The Basebot’s optics tilt toward the door, then the vents, then the ceiling strip.</p>
                  <p>The node sparks on its own—like it’s being “cleared” to remove a workaround.</p>
                  <p className="text-white/80 font-semibold">Manual escape routes are being closed.</p>
                </>
              )}

              <p>The recess goes dead. No lights. No hum. No second chance.</p>
              <p>Then the stripped-down audit text returns—cleaner now, more direct.</p>
              <p className="font-mono text-white/80">AUDIT GATE: SUBMIT OPERATOR PROFILE OR BE CLASSIFIED</p>
              <p className="text-white/80 font-semibold">This is the real decision: name yourself… refuse… counterfeit… or cut the line entirely.</p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("choice")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(90deg, rgba(168,85,247,0.90), rgba(56,189,248,0.84))",
                color: "rgba(2,6,23,0.98)",
                boxShadow: "0 16px 60px rgba(168,85,247,0.12)",
              }}
            >
              Open audit prompt
            </button>
          </div>
        </div>
      )}

      {/* REAL CHOICE */}
      {phase === "choice" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.choice} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[22px] font-extrabold text-white/95">AUDIT PROMPT</h2>
                <div className="mt-2 text-[13px] text-white/70">
                  The door will not open without a profile on record.{" "}
                  <span className="text-white/80 font-semibold">
                    If you don’t submit one, the system submits a label for you.
                  </span>
                </div>
                <div className="mt-2 text-[12px] text-white/60 font-mono">
                  REQUIRED: operator credential • OPTIONAL: justification • OUTPUT: routing + classification
                </div>
              </div>

              <div
                className="w-full md:w-[360px] rounded-3xl border p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.22)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-wide text-white/62">DECISION WINDOW</div>
                  <div
                    className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: secondsLeft <= 10 ? "rgba(255,241,242,0.92)" : "rgba(255,255,255,0.82)",
                    }}
                  >
                    {formatTime(secondsLeft)}
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-white/58">
                  {secondsLeft > 60 && "All actions available. Audit is tolerant."}
                  {secondsLeft <= 60 && secondsLeft > 25 && "Sever option will be withdrawn soon."}
                  {secondsLeft <= 25 && "Decoy submission will be withdrawn. Only record or refusal remain."}
                </div>

                <div className="mt-3 text-[11px] text-white/46">
                  Auto-finalize at 0:00: <span className="text-white/70 font-semibold">Non-cooperative (STALL)</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <ChoiceCard
                choiceId="ACCEPT"
                title="Submit Credential"
                body="Register yourself as the operator and let the system route the Basebot under your name."
                risk="Your identity becomes the key—and the leash. Future gates will recognize you."
                payoff="Door access, clean routing, fewer alarms… for now."
                onClick={() => resolveChoice("ACCEPT")}
              />

              <ChoiceCard
                choiceId="STALL"
                title="Refuse to Identify"
                body="Do not provide a credential. Demand a reason. Let the system act without your consent."
                risk="Refusal becomes a permanent classification: uncooperative, unknown, flagged."
                payoff="You keep your name out of its registry and learn what it does to the unnamed."
                onClick={() => resolveChoice("STALL")}
              />

              <ChoiceCard
                choiceId="SPOOF"
                hidden={secondsLeft <= 25}
                title="Submit Decoy"
                body="Provide a plausible credential that isn’t yours—enough to pass the gate, not enough to be true."
                risk="If audited, the mismatch escalates immediately. False credentials trigger containment."
                payoff="You buy movement and collect how the system verifies legitimacy."
                onClick={() => resolveChoice("SPOOF")}
              />

              <ChoiceCard
                choiceId="PULL_PLUG"
                hidden={secondsLeft <= 60}
                title="Sever the Link"
                body="Cut the channel before a profile is written. Let the room go silent and deal with the fallout."
                risk="Severance is logged. Someone—or something—will investigate the gap."
                payoff="You deny the system a clean record and avoid being routed at all."
                onClick={() => resolveChoice("PULL_PLUG")}
              />
            </div>

            <div className="mt-6 text-center text-[11px] text-white/46">“What gets recorded becomes what gets enforced.”</div>
          </div>
        </div>
      )}

      {/* ENDING */}
      {phase === "ending" && save && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.ending} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">AUDIT RESULT</h2>
              <div
                className="rounded-full border px-3 py-1 text-[11px] font-extrabold"
                style={{
                  borderColor: choiceTone(save.choiceId).border,
                  background: choiceTone(save.choiceId).glow,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                {save.profile.archetype.toUpperCase()}
              </div>
            </div>

            <div
              className="mt-3 rounded-2xl border p-3"
              style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
            >
              <div className="text-[12px] text-white/75">
                Artifact: <span className="font-extrabold text-white/92">{save.artifact.name}</span>
              </div>
              <div className="mt-1 text-[11px] text-white/60">{save.artifact.desc}</div>
            </div>

            {save.choiceId === "ACCEPT" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You submit a credential. The text cursor stops blinking like it’s satisfied.</p>
                <p>Immediately the room changes temperature—subtle, controlled—like a facility coming online around you.</p>
                <p>The door releases with a soft pneumatic sigh. Not welcoming. Authorized.</p>
                <p className="text-white/80 font-semibold">
                  Then a second line appears beneath the audit result—formatted differently, older, not part of the gate:
                </p>
                <p className="font-mono text-white/80">SUBNET-12: “We’ve been waiting for you to choose a name.”</p>
              </div>
            )}

            {save.choiceId === "STALL" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You refuse to identify. The system waits—longer than a normal gate would.</p>
                <p>Then the audit completes anyway, stamping your session with a sterile label.</p>
                <p>The door unlocks only halfway—an inch of gap, just enough to prove it could have been generous.</p>
                <p className="text-white/80 font-semibold">A new line flickers in and out, like it’s using the gap to speak:</p>
                <p className="font-mono text-white/80">SUBNET-12: “Unclaimed units are collected.”</p>
              </div>
            )}

            {save.choiceId === "SPOOF" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You submit a decoy credential—clean enough to look real, wrong enough to be dangerous.</p>
                <p>The system accepts it fast. Too fast.</p>
                <p>The door unlocks, and the corridor beyond is already lit, like it anticipated your success.</p>
                <p className="text-white/80 font-semibold">
                  Then your screen splits: two audit receipts, both “valid,” both incompatible—now both permanent.
                </p>
                <p className="font-mono text-white/80">SUBNET-12: “Two names. One body. That’s rare.”</p>
              </div>
            )}

            {save.choiceId === "PULL_PLUG" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You sever the link. The audit text vanishes mid-line, like someone yanked a sheet from a printer.</p>
                <p>The room becomes brutally quiet—no hum, no timer, no confirmation beeps.</p>
                <p>The Basebot stays awake, optics open, scanning the door as if it expects it to open on its own.</p>
                <p className="text-white/80 font-semibold">
                  And then, from nowhere inside the silence, a message appears without the channel reattaching:
                </p>
                <p className="font-mono text-white/80">SUBNET-12: “You cut the gate. You didn’t cut us.”</p>
              </div>
            )}

            {/* EP2 Teaser (shared cliffhanger) */}
            <div
              className="mt-5 rounded-3xl border p-4"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background:
                  "radial-gradient(900px 260px at 20% 0%, rgba(56,189,248,0.10), transparent 60%), rgba(255,255,255,0.03)",
              }}
            >
              <div className="text-[11px] font-extrabold tracking-wide text-white/70">NEXT FILE DETECTED</div>
              <div className="mt-1 text-[14px] font-extrabold text-white/92">EPISODE TWO — THE CORRIDOR</div>
              <div className="mt-2 text-[12px] leading-relaxed text-white/70">
                The door isn’t an exit. It’s a handoff. Beyond it: a corridor lined with inactive Basebots—clean, upright, unplugged—like
                inventory. And at the far end, a terminal already displaying your session timestamp.
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-white/70">
                One last line blinks there, slow and patient: <span className="font-mono text-white/80">“Bring the artifact.”</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPhase("poll")}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                View global response
              </button>

              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
                  color: "rgba(2,6,23,0.98)",
                }}
              >
                Return to hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POLL */}
      {phase === "poll" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.poll} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">GLOBAL RESPONSE</h2>

            <div className="mt-3 text-[13px] text-white/70">Your decision is now part of the pattern.</div>

            {(() => {
              const poll = loadPoll();
              const total = poll.ACCEPT + poll.STALL + poll.SPOOF + poll.PULL_PLUG;

              return (
                <div className="mt-5 grid gap-3">
                  <PollRow choiceId="ACCEPT" value={poll.ACCEPT} total={total} highlight={save?.choiceId === "ACCEPT"} />
                  <PollRow choiceId="STALL" value={poll.STALL} total={total} highlight={save?.choiceId === "STALL"} />
                  <PollRow choiceId="SPOOF" value={poll.SPOOF} total={total} highlight={save?.choiceId === "SPOOF"} />
                  <PollRow
                    choiceId="PULL_PLUG"
                    value={poll.PULL_PLUG}
                    total={total}
                    highlight={save?.choiceId === "PULL_PLUG"}
                  />
                </div>
              );
            })()}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExit}
                className="rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
                  color: "rgba(2,6,23,0.98)",
                }}
              >
                Return
              </button>

              <button
                type="button"
                onClick={resetEpisode}
                className="rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                Reinitialize Session
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
