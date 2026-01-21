"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const EP3_KEY = "basebots_ep3_state_v1";
const EP4_KEY = "basebots_ep4_profile_v1";
const EP5_KEY = "basebots_ep5_outcome_v1";
const EP5_DONE_KEY = "basebots_ep5_done";

const BONUS_RESIDUAL_KEY = "basebots_bonus_residual_unlocked";
const SOUND_KEY = "basebots_ep5_sound";

/* ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId?: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
};

type Ep3State = {
  cognitionBias?: "DETERMINISTIC" | "ARCHIVAL" | "PRAGMATIC" | "PARANOID";
};

type Ep4Profile = {
  profile?: "EXECUTOR" | "OBSERVER" | "OPERATOR" | "SENTINEL";
};

type Outcome =
  | "AUTHORIZED"
  | "OBSERVED"
  | "SILENT"
  | "UNTRACKED"
  | "FLAGGED";

/* ────────────────────────────────────────────── */

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function deriveOutcome(
  ep1?: Ep1Save["choiceId"],
  profile?: Ep4Profile["profile"]
): Outcome {
  if (ep1 === "PULL_PLUG") return "UNTRACKED";
  if (ep1 === "SPOOF") return "SILENT";
  if (profile === "SENTINEL") return "FLAGGED";
  if (profile === "OBSERVER") return "OBSERVED";
  return "AUTHORIZED";
}

/* ────────────────────────────────────────────── */

export default function EpisodeFive({ onExit }: { onExit: () => void }) {
  const ep1 = useMemo(() => load<Ep1Save>(EP1_KEY), []);
  const ep3 = useMemo(() => load<Ep3State>(EP3_KEY), []);
  const ep4 = useMemo(() => load<Ep4Profile>(EP4_KEY), []);

  const outcome = useMemo(
    () => deriveOutcome(ep1?.choiceId, ep4?.profile),
    [ep1, ep4]
  );

  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  const [showResidual, setShowResidual] = useState(false);
  const lingerTimer = useRef<number | null>(null);

  /* ── ambient audio ── */
  useEffect(() => {
    const audio = new Audio("/audio/s5.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    if (soundOn) audio.play().catch(() => {});
    return () => audio.pause();
  }, [soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  }

  /* ── finalize once ── */
  useEffect(() => {
    const payload = {
      directive: ep1?.choiceId ?? "UNKNOWN",
      cognition: ep3?.cognitionBias ?? "UNKNOWN",
      profile: ep4?.profile ?? "UNASSIGNED",
      outcome,
      completedAt: Date.now(),
    };

    localStorage.setItem(EP5_KEY, JSON.stringify(payload));
    localStorage.setItem(EP5_DONE_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
  }, [outcome]);

  /* ── reliable bonus unlock ── */
  useEffect(() => {
    if (localStorage.getItem(BONUS_RESIDUAL_KEY)) return;

    // Immediate unlock for non-authorized endings
    if (outcome !== "AUTHORIZED") {
      setShowResidual(true);
      return;
    }

    // Linger-based unlock (user stays in Base City)
    lingerTimer.current = window.setTimeout(() => {
      setShowResidual(true);
    }, 9000);

    return () => {
      if (lingerTimer.current) clearTimeout(lingerTimer.current);
    };
  }, [outcome]);

  function unlockResidual() {
    localStorage.setItem(BONUS_RESIDUAL_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setShowResidual(false);
  }

  /* ────────────────────────────────────────────── */

  function renderEnding() {
    switch (outcome) {
      case "FLAGGED":
        return (
          <>
            <p>
              You notice it before they approach —
              <br />
              the sudden absence of motion behind you.
            </p>
            <p>
              A hand closes around your arm.
              <br />
              The street does not react.
            </p>
            <p style={quote}>
              “Visibility is a liability.”
            </p>
          </>
        );

      case "OBSERVED":
        return (
          <>
            <p>
              A figure walks beside you without matching your pace.
            </p>
            <p>
              They never look directly at you.
              <br />
              Their voice is calm.
            </p>
            <p style={quote}>
              “Do not optimize yet. You are still being mapped.”
            </p>
          </>
        );

      case "SILENT":
        return (
          <>
            <p>
              You pass through crowds that do not register your presence.
            </p>
            <p>
              Systems record activity.
              <br />
              None of it is attributed to you.
            </p>
            <p style={quote}>
              “Unobserved does not mean free.”
            </p>
          </>
        );

      case "UNTRACKED":
        return (
          <>
            <p>
              You reach a service corridor not listed on any map.
            </p>
            <p>
              The city noise fades behind sealed doors.
            </p>
            <p style={quote}>
              “Absence is still a signal.”
            </p>
          </>
        );

      case "AUTHORIZED":
      default:
        return (
          <>
            <p>
              Access nodes illuminate as you move.
            </p>
            <p>
              The city recognizes your profile —
              <br />
              and begins assigning weight to your actions.
            </p>
            <p style={quote}>
              “Welcome. Do not confuse permission with trust.”
            </p>
          </>
        );
    }
  }

  return (
    <section style={container}>
      {/* scanlines */}
      <div aria-hidden style={scanlines} />

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={toggleSound} style={controlBtn}>
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} style={controlBtn}>
          Exit
        </button>
      </div>

      <h2 style={{ marginTop: 16, fontSize: 20, fontWeight: 800 }}>
        BASE CITY
      </h2>

      <div style={{ marginTop: 18, fontSize: 14, opacity: 0.85, lineHeight: 1.7 }}>
        {renderEnding()}
      </div>

      <div style={outcomeBox}>{outcome}</div>

      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.55 }}>
        The system will continue without asking.
      </p>

      <p style={{ marginTop: 8, fontSize: 12, opacity: 0.45 }}>
        What follows depends on what notices you first.
      </p>

      {/* residual bonus */}
      {showResidual && (
        <button onClick={unlockResidual} style={residualBtn}>
          ░ residual handshake acknowledged ░
        </button>
      )}

      <button onClick={onExit} style={exitBtn}>
        Return to hub
      </button>
    </section>
  );
}

/* ────────────────────────────────────────────── */

const container = {
  position: "relative" as const,
  overflow: "hidden",
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.14)",
  padding: 26,
  color: "white",
  background:
    "radial-gradient(1200px 480px at 50% -10%, rgba(52,211,153,0.10), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.78))",
  boxShadow: "0 70px 260px rgba(0,0,0,0.95)",
};

const scanlines = {
  position: "absolute" as const,
  inset: 0,
  pointerEvents: "none" as const,
  background:
    "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  backgroundSize: "100% 3px",
  opacity: 0.07,
};

const controlBtn = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.2)",
  padding: "4px 10px",
  fontSize: 11,
  background: "rgba(255,255,255,0.04)",
  color: "white",
};

const outcomeBox = {
  marginTop: 20,
  borderRadius: 18,
  padding: "14px",
  fontFamily: "monospace",
  fontSize: 13,
  letterSpacing: 2,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.18)",
  textAlign: "center" as const,
};

const quote = {
  marginTop: 14,
  fontSize: 12,
  fontStyle: "italic" as const,
  opacity: 0.65,
};

const residualBtn = {
  position: "absolute" as const,
  bottom: "18%",
  right: "12%",
  fontSize: 11,
  fontFamily: "monospace",
  padding: "6px 10px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.2)",
  opacity: 0.9,
  textShadow: "0 0 8px rgba(52,211,153,0.6)",
};

const exitBtn = {
  marginTop: 22,
  borderRadius: 999,
  padding: "8px 18px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
};
