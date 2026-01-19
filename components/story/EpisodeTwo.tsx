"use client";

import { useEffect, useMemo, useState } from "react";

const EP1_KEY = "basebots_story_save_v1";
const EP2_KEY = "basebots_ep2_designation_v1";

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile: { archetype: string };
};

type Ep2Save = {
  designation: string;
  lockedAt: number;
};

type Phase = "descent" | "input" | "binding" | "approach";

function loadEp1(): Ep1Save | null {
  try {
    const raw = localStorage.getItem(EP1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function EpisodeTwo({ onExit }: { onExit: () => void }) {
  const ep1 = useMemo(() => loadEp1(), []);
  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(v: string) {
    if (!/^[A-Z0-9]*$/.test(v)) return "FORMAT ERROR";
    if (v.length > 7) return "INPUT TRUNCATED";
    if (v.length < 7) return "LENGTH MISMATCH";
    return null;
  }

  function commit() {
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }

    const save: Ep2Save = { designation: value, lockedAt: Date.now() };
    localStorage.setItem(EP2_KEY, JSON.stringify(save));
    setPhase("binding");
    setTimeout(() => setPhase("approach"), 1200);
  }

  return (
    <section className="rounded-3xl border p-6 text-white bg-[#020617]">
      {phase === "descent" && (
        <>
          <h2 className="text-xl font-extrabold">VERTICAL TRANSFER</h2>
          <p className="mt-3 text-sm text-white/70">
            The lift moves upward. Routing integrity is uncertain.
          </p>
          <button className="mt-6 px-4 py-2 rounded-full border" onClick={() => setPhase("input")}>
            Continue
          </button>
        </>
      )}

      {phase === "input" && (
        <>
          <h2 className="text-xl font-extrabold">ASSIGN DESIGNATION</h2>
          <p className="mt-2 text-sm text-white/60">7 characters. Alphanumeric.</p>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            className="mt-4 w-full bg-black/40 border p-3 font-mono tracking-widest text-center"
          />

          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}

          <button className="mt-6 px-4 py-2 rounded-full border" onClick={commit}>
            Confirm
          </button>
        </>
      )}

      {phase === "binding" && (
        <div className="text-center">
          <p className="font-mono text-white/80">IDENTITY LOCKED</p>
        </div>
      )}

      {phase === "approach" && (
        <>
          <p className="text-sm text-white/70">
            Surface access pending.
          </p>
          <button className="mt-6 px-4 py-2 rounded-full border" onClick={onExit}>
            Return
          </button>
        </>
      )}
    </section>
  );
}
