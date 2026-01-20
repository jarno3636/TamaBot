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
  if (v.length !== 7) return "DESIGNATION MUST BE 7 CHARACTERS";
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
  const [soundEnabled, setSoundEnabled] = useState(() => {
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
    a.volume = 0.6;
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundEnabled) {
      a.pause();
      a.currentTime = 0;
      return;
    }
    a.play().catch(() => {});
  }, [soundEnabled]);

  function toggleSound() {
    setSoundEnabled((s) => {
      const next = !s;
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
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

    // ✅ LEGACY WRITE
    localStorage.setItem(EP2_KEY, JSON.stringify(save));
    localStorage.setItem(EP2_DONE_KEY, "true");

    // ✅ FORCE HUB SYNC
    window.dispatchEvent(new Event("basebots-progress-updated"));

    setPhase("binding");
    setTimeout(() => setPhase("approach"), 1400);
  }

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
        <button onClick={toggleSound} className="rounded-full border px-4 py-2 text-xs">
          SOUND: {soundEnabled ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} className="rounded-full border px-4 py-2 text-xs">
          Exit
        </button>
      </div>

      {/* DESCENT */}
      {phase === "descent" && (
        <div className="mt-6">
          <h2 className="text-xl font-extrabold">VERTICAL TRANSFER</h2>
          <p className="mt-3 text-sm text-white/70">
            The lift rises through stacked infrastructure.  
            Your prior classification ({ep1?.profile?.archetype ?? "UNKNOWN"}) propagates ahead of you.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Systems above request a stable designation.
          </p>
          <button
            onClick={() => setPhase("input")}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold"
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
            Seven characters. Alphanumeric. Permanent.
          </p>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            className="mt-4 w-full rounded-xl border p-3 bg-black/40 font-mono tracking-widest text-center"
          />

          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}

          <button
            onClick={commit}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold"
          >
            Confirm Designation
          </button>
        </div>
      )}

      {/* BINDING */}
      {phase === "binding" && (
        <div className="mt-10 text-center font-mono tracking-widest text-white/80">
          IDENTITY LOCKED
        </div>
      )}

      {/* APPROACH */}
      {phase === "approach" && (
        <div className="mt-6">
          <p className="text-sm text-white/70">
            Designation accepted.  
            Conflicting acknowledgements detected upstream.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Fault conditions registered.
          </p>
          <button
            onClick={onExit}
            className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold"
          >
            Return to hub
          </button>
        </div>
      )}
    </section>
  );
}
