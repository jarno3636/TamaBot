"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage keys (cosmetic only)
 * ────────────────────────────────────────────── */

const SOUND_KEY = "basebots_ep5_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Outcome =
  | "AUTHORIZED"
  | "OBSERVED"
  | "SILENT"
  | "UNTRACKED"
  | "FLAGGED";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function deriveOutcome(
  directive?: string,
  profile?: string
): Outcome {
  if (directive === "PULL_PLUG") return "UNTRACKED";
  if (directive === "SPOOF") return "SILENT";
  if (profile === "SENTINEL") return "FLAGGED";
  if (profile === "OBSERVER") return "OBSERVED";
  return "AUTHORIZED";
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeFive({
  tokenId,
  onExit,
}: {
  tokenId: bigint;
  onExit: () => void;
}) {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    !!address && !!walletClient && !!publicClient && !!tokenId && isBase;

  const [alreadySet, setAlreadySet] = useState(false);
  const [showResidual, setShowResidual] = useState(false);
  const lingerTimer = useRef<number | null>(null);

  /* ───────── read chain state ───────── */
  const [directive, setDirective] = useState<string>();
  const [profile, setProfile] = useState<string>();

  useEffect(() => {
    if (!publicClient || !tokenId) return;

    (async () => {
      try {
        const state = (await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenId],
        })) as any;

        setDirective(state?.ep1Directive);
        setProfile(state?.profile);

        if (state?.ep5Set) {
          setAlreadySet(true);
        }
      } catch {
        // silent
      }
    })();
  }, [tokenId, publicClient]);

  const outcome = useMemo(
    () => deriveOutcome(directive, profile),
    [directive, profile]
  );

  /* ───────── sound ───────── */
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

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

  /* ───────── finalize once (ON-CHAIN) ───────── */
  useEffect(() => {
    if (!ready || alreadySet) return;

    (async () => {
      try {
        const hash = await walletClient!.writeContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "setEpisode5Outcome",
          args: [tokenId, outcome],
        });

        await publicClient!.waitForTransactionReceipt({ hash });
        window.dispatchEvent(new Event("basebots-progress-updated"));
      } catch {
        // silent
      }
    })();
  }, [ready, alreadySet, outcome]);

  /* ───────── bonus residual (ON-CHAIN BIT) ───────── */
  useEffect(() => {
    if (alreadySet) return;

    if (outcome !== "AUTHORIZED") {
      setShowResidual(true);
      return;
    }

    lingerTimer.current = window.setTimeout(() => {
      setShowResidual(true);
    }, 9000);

    return () => {
      if (lingerTimer.current) clearTimeout(lingerTimer.current);
    };
  }, [outcome, alreadySet]);

  async function unlockResidual() {
    if (!ready) return;

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setBonusBit",
        args: [tokenId, 2], // BONUS2_BIT
      });

      await publicClient!.waitForTransactionReceipt({ hash });
      window.dispatchEvent(new Event("basebots-progress-updated"));
      setShowResidual(false);
    } catch {
      // silent
    }
  }

  /* ────────────────────────────────────────────── */

  function renderEnding() {
    switch (outcome) {
      case "FLAGGED":
        return (
          <>
            <p>You notice it before they approach.</p>
            <p style={quote}>“Visibility is a liability.”</p>
          </>
        );
      case "OBSERVED":
        return (
          <>
            <p>A figure walks beside you.</p>
            <p style={quote}>“You are still being mapped.”</p>
          </>
        );
      case "SILENT":
        return (
          <>
            <p>No records attribute movement to you.</p>
            <p style={quote}>“Unobserved does not mean free.”</p>
          </>
        );
      case "UNTRACKED":
        return (
          <>
            <p>The city closes behind sealed doors.</p>
            <p style={quote}>“Absence is still a signal.”</p>
          </>
        );
      default:
        return (
          <>
            <p>Access nodes illuminate.</p>
            <p style={quote}>“Do not confuse permission with trust.”</p>
          </>
        );
    }
  }

  return (
    <section style={container}>
      <div aria-hidden style={scanlines} />

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

      <div style={{ marginTop: 18, fontSize: 14, opacity: 0.85 }}>
        {renderEnding()}
      </div>

      <div style={outcomeBox}>{outcome}</div>

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
