"use client";

import Image from "next/image";
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
    return raw
      ? (JSON.parse(raw) as PollCounts)
      : { ACCEPT: 0, STALL: 0, SPOOF: 0, PULL_PLUG: 0 };
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

  // ✅ 60 seconds for choice window
  const [secondsLeft, setSecondsLeft] = useState(60);
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

    setSecondsLeft(60);
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
            ? "A completed interaction preserved without appeal."
            : choiceId === "STALL"
              ? "A hesitation that altered system certainty."
              : choiceId === "SPOOF"
                ? "Two incompatible truths recorded simultaneously."
                : "Proof that silence was intentional.",
      },
      createdAt: Date.now(),
    };

    saveGame(s);
    bumpPoll(choiceId);
    setSave(s);
    setPhase("ending");
  }

  function resetEpisode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
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
          onClick={toggleSound}
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
            {/* ✅ title + story only */}
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">AWAKENING</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>Cold boot. No fan noise. No startup tone.</p>
              <p>Your Basebot’s optics stabilize on a room that doesn’t behave like a room.</p>
              <p>Distances feel negotiated. Corners feel conditional.</p>
              <p>And in the quiet, you notice something that shouldn’t be noticeable:</p>
              <p className="text-white/80 font-semibold">You are being timed — before anything has asked you to act.</p>
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
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">INCOMING TRANSMISSION</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>A panel fades into view without loading.</p>
              <p>No origin. No sender. No handshake request.</p>
              <p>Just presence.</p>
              <p>Your cursor lags behind intent by a fraction — a small delay that feels like a thumb on your pulse.</p>
              <p className="text-white/80 font-semibold">The system is learning the shape of your hesitation.</p>
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
              Approach the console
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
              <p>The Basebot detects something older than the interface you saw before.</p>
              <p>A physical actuator embedded in the console — worn edges, real resistance, real consequence.</p>
              <p>No network indicator. No telemetry light.</p>
              <p>Yet the unit hums like it’s waiting to judge your intent, not your action.</p>
              <p className="text-white/80 font-semibold">
                If you touch it, you change the room. If you don’t, you change yourself.
              </p>
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
                <div className="text-[12px] font-extrabold text-white/90">Press it</div>
                <div className="mt-1 text-[11px] text-white/60">Commit to contact.</div>
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
                <div className="text-[12px] font-extrabold text-white/90">Leave it</div>
                <div className="mt-1 text-[11px] text-white/60">Refuse contact.</div>
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
                <div className="mt-1 text-[11px] text-white/60">Increase distance.</div>
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
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">TRANSMISSION COLLAPSE</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              {localPick === "PRESS" && (
                <>
                  <p>Your Basebot presses the actuator. The resistance feels real. The click feels final.</p>
                  <p>For a breath, the console warms — then power spikes hard enough to taste.</p>
                  <p className="text-white/80 font-semibold">The interface reacts to intent, not touch.</p>
                </>
              )}

              {localPick === "LEAVE" && (
                <>
                  <p>You keep your distance. The actuator keeps humming like a dare.</p>
                  <p>Then the console flares anyway — as if refusal still counts as input.</p>
                  <p className="text-white/80 font-semibold">The interface reacts to intent, not touch.</p>
                </>
              )}

              {localPick === "BACK" && (
                <>
                  <p>You step back. The Basebot’s optics widen, measuring corners, exits, reflections.</p>
                  <p>The console sparks without being touched — like it was waiting to punish caution.</p>
                  <p className="text-white/80 font-semibold">The interface reacts to intent, not touch.</p>
                </>
              )}

              <p>Light crawls across the panel seam. A sharp crack. A smell of scorched polymer.</p>
              <p>Then the local node dies completely — as if it was never permitted to matter.</p>
              <p className="text-white/80 font-semibold">The room resets its posture. The real system finally speaks.</p>
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
              Continue
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
                <h2 className="text-[22px] font-extrabold text-white/95">MAKE A DECISION</h2>
                <div className="mt-2 text-[13px] text-white/70">
                  The interface renders cleanly. Confidently.{" "}
                  <span className="text-white/80 font-semibold">It is watching you as it appears.</span>
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
                    {secondsLeft}s
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-white/58">
                  {secondsLeft > 35 && "All channels available."}
                  {secondsLeft <= 35 && secondsLeft > 15 && "Sever will withdraw soon."}
                  {secondsLeft <= 15 && "Spoof withdraws. Truth or silence remain."}
                </div>

                <div className="mt-3 text-[11px] text-white/46">
                  If you do nothing, the system will finalize a choice on your behalf.
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <ChoiceCard
                choiceId="ACCEPT"
                title="Accept"
                body="Provide the response."
                risk="You become easy to route."
                payoff="Fewer locks. Faster passage."
                onClick={() => resolveChoice("ACCEPT")}
              />

              <ChoiceCard
                choiceId="STALL"
                title="Stall"
                body="Withhold the answer."
                risk="Silence gets classified."
                payoff="You stay a variable."
                onClick={() => resolveChoice("STALL")}
              />

              <ChoiceCard
                choiceId="SPOOF"
                hidden={secondsLeft <= 15}
                title="Spoof"
                body="Feed it a false you."
                risk="If detected, escalation."
                payoff="Learn its checks."
                onClick={() => resolveChoice("SPOOF")}
              />

              <ChoiceCard
                choiceId="PULL_PLUG"
                hidden={secondsLeft <= 35}
                title="Sever"
                body="Cut the channel."
                risk="The cut is remembered."
                payoff="Deny closure."
                onClick={() => resolveChoice("PULL_PLUG")}
              />
            </div>

            <div className="mt-6 text-center text-[11px] text-white/46">
              “You are choosing what gets written down.”
            </div>
          </div>
        </div>
      )}

      {/* ENDING */}
      {phase === "ending" && save && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.ending} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">EVALUATION COMPLETE</h2>
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

            {/* Keep the real endings (full story) */}
            {save.choiceId === "ACCEPT" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>The system acknowledges receipt. Not gratitude — proof.</p>
                <p>Something tightens in the air, like a lock deciding you belong to it.</p>
                <p>Your Basebot’s posture adjusts: micro-corrections, purposeful, practiced — as if it’s been waiting.</p>
                <p className="text-white/80 font-semibold">Doors you didn’t see quietly become yours to open.</p>
                <p>And then a second signature appears in the channel — not formatted like the first. Older. Watching.</p>
                <p className="text-white/80 font-semibold">It doesn’t speak. It simply stays.</p>
              </div>
            )}

            {save.choiceId === "STALL" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You give it nothing. The system waits longer than it should.</p>
                <p>Long enough that the waiting becomes communication.</p>
                <p>Then it proceeds anyway — confidently — like it expected your refusal as part of the dataset.</p>
                <p className="text-white/80 font-semibold">Your silence doesn’t protect you. It trains it.</p>
                <p>For a moment, the UI renders a second layer beneath the first — a shape you can’t quite parse.</p>
                <p className="text-white/80 font-semibold">A word flashes and vanishes: FRAGMENT.</p>
              </div>
            )}

            {save.choiceId === "SPOOF" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You feed it continuity with a seam in it. A lie shaped carefully like a truth.</p>
                <p>The system accepts — for a heartbeat — and the room warms by half a degree, as if fooled.</p>
                <p>Then the corners change. Like something turning its head to look directly at you.</p>
                <p className="text-white/80 font-semibold">A second record appears alongside the first, perfectly neat.</p>
                <p>Two versions of you now exist in its archive. The system doesn’t resolve contradictions — it weaponizes them.</p>
                <p className="text-white/80 font-semibold">You are now interesting.</p>
              </div>
            )}

            {save.choiceId === "PULL_PLUG" && (
              <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-white/72">
                <p>You sever the channel mid-evaluation.</p>
                <p>The interface dies without ceremony. The room becomes quiet in a way that feels illegal.</p>
                <p>Your Basebot remains awake — eyes open — suddenly alone with you.</p>
                <p className="text-white/80 font-semibold">And that’s when you realize what the system never promised:</p>
                <p>That it was the only thing listening.</p>
                <p>In the silence, a warning renders without permission — not from what you unplugged, but from what survived the cut.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPhase("poll")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.86)",
              }}
            >
              View global response
            </button>
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
                  <PollRow choiceId="PULL_PLUG" value={poll.PULL_PLUG} total={total} highlight={save?.choiceId === "PULL_PLUG"} />
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
