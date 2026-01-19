"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────────────────────
 * Bonus Prologue — “SILENCE IN DARKNESS”
 *
 * Drop-in component. Intended to be unlocked when UNLOCK_KEY changes.
 * Story purpose:
 *  - Origin context: what Basebots are / where they come from
 *  - Hint about the city + Subnet-12
 *  - Sets a secret “artifact” / codeword for future episodes (optional)
 * ────────────────────────────────────────────────────────────── */

/**
 * Use the same key EpisodeOne writes to when toggling sound.
 * Main page can listen for this to unlock the prologue entrypoint.
 */
const UNLOCK_KEY = "basebots_bonus_unlock";

/** Optional: remember if user finished the prologue */
const PROLOGUE_KEY = "basebots_bonus_prologue_v1";

/** Optional: tiny breadcrumb for later episodes */
const PROLOGUE_HINT_KEY = "basebots_bonus_hint_v1";

type Phase = "locked" | "start" | "bay" | "boot" | "handoff" | "city" | "end";

function cardShell() {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
    boxShadow: "0 26px 110px rgba(0,0,0,0.65)",
  } as const;
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
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
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

/** optional breadcrumb for future episodes */
function writeHint(h: { code: string; city: string; subnet: string }) {
  try {
    localStorage.setItem(PROLOGUE_HINT_KEY, JSON.stringify({ ...h, at: Date.now() }));
  } catch {}
}

