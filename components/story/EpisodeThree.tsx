"use client";

import { useState } from "react";

const EP3_KEY = "basebots_ep3_state_v1";

type Phase = "intro" | "contradiction" | "signal" | "end";

export default function EpisodeThree({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");

  function save(choice: string) {
    localStorage.setItem(
      EP3_KEY,
      JSON.stringify({ choice, at: Date.now() })
    );
  }

  return (
    <section className="rounded-3xl border p-6 bg-[#020617] text-white">
      {phase === "intro" && (
        <>
          <h2 className="text-xl font-extrabold">FAULT LINES</h2>
          <p className="mt-3 text-sm text-white/70">
            Conflicting records surface. Both are valid. Neither yields.
          </p>
          <button className="mt-6 px-4 py-2 rounded-full border" onClick={() => setPhase("contradiction")}>
            Continue
          </button>
        </>
      )}

      {phase === "contradiction" && (
        <>
          <p className="text-sm text-white/70">
            Two deployment logs disagree. The system requests resolution.
          </p>
          <div className="mt-4 space-y-2">
            <button onClick={() => { save("RESOLVE"); setPhase("signal"); }} className="block w-full border px-4 py-2 rounded">
              Resolve contradiction
            </button>
            <button onClick={() => { save("PRESERVE"); setPhase("signal"); }} className="block w-full border px-4 py-2 rounded">
              Preserve both records
            </button>
          </div>
        </>
      )}

      {phase === "signal" && (
        <>
          <p className="text-sm text-white/70">
            External traffic bleeds through suppression filters.
          </p>
          <div className="mt-4 space-y-2">
            <button onClick={() => { save("FILTER"); setPhase("end"); }} className="block w-full border px-4 py-2 rounded">
              Allow suppression
            </button>
            <button onClick={() => { save("LISTEN"); setPhase("end"); }} className="block w-full border px-4 py-2 rounded">
              Record fragments
            </button>
          </div>
        </>
      )}

      {phase === "end" && (
        <>
          <p className="text-sm text-white/70">
            Memory state updated. Ascent continues.
          </p>
          <button className="mt-6 px-4 py-2 rounded-full border" onClick={onExit}>
            Return
          </button>
        </>
      )}
    </section>
  );
}
