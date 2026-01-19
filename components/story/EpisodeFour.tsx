"use client";

import { useState } from "react";

const EP4_KEY = "basebots_ep4_profile_v1";

type Phase = "hold" | "choice" | "lock";

export default function EpisodeFour({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("hold");

  function commit(profileBias: string) {
    localStorage.setItem(
      EP4_KEY,
      JSON.stringify({ bias: profileBias, at: Date.now() })
    );
    setPhase("lock");
  }

  return (
    <section className="rounded-3xl border p-6 bg-[#020617] text-white">
      {phase === "hold" && (
        <>
          <h2 className="text-xl font-extrabold">THRESHOLD</h2>
          <p className="mt-3 text-sm text-white/70">
            Pre-surface alignment required. Multiple directives detected.
          </p>
          <button className="mt-6 px-4 py-2 rounded-full border" onClick={() => setPhase("choice")}>
            Continue
          </button>
        </>
      )}

      {phase === "choice" && (
        <>
          <p className="text-sm text-white/70">
            Select directive priority.
          </p>
          <div className="mt-4 space-y-2">
            <button onClick={() => commit("ALIGN")} className="block w-full border px-4 py-2 rounded">
              Align with Core
            </button>
            <button onClick={() => commit("ADAPT")} className="block w-full border px-4 py-2 rounded">
              Adapt to variance
            </button>
            <button onClick={() => commit("WITHDRAW")} className="block w-full border px-4 py-2 rounded">
              Withdraw internally
            </button>
          </div>
        </>
      )}

      {phase === "lock" && (
        <>
          <p className="font-mono text-sm text-white/80">
            PROFILE ASSIGNED
          </p>
          <button className="mt-6 px-4 py-2 rounded-full border" onClick={onExit}>
            Return
          </button>
        </>
      )}
    </section>
  );
}
