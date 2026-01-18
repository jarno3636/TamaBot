// components/story/TimedChoiceModal.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type TimedChoice = {
  id: string;              // stable key (saved on-chain later)
  label: string;           // what user clicks
  hint?: string;           // subtle tone / flavor, not spoilers
  tone?: "teal" | "sky" | "amber" | "rose" | "purple" | "emerald";
  disabled?: boolean;
};

export type TimedChoiceResult =
  | { kind: "picked"; choiceId: string; msLeft: number }
  | { kind: "expired"; defaultChoiceId: string; msLeft: 0 };

export default function TimedChoiceModal({
  open,
  title = "SIGNAL RECEIVED",
  prompt,
  choices,
  seconds = 12,
  defaultChoiceId,
  onClose,
  onResolve,
  allowEscapeClose = false,
}: {
  open: boolean;
  title?: string;
  prompt: string;
  choices: TimedChoice[];
  seconds?: number;
  defaultChoiceId: string;
  onClose?: () => void; // optional; if you want overlay click to close
  onResolve: (r: TimedChoiceResult) => void;
  allowEscapeClose?: boolean;
}) {
  const totalMs = Math.max(1, Math.floor(seconds * 1000));
  const [msLeft, setMsLeft] = useState(totalMs);
  const [resolved, setResolved] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const percent = useMemo(() => {
    const p = msLeft / totalMs;
    return Math.min(1, Math.max(0, p));
  }, [msLeft, totalMs]);

  const secondsDisplay = useMemo(() => {
    const s = Math.ceil(msLeft / 1000);
    return String(Math.max(0, s)).padStart(2, "0");
  }, [msLeft]);

  // Reset + start timer whenever opened
  useEffect(() => {
    if (!open) return;

    setResolved(false);
    setHoverId(null);
    setMsLeft(totalMs);
    startRef.current = performance.now();
    lastTickRef.current = startRef.current;

    const tick = (t: number) => {
      // throttle updates a bit (smooth but not too many renders)
      if (t - lastTickRef.current > 33) {
        const elapsed = t - startRef.current;
        const nextLeft = Math.max(0, totalMs - Math.floor(elapsed));
        setMsLeft(nextLeft);
        lastTickRef.current = t;

        if (nextLeft <= 0) {
          // resolve expired only once
          if (!resolved) {
            setResolved(true);
            onResolve({ kind: "expired", defaultChoiceId, msLeft: 0 });
          }
          rafRef.current = null;
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, totalMs, defaultChoiceId]);

  // Escape handling (optional)
  useEffect(() => {
    if (!open) return;
    if (!allowEscapeClose) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, allowEscapeClose, onClose]);

  const canInteract = open && !resolved && msLeft > 0;

  function resolvePick(choiceId: string) {
    if (!canInteract) return;
    setResolved(true);
    onResolve({ kind: "picked", choiceId, msLeft });
  }

  const ring = useMemo(() => {
    // SVG progress ring
    const size = 56;
    const stroke = 6;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * percent;
    const gap = c - dash;
    return { size, stroke, r, c, dash, gap };
  }, [percent]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center px-4 py-6"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% 0%, rgba(2,6,23,0.70), rgba(2,6,23,0.92))",
        backdropFilter: "blur(10px)",
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Click-catcher */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => {
          // Don’t allow accidental close while choice is live unless you explicitly want it
          if (!onClose) return;
          if (!allowEscapeClose) return;
          onClose();
        }}
        className="absolute inset-0"
        style={{ cursor: onClose && allowEscapeClose ? "pointer" : "default" }}
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.90), rgba(2,6,23,0.72))",
          boxShadow: "0 40px 140px rgba(0,0,0,0.75)",
        }}
      >
        {/* Atmospheric wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(1100px 420px at 10% -30%, rgba(121,255,225,0.14), transparent 60%), radial-gradient(1000px 520px at 95% -20%, rgba(56,189,248,0.12), transparent 55%), radial-gradient(900px 520px at 55% 120%, rgba(168,85,247,0.10), transparent 60%)",
          }}
        />

        {/* Top shimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-14 left-0 right-0 h-28 opacity-50"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
            transform: "rotate(-6deg)",
          }}
        />

        <div className="relative p-5 md:p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide"
                style={{
                  borderColor: "rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {title}
              </div>

              <div
                className="mt-3 text-[15px] md:text-[16px] font-semibold"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                {prompt}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div
                  className="text-[11px] font-medium"
                  style={{ color: "rgba(255,255,255,0.60)" }}
                >
                  Time remaining
                </div>
                <div
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {secondsDisplay}
                </div>
              </div>
            </div>

            {/* Countdown ring */}
            <div className="shrink-0">
              <div
                className="relative grid place-items-center rounded-2xl border"
                style={{
                  width: ring.size + 10,
                  height: ring.size + 10,
                  borderColor: "rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <svg
                  width={ring.size}
                  height={ring.size}
                  viewBox={`0 0 ${ring.size} ${ring.size}`}
                  aria-hidden
                >
                  <circle
                    cx={ring.size / 2}
                    cy={ring.size / 2}
                    r={ring.r}
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth={ring.stroke}
                    fill="none"
                  />
                  <circle
                    cx={ring.size / 2}
                    cy={ring.size / 2}
                    r={ring.r}
                    stroke="rgba(121,255,225,0.95)"
                    strokeWidth={ring.stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${ring.dash} ${ring.gap}`}
                    transform={`rotate(-90 ${ring.size / 2} ${ring.size / 2})`}
                    style={{
                      filter:
                        "drop-shadow(0 0 10px rgba(121,255,225,0.22))",
                    }}
                  />
                </svg>

                <div
                  className="absolute text-[12px] font-extrabold tabular-nums"
                  style={{ color: "rgba(255,255,255,0.90)" }}
                >
                  {secondsDisplay}
                </div>
              </div>
            </div>
          </div>

          {/* Choice grid */}
          <div className="mt-5 grid gap-3">
            {choices.map((c, idx) => {
              const t = c.tone ?? pickTone(idx);
              const isDisabled = !!c.disabled || !canInteract;
              const isHover = hoverId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isDisabled}
                  onMouseEnter={() => setHoverId(c.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(c.id)}
                  onBlur={() => setHoverId(null)}
                  onClick={() => resolvePick(c.id)}
                  className="group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    ...choiceCardStyle(t, isHover),
                    transform: isHover ? "translateY(-1px)" : "translateY(0px)",
                  }}
                >
                  {/* subtle left accent */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-[5px]"
                    style={{
                      background: accentGradient(t),
                      opacity: 0.9,
                    }}
                  />
                  {/* hover sheen */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-10 left-0 right-0 h-20 opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                      transform: "rotate(-6deg)",
                    }}
                  />

                  <div className="relative flex items-start gap-3">
                    <div
                      className="mt-[2px] flex h-7 w-7 items-center justify-center rounded-xl border text-[11px] font-extrabold"
                      style={{
                        borderColor: "rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.18)",
                        color: "rgba(255,255,255,0.80)",
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </div>

                    <div className="min-w-0">
                      <div
                        className="text-[13px] md:text-[14px] font-bold"
                        style={{ color: "rgba(255,255,255,0.92)" }}
                      >
                        {c.label}
                      </div>

                      <div
                        className="mt-1 text-[12px] leading-relaxed"
                        style={{
                          color: isHover
                            ? "rgba(255,255,255,0.72)"
                            : "rgba(255,255,255,0.58)",
                          transition: "color 160ms ease",
                        }}
                      >
                        {c.hint ? c.hint : defaultHintForTone(t)}
                      </div>
                    </div>

                    {/* micro status */}
                    <div className="ml-auto hidden sm:block">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-semibold"
                        style={chipStyle(t)}
                      >
                        {toneLabel(t)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer (game-only, minimal) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.52)" }}
            >
              Your response will be recorded.
            </div>

            {/* Optional small cancel affordance (only if you enable escape close) */}
            {allowEscapeClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold hover:brightness-110 active:scale-95"
                style={{
                  borderColor: "rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.74)",
                }}
              >
                Back
              </button>
            )}
          </div>
        </div>

        {/* Bottom progress bar (extra vibe) */}
        <div
          aria-hidden
          className="h-[3px] w-full"
          style={{
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(percent * 100)}%`,
              background:
                "linear-gradient(90deg, rgba(121,255,225,0.95), rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
              boxShadow: "0 0 18px rgba(121,255,225,0.18)",
              transition: "width 80ms linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Inline style helpers (no external CSS)
 * ──────────────────────────────────────────────────────────── */

function pickTone(i: number): NonNullable<TimedChoice["tone"]> {
  const tones: NonNullable<TimedChoice["tone"]>[] = ["sky", "teal", "purple", "amber", "rose", "emerald"];
  return tones[i % tones.length];
}

function toneLabel(t: NonNullable<TimedChoice["tone"]>): string {
  switch (t) {
    case "teal":
      return "STABLE";
    case "sky":
      return "OPEN";
    case "amber":
      return "BOLD";
    case "rose":
      return "RISK";
    case "purple":
      return "UNKNOWN";
    case "emerald":
      return "LOCKED";
    default:
      return "—";
  }
}

function defaultHintForTone(t: NonNullable<TimedChoice["tone"]>): string {
  switch (t) {
    case "teal":
      return "Calm compliance. Minimal deviation.";
    case "sky":
      return "Proceed with curiosity. Observe first.";
    case "amber":
      return "Assert control. Accept consequences.";
    case "rose":
      return "High variance outcome. Fast shifts.";
    case "purple":
      return "Hidden pathways. Unstable signal.";
    case "emerald":
      return "Secure action. Irreversible intent.";
    default:
      return "…";
  }
}

function accentGradient(t: NonNullable<TimedChoice["tone"]>): string {
  switch (t) {
    case "teal":
      return "linear-gradient(180deg, rgba(121,255,225,0.95), rgba(56,189,248,0.35))";
    case "sky":
      return "linear-gradient(180deg, rgba(56,189,248,0.95), rgba(99,102,241,0.35))";
    case "amber":
      return "linear-gradient(180deg, rgba(251,191,36,0.95), rgba(245,158,11,0.35))";
    case "rose":
      return "linear-gradient(180deg, rgba(251,113,133,0.95), rgba(244,63,94,0.35))";
    case "purple":
      return "linear-gradient(180deg, rgba(168,85,247,0.95), rgba(56,189,248,0.30))";
    case "emerald":
      return "linear-gradient(180deg, rgba(52,211,153,0.95), rgba(16,185,129,0.35))";
    default:
      return "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.1))";
  }
}

function choiceCardStyle(
  t: NonNullable<TimedChoice["tone"]>,
  hover: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    borderColor: "rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  };

  const glow =
    t === "teal"
      ? "rgba(121,255,225,0.20)"
      : t === "sky"
      ? "rgba(56,189,248,0.18)"
      : t === "amber"
      ? "rgba(251,191,36,0.16)"
      : t === "rose"
      ? "rgba(251,113,133,0.16)"
      : t === "emerald"
      ? "rgba(52,211,153,0.16)"
      : "rgba(168,85,247,0.16)";

  return {
    ...base,
    borderColor: hover ? "rgba(255,255,255,0.18)" : base.borderColor,
    background: hover
      ? "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.22))"
      : "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.22))",
    boxShadow: hover
      ? `0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), 0 0 22px ${glow}`
      : `0 18px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)`,
  };
}

function chipStyle(t: NonNullable<TimedChoice["tone"]>): React.CSSProperties {
  const base: React.CSSProperties = {
    borderColor: "rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.72)",
  };

  if (t === "teal")
    return { ...base, borderColor: "rgba(121,255,225,0.35)", background: "rgba(121,255,225,0.10)", color: "rgba(240,253,250,0.92)" };
  if (t === "sky")
    return { ...base, borderColor: "rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.10)", color: "rgba(240,249,255,0.92)" };
  if (t === "amber")
    return { ...base, borderColor: "rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.10)", color: "rgba(255,251,235,0.92)" };
  if (t === "rose")
    return { ...base, borderColor: "rgba(251,113,133,0.35)", background: "rgba(251,113,133,0.10)", color: "rgba(255,241,242,0.92)" };
  if (t === "emerald")
    return { ...base, borderColor: "rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.10)", color: "rgba(236,253,245,0.92)" };

  return { ...base, borderColor: "rgba(168,85,247,0.35)", background: "rgba(168,85,247,0.10)", color: "rgba(250,245,255,0.92)" };
}