export default function PrologueSilenceInDarkness({
  onExit,
}: {
  onExit: () => void;
}) {
  const initialUnlocked = useMemo(() => loadUnlocked(), []);
  const initialDone = useMemo(() => loadPrologueComplete(), []);

  const [unlocked, setUnlocked] = useState<boolean>(initialUnlocked);
  const [done, setDone] = useState<boolean>(initialDone);

  const [phase, setPhase] = useState<Phase>(() => {
    if (!initialUnlocked) return "locked";
    return initialDone ? "end" : "start";
  });

  // Listen for unlock “ping” written by EpisodeOne sound toggle
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === UNLOCK_KEY) {
        setUnlocked(true);
        if (phase === "locked") setPhase(done ? "end" : "start");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, done]);

  const images = {
    locked: { src: "/story/bonus/prologue/00-locked.webp", alt: "Locked file" },
    start: { src: "/story/bonus/prologue/01-silence.webp", alt: "Silence in darkness" },
    bay: { src: "/story/bonus/prologue/02-bay.webp", alt: "Assembly bay" },
    boot: { src: "/story/bonus/prologue/03-boot.webp", alt: "First boot" },
    handoff: { src: "/story/bonus/prologue/04-handoff.webp", alt: "Handoff" },
    city: { src: "/story/bonus/prologue/05-city.webp", alt: "City hint" },
    end: { src: "/story/bonus/prologue/06-end.webp", alt: "Archive updated" },
  } as const;

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-5 md:p-7"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.94), rgba(2,6,23,0.70))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.78)",
      }}
    >
      <div className="flex items-center justify-end gap-2">
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

      {/* LOCKED */}
      {phase === "locked" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.locked} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">BONUS FILE</h2>
            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>The archive entry exists… but it’s sealed.</p>
              <p>There’s no “unlock” button. No prompt.</p>
              <p className="text-white/80 font-semibold">
                It only opens when a signal key is written during Episode One.
              </p>
              <p className="text-white/60 text-[12px]">
                Tip: Toggle SOUND in Episode One to unlock this file.
              </p>
            </div>

            <button
              type="button"
              onClick={onExit}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.86)",
              }}
            >
              Return
            </button>
          </div>
        </div>
      )}

      {/* START */}
      {phase === "start" && unlocked && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.start} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">
              SILENCE IN DARKNESS
            </h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>No cameras. No applause. No warm lights.</p>
              <p>Just a sealed crate and the soft hiss of nitrogen bleeding off an old gasket.</p>
              <p>Your Basebot doesn’t “wake” the way people imagine—there is no greeting, no personality.</p>
              <p className="text-white/80 font-semibold">
                There is only power returning, and a checklist that assumes it belongs to someone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("bay")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(90deg, rgba(56,189,248,0.90), rgba(168,85,247,0.70))",
                color: "rgba(2,6,23,0.98)",
                boxShadow: "0 16px 60px rgba(56,189,248,0.14)",
              }}
            >
              Open the record
            </button>
          </div>
        </div>
      )}

      {/* BAY */}
      {phase === "bay" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.bay} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">ASSEMBLY BAY 7</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>A wide room with too many shadows and not enough people.</p>
              <p>Work benches. Tool heads. A rail system that moves crates without ever showing who asked.</p>
              <p>Every Basebot arrives the same way: unclaimed, unmarked—built to be assigned later.</p>
              <p className="text-white/80 font-semibold">
                The workers don’t name them. The paperwork does.
              </p>
              <p>
                A tech slides a thin tag into the badge slot: <span className="font-mono text-white/80">UNIT: BSB-041</span>.
                The tag is blank where an operator ID should be.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("boot")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.86)",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* BOOT */}
      {phase === "boot" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.boot} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">FIRST BOOT</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>Power cycles. Diagnostics begin. The optics open like shutters.</p>
              <p>Not curiosity—calibration.</p>
              <p>A speaker clicks once, then stays silent. Audio channels are present but muted by default.</p>
              <p className="text-white/80 font-semibold">
                The factory doesn’t ship personalities. It ships compliance surfaces.
              </p>
              <p>
                A line prints on a test panel and immediately fades away—like ink pulled back into the paper:
              </p>
              <p className="font-mono text-white/80">ROUTING: SUBNET-12 • CITY EDGE • RELAY PERMITTED</p>
              <p className="text-white/80 font-semibold">
                SUBNET-12 again. The same signature you saw after the audit—only older here, embedded in manufacturing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("handoff")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(90deg, rgba(251,191,36,0.92), rgba(244,63,94,0.70))",
                color: "rgba(2,6,23,0.98)",
                boxShadow: "0 16px 60px rgba(251,191,36,0.10)",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* HANDOFF */}
      {phase === "handoff" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.handoff} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">THE HANDOFF</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>A forklift moves the crate. A manifest updates itself.</p>
              <p>There is no human signature—only a checksum stamped where a name should be.</p>
              <p className="text-white/80 font-semibold">
                The Basebot is “delivered” without ever being owned.
              </p>
              <p>
                A tech whispers to another one—not about the bot, about the route:
              </p>
              <p className="text-white/72">
                “If it’s City Edge, that’s not logistics. That’s collection.”
              </p>
              <p>
                The other tech doesn’t answer. He just tapes over the badge slot like covering a mouth.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("city")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.86)",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* CITY HINT */}
      {phase === "city" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.city} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">CITY EDGE</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>The crate rides for hours. No bumps. No traffic noise.</p>
              <p>When it stops, you hear rain—not droplets, a constant curtain against metal.</p>
              <p>Through a seam in the crate, a skyline appears for a moment: towers with black windows, lit only by vertical signage.</p>
              <p className="text-white/80 font-semibold">
                The signs don’t show ads. They show directions—like the city is a circuit board.
              </p>
              <p>
                On a far tower, a single symbol repeats: a twelve-stroke mark that looks like a crown without a head.
              </p>
              <p className="font-mono text-white/80">
                SUBNET-12
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPhase("end")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(90deg, rgba(168,85,247,0.90), rgba(56,189,248,0.84))",
                color: "rgba(2,6,23,0.98)",
                boxShadow: "0 16px 60px rgba(168,85,247,0.12)",
              }}
            >
              Archive this
            </button>
          </div>
        </div>
      )}

      {/* END */}
      {phase === "end" && (
        <div className="mt-6 grid gap-5">
          <SceneImage {...images.end} />

          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-white/95">ARCHIVE UPDATED</h2>

            <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/72">
              <p>This file was never meant to be found from inside the room.</p>
              <p>It exists to explain what the audit gate won’t:</p>
              <p className="text-white/80 font-semibold">
                Basebots are manufactured for assignment… but Subnet-12 routes unassigned units to the City Edge anyway.
              </p>
              <p>One last line appears—then fades out like it’s being erased from the display:</p>
              <p className="font-mono text-white/80">CODEWORD: CROWN-12</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // mark completion + write hint breadcrumb for later episodes
                  markPrologueComplete();
                  setDone(true);
                  writeHint({ code: "CROWN-12", city: "CITY EDGE", subnet: "SUBNET-12" });
                  onExit();
                }}
                className="rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                Return to hub
              </button>

              <button
                type="button"
                onClick={() => {
                  // stay here but mark complete
                  markPrologueComplete();
                  setDone(true);
                  writeHint({ code: "CROWN-12", city: "CITY EDGE", subnet: "SUBNET-12" });
                }}
                className="rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "linear-gradient(90deg, rgba(56,189,248,0.85), rgba(168,85,247,0.70))",
                  color: "rgba(2,6,23,0.98)",
                }}
              >
                Mark as read
              </button>
            </div>

            {done && (
              <div className="mt-4 text-[11px] text-white/55">
                Saved: <span className="font-mono text-white/70">CROWN-12</span> • <span className="font-mono text-white/70">SUBNET-12</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
