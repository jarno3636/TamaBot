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
 * Optional "unlock" ping for your main page.
 * Your main page can listen for this key or the storage event
 * and unlock the bonus episode when it changes.
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

function SceneImage({
  src,
  title,
  subtitle,
}: {
  src: string;
  title: string;
  subtitle: string;
}) {
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
          alt={title}
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

      <div className="relative p-4">
        <div className="text-[12px] font-extrabold tracking-wide text-white/80">
          {title}
        </div>
        <div className="mt-1 text-[12px] leading-relaxed text-white/60">
          {subtitle}
        </div>
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

  // ✅ 60 seconds for choices
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

        // ✅ “unlock” signal for the main page
        // (main page can watch UNLOCK_KEY via storage event or polling)
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
        trust:
          choiceId === "ACCEPT"
            ? 70
            : choiceId === "STALL"
              ? 55
              : choiceId === "SPOOF"
                ? 26
                : 16,
        threat:
          choiceId === "ACCEPT"
            ? 22
            : choiceId === "STALL"
              ? 36
              : choiceId === "SPOOF"
                ? 74
                : 58,
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
            ? "A clean completion."
            : choiceId === "STALL"
              ? "A missing answer."
              : choiceId === "SPOOF"
                ? "Two truths at once."
                : "A deliberate cut.",
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
    intro: {
      src: "/story/ep1/01-awakening.webp",
      title: "AWAKENING",
      subtitle: "Cold boot. No greeting. The room resolves like a memory you didn’t live.",
    },
    signal: {
      src: "/story/ep1/02-transmission.webp",
      title: "INCOMING TRANSMISSION",
      subtitle: "A panel appears without loading. The cursor lags by a heartbeat — on purpose.",
    },
    local: {
      src: "/story/ep1/03-local-node.webp",
      title: "LOCAL CONTROL NODE",
      subtitle: "Old hardware. Physical input. No network — yet it hums like it’s waiting for judgment.",
    },
    localAfter: {
      src: "/story/ep1/04-sparks.webp",
      title: "TRANSMISSION COLLAPSE",
      subtitle: "The console reacts to intent, not touch. Light crawls across the seam and then it dies.",
    },
    choice: {
      src: "/story/ep1/05-decision-window.webp",
      title: "DECISION WINDOW",
      subtitle: "A clean interface. The system is present as the screen appears.",
    },
    ending: {
      src: "/story/ep1/06-outcome.webp",
      title: "EVALUATION",
      subtitle: "No thanks. Only an update.",
    },
    poll: {
      src: "/story/ep1/07-global-response.webp",
      title: "GLOBAL RESPONSE",
      subtitle: "You were not the first. You will not be the last.",
    },
  } as const;

  /* ───────────── Choice UI ───────────── */
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
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
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
      {/* Header (clean: no BONUS EPISODE / no pre-story banner) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-[12px] font-extrabold tracking-wide text-white/70">
          EPISODE ONE
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.intro} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">
              AWAKENING
            </h2>

            {/* ✅ shorter intro copy */}
            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>Cold boot. No tone.</p>
              <p>The room resolves like a memory you didn’t live.</p>
              <p className="text-white/80 font-semibold">And something starts counting.</p>
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
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">
              INCOMING TRANSMISSION
            </h2>

            {/* ✅ shorter signal copy */}
            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>A panel fades in. No sender.</p>
              <p>Your cursor lags — like the system is measuring you.</p>
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
              Approach
            </button>
          </div>
        </div>
      )}

      {/* LOCAL */}
      {phase === "local" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.local} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">
              LOCAL CONTROL NODE
            </h2>

            {/* ✅ shorter local copy */}
            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>Old hardware. Real resistance.</p>
              <p>It hums like it’s waiting to judge intent.</p>
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
                <div className="text-[12px] font-extrabold text-white/90">Press</div>
                <div className="mt-1 text-[11px] text-white/60">Commit.</div>
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
                <div className="text-[12px] font-extrabold text-white/90">Ignore</div>
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
                <div className="text-[12px] font-extrabold text-white/90">Back off</div>
                <div className="mt-1 text-[11px] text-white/60">Create space.</div>
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
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">
              TRANSMISSION COLLAPSE
            </h2>

            {/* ✅ shorter bridge copy */}
            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>The console sparks — even if you never touched it.</p>
              <p className="text-white/80 font-semibold">Intent counts as input.</p>
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
              Open decision window
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
                <h2 className="text-[22px] font-extrabold text-white/95">DECIDE</h2>

                <div
                  className="mt-2 rounded-2xl border px-3 py-2 text-[12px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.18)",
                    color: "rgba(255,255,255,0.70)",
                  }}
                >
                  You have one minute.
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
                  <div className="text-[11px] font-semibold tracking-wide text-white/62">TIMER</div>
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
                  {secondsLeft > 35 && "All options available."}
                  {secondsLeft <= 35 && secondsLeft > 15 && "Sever will withdraw soon."}
                  {secondsLeft <= 15 && "Spoof withdraws. Truth or silence remain."}
                </div>

                <div className="mt-3 text-[11px] text-white/46">
                  If you do nothing, it will choose for you.
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <ChoiceCard
                choiceId="ACCEPT"
                title="Accept"
                body="Answer cleanly."
                risk="You become routable."
                payoff="Smoother access."
                onClick={() => resolveChoice("ACCEPT")}
              />

              <ChoiceCard
                choiceId="STALL"
                title="Stall"
                body="Withhold the answer."
                risk="Silence gets labeled."
                payoff="You stay uncertain."
                onClick={() => resolveChoice("STALL")}
              />

              <ChoiceCard
                choiceId="SPOOF"
                hidden={secondsLeft <= 15}
                title="Spoof"
                body="Feed it a false you."
                risk="Contradictions escalate."
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
          </div>
        </div>
      )}

      {/* ENDING */}
      {phase === "ending" && save && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.ending} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">
                COMPLETE
              </h2>
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

            <div className="mt-4 text-[13px] leading-relaxed text-white/72">
              {save.choiceId === "ACCEPT" && <p>You complied. Doors get quieter.</p>}
              {save.choiceId === "STALL" && <p>You withheld. The system fills the gap.</p>}
              {save.choiceId === "SPOOF" && <p>You lied well. Now you’re interesting.</p>}
              {save.choiceId === "PULL_PLUG" && <p>You cut the channel. Something else stays listening.</p>}
            </div>

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
              View response
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
                Reinitialize
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
