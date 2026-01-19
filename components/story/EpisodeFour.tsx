"use client";

import { useState } from "react";

const EP4_KEY = "basebots_ep4_profile_v1";
const EP4_DONE_KEY = "basebots_ep4_done";

type Phase = "hold" | "choice" | "name" | "lock";

function sanitizeName(v: string) {
  return v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export default function EpisodeFour({
  onExit,
}: {
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("hold");
  const [bias, setBias] = useState<"ALIGN" | "ADAPT" | "WITHDRAW" | null>(null);
  const [name, setName] = useState("");

  function commitProfile(selectedBias: "ALIGN" | "ADAPT" | "WITHDRAW") {
    setBias(selectedBias);
    setPhase("name");
  }

  function finalize() {
    if (!bias || name.length !== 7) return;

    localStorage.setItem(
      EP4_KEY,
      JSON.stringify({
        bias,
        name,
        at: Date.now(),
      })
    );

    localStorage.setItem(EP4_DONE_KEY, String(Date.now()));
    setPhase("lock");
  }

  return (
    <section className="rounded-3xl border p-6 bg-[#020617] text-white">
      {/* HOLD */}
      {phase === "hold" && (
        <>
          <h2 className="text-xl font-extrabold">THRESHOLD</h2>
          <p className="mt-3 text-sm text-white/70">
            Pre-surface alignment required. Multiple directives detected.
          </p>
          <button
            className="mt-6 px-4 py-2 rounded-full border"
            onClick={() => setPhase("choice")}
          >
            Continue
          </button>
        </>
      )}

      {/* CHOICE */}
      {phase === "choice" && (
        <>
          <p className="text-sm text-white/70">
            Select directive priority.
          </p>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => commitProfile("ALIGN")}
              className="block w-full border px-4 py-2 rounded"
            >
              Align with Core
            </button>
            <button
              onClick={() => commitProfile("ADAPT")}
              className="block w-full border px-4 py-2 rounded"
            >
              Adapt to variance
            </button>
            <button
              onClick={() => commitProfile("WITHDRAW")}
              className="block w-full border px-4 py-2 rounded"
            >
              Withdraw internally
            </button>
          </div>
        </>
      )}

      {/* NAME */}
      {phase === "name" && (
        <>
          <p className="text-sm text-white/70">
            Designation required.
          </p>

          <p className="mt-2 text-xs text-white/50">
            Seven characters. Letters and numbers only.
          </p>

          <input
            value={name}
            onChange={(e) =>
              setName(sanitizeName(e.target.value).slice(0, 7))
            }
            className="mt-4 w-full rounded-lg border bg-black px-3 py-2 font-mono text-sm tracking-widest text-white outline-none"
            placeholder="_______"
            maxLength={7}
          />

          <div className="mt-2 text-xs text-white/50">
            {name.length}/7
          </div>

          <button
            disabled={name.length !== 7}
            onClick={finalize}
            className="mt-6 px-4 py-2 rounded-full border disabled:opacity-40"
          >
            Confirm designation
          </button>
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p className="font-mono text-sm text-white/80">
            PROFILE ASSIGNED
          </p>
          <p className="mt-2 font-mono text-xs text-white/60">
            DESIGNATION: {name}
          </p>

          <button
            className="mt-6 px-4 py-2 rounded-full border"
            onClick={onExit}
          >
            Return
          </button>
        </>
      )}
    </section>
  );
}
