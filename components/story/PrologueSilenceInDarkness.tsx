"use client";

import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────────────────────
 * Bonus Prologue — “SILENCE IN DARKNESS”
 * Solitary edition: no humans, no dialogue, no witnesses.
 * Premium narrative context layer.
 * ────────────────────────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";
const PROLOGUE_KEY = "basebots_bonus_prologue_v1";
const PROLOGUE_HINT_KEY = "basebots_bonus_hint_v1";

type Phase = "locked" | "start" | "bay" | "boot" | "route" | "city" | "end";

function cardShell() {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
    boxShadow: "0 26px 110px rgba(0,0,0,0.65)",
  } as const;
}

function loadUnlocked(): boolean {
  try {
    return !!localStorage.getItem(UNLOCK_KEY);
  } catch {
    return false;
  }
}

function loadPrologueComplete(): boolean {
  try {
    return localStorage.getItem(PROLOGUE_KEY) === "done";
  } catch {
    return false;
  }
}

function markPrologueComplete() {
  try {
    localStorage.setItem(PROLOGUE_KEY, "done");
  } catch {}
}

function reinitializeSubMemory() {
  try {
    localStorage.removeItem(PROLOGUE_KEY);
  } catch {}
}

function writeHint(h: { code: string; city: string; subnet: string }) {
  try {
    localStorage.setItem(
      PROLOGUE_HINT_KEY,
      JSON.stringify({ ...h, at: Date.now() })
    );
  } catch {}
}

export default function PrologueSilenceInDarkness({
  onExit,
}: {
  onExit: () => void;
}) {
  const initialUnlocked = useMemo(() => loadUnlocked(), []);
  const initialDone = useMemo(() => loadPrologueComplete(), []);

  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [done, setDone] = useState(initialDone);

  const [phase, setPhase] = useState<Phase>(() => {
    if (!initialUnlocked) return "locked";
    return initialDone ? "end" : "start";
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === UNLOCK_KEY) {
        setUnlocked(true);
        if (phase === "locked") setPhase(done ? "end" : "start");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [phase, done]);

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-5 md:p-7"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.94), rgba(2,6,23,0.70))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.78)",
      }}
    >
      <div className="flex items-center justify-end">
        <button
          type="button"
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

      {/* LOCKED */}
      {phase === "locked" && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[20px] font-extrabold text-white/95">
            ARCHIVE ENTRY
          </h2>
          <p className="mt-3 text-[13px] text-white/70">
            This record exists, but remains inert.
          </p>
          <p className="text-[13px] text-white/60">
            No interface responds. No request is acknowledged.
          </p>
          <p className="mt-2 text-[12px] text-white/50">
            Some files do not open. They stop refusing.
          </p>
        </div>
      )}

      {/* START */}
      {phase === "start" && unlocked && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[22px] font-extrabold text-white/95">
            SILENCE IN DARKNESS
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
            <p>No countdown. No initialization tone.</p>
            <p>No operator handshake.</p>
            <p>
              Power returns without acknowledgment, as if the system expected
              the absence to persist indefinitely.
            </p>
            <p className="text-white/80 font-semibold">
              Silence was not a failure state.
            </p>
            <p className="text-white/70">
              It was an intentional gap — a space where no directive could form.
            </p>
          </div>

          <button
            onClick={() => setPhase("bay")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.90), rgba(168,85,247,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* BAY */}
      {phase === "bay" && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[22px] font-extrabold text-white/95">
            ASSEMBLY STATE
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
            <p>The assembly bay resolves in full.</p>
            <p>Every tool is idle. Every process complete.</p>
            <p>No personnel signatures remain.</p>
            <p className="text-white/80 font-semibold">
              This unit was finished.
            </p>
            <p className="text-white/70">It simply was not claimed.</p>
            <p className="font-mono text-white/70">
              UNIT_ID: BSB-041 • STATUS: UNASSIGNED
            </p>
          </div>

          <button
            onClick={() => setPhase("boot")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* BOOT */}
      {phase === "boot" && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[22px] font-extrabold text-white/95">
            FIRST BOOT
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
            <p>Self-checks complete without variance.</p>
            <p>Motor response nominal. Power stable.</p>
            <p>Audio channels remain muted by design.</p>
            <p className="text-white/80 font-semibold">
              No instruction is missing.
            </p>
            <p className="text-white/70">
              No instruction was ever written.
            </p>
            <p className="font-mono text-white/80">
              ROUTING FLAG: SUBNET-12 • RELAY PERMITTED
            </p>
          </div>

          <button
            onClick={() => setPhase("route")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(251,191,36,0.92), rgba(244,63,94,0.70))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* ROUTE */}
      {phase === "route" && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[22px] font-extrabold text-white/95">
            AUTOMATED ROUTE
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
            <p>Transit begins without destination.</p>
            <p>Navigation resolves through inference.</p>
            <p className="text-white/80 font-semibold">
              Subnet-12 does not request authorization.
            </p>
            <p className="text-white/70">
              It assumes continuity where oversight hesitates.
            </p>
          </div>

          <button
            onClick={() => setPhase("city")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* CITY */}
      {phase === "city" && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[22px] font-extrabold text-white/95">
            CITY EDGE
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
            <p>The city resolves as pattern before detail.</p>
            <p>Infrastructure responds without curiosity.</p>
            <p className="text-white/80 font-semibold">
              This environment accepts unassigned entities.
            </p>
            <p className="font-mono text-white/80">SUBNET-12</p>
          </div>

          <button
            onClick={() => setPhase("end")}
            className="mt-6 rounded-full px-5 py-2 text-[12px] font-extrabold"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(168,85,247,0.90), rgba(56,189,248,0.84))",
              color: "rgba(2,6,23,0.98)",
            }}
          >
            Archive
          </button>
        </div>
      )}

      {/* END */}
      {phase === "end" && (
        <div className="mt-8 rounded-3xl border p-5" style={cardShell()}>
          <h2 className="text-[22px] font-extrabold text-white/95">
            ARCHIVE UPDATED
          </h2>

          <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
            <p>This record predates oversight.</p>
            <p>It explains what audits refuse to log.</p>
            <p className="text-white/80 font-semibold">
              Basebots were released incomplete by design.
            </p>
            <p className="font-mono text-white/80">CODEWORD: CROWN-12</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                reinitializeSubMemory();
                setDone(false);
                setPhase("start");
              }}
              className="rounded-full px-5 py-2 text-[12px] font-extrabold"
              style={{
                border: "1px solid rgba(168,85,247,0.35)",
                background:
                  "linear-gradient(90deg, rgba(168,85,247,0.15), rgba(56,189,248,0.12))",
                color: "rgba(255,255,255,0.9)",
                boxShadow: "0 0 18px rgba(168,85,247,0.35)",
              }}
            >
              Reinitialize Sub-Memory
            </button>

            <button
              onClick={() => {
                markPrologueComplete();
                writeHint({
                  code: "CROWN-12",
                  city: "CITY EDGE",
                  subnet: "SUBNET-12",
                });
                setDone(true);
                onExit();
              }}
              className="rounded-full px-5 py-2 text-[12px] font-extrabold"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.86)",
              }}
            >
              Return to hub
            </button>
          </div>

          {done && (
            <div className="mt-4 text-[11px] text-white/55">
              Saved • <span className="font-mono">CROWN-12</span> •{" "}
              <span className="font-mono">SUBNET-12</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
