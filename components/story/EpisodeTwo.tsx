"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const EP2_KEY = "basebots_ep2_designation_v1";
const EP2_DONE_KEY = "basebots_ep2_done";
const SOUND_KEY = "basebots_ep2_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile: { archetype: string };
};

type Ep2Save = {
  designation: string;
  lockedAt: number;
};

type Phase = "descent" | "input" | "binding" | "approach";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function loadEp1(): Ep1Save | null {
  try {
    const raw = localStorage.getItem(EP1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function validate(v: string) {
  if (!/^[A-Z0-9]*$/.test(v)) return "FORMAT ERROR";
  if (v.length > 7) return "INPUT TRUNCATED";
  if (v.length < 7) return "LENGTH MISMATCH";
  return null;
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeTwo({ onExit }: { onExit: () => void }) {
  const ep1 = useMemo(() => loadEp1(), []);
  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* ───────────── Sound ───────────── */
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/s2.mp3");
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.6;
    audioRef.current = a;

    return () => {
      try {
        a.pause();
        a.src = "";
      } catch {}
      audioRef.current = null;
    };
  }, []);

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

    a.play().catch(() => {});
  }, [soundEnabled]);

  function toggleSound() {
    setSoundEnabled((s) => {
      const next = !s;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {}
      return next;
    });
  }

  /* ───────────── Commit designation ───────────── */
  function commit() {
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }

    const save: Ep2Save = {
      designation: value,
      lockedAt: Date.now(),
    };

    try {
      localStorage.setItem(EP2_KEY, JSON.stringify(save));
      localStorage.setItem(EP2_DONE_KEY, "true"); // 🔓 unlock Episode 3
    } catch {}

    setPhase("binding");
    setTimeout(() => setPhase("approach"), 1200);
  }

  /* ──────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────── */

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-6 md:p-8 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.94), rgba(2,6,23,0.72))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.80)",
      }}
    >
      {/* Controls */}
      <div className="flex justify-end gap-2">
        <button
          onClick={toggleSound}
          className="rounded-full border px-4 py-2 text-[12px] font-extrabold"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: soundEnabled ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.84)",
          }}
        >
          SOUND: {soundEnabled ? "ON" : "OFF"}
        </button>

        <button
          onClick={onExit}
          className="rounded-full border px-4 py-2 text-[12px] font-extrabold"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.84)",
          }}
        >
          Exit
        </button>
      </div>

      {/* DESCENT */}
      {phase === "descent" && (
        <div className="mt-6">
          <h2 className="text-xl font-extrabold">VERTICAL TRANSFER</h2>
          <p className="mt-3 text-sm text-white/70">
            The lift ascends through stacked corridors. Signal latency increases.  
            Your prior classification ({ep1?.profile?.archetype ?? "UNKNOWN"}) is carried forward.
          </p>
          <button
            onClick={() => setPhase("input")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(90deg, rgba(56,189,248,0.90), rgba(168,85,247,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* INPUT */}
      {phase === "input" && (
        <div className="mt-6">
          <h2 className="text-xl font-extrabold">ASSIGN DESIGNATION</h2>
          <p className="mt-2 text-sm text-white/60">
            7 characters. Alphanumeric. Permanent.
          </p>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            className="mt-4 w-full rounded-xl border p-3 bg-black/40 font-mono tracking-widest text-center"
            style={{ borderColor: "rgba(255,255,255,0.14)" }}
          />

          {error && (
            <div className="mt-2 text-xs font-mono text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={commit}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(90deg, rgba(168,85,247,0.90), rgba(56,189,248,0.84))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Confirm
          </button>
        </div>
      )}

      {/* BINDING */}
      {phase === "binding" && (
        <div className="mt-10 text-center">
          <p className="font-mono text-white/80 tracking-widest">
            IDENTITY LOCKED
          </p>
        </div>
      )}

      {/* APPROACH */}
      {phase === "approach" && (
        <div className="mt-6">
          <p className="text-sm text-white/70">
            Surface access pending.  
            Designation registered. Routing stabilized.
          </p>

          <button
            onClick={onExit}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Return to hub
          </button>
        </div>
      )}
    </section>
  );
}
