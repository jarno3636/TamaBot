"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage keys (cosmetic only)
 * ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const BONUS_KEY = "basebots_bonus_echo_unlocked";
const SOUND_KEY = "basebots_ep3_sound";

/* ────────────────────────────────────────────── */

type Phase =
  | "intro"
  | "context"
  | "contradiction"
  | "signal"
  | "synthesis"
  | "lock";

type Ep3State = {
  contradictionChoice?: "RESOLVE" | "PRESERVE";
  signalChoice?: "FILTER" | "LISTEN";
};

/* ──────────────────────────────────────────────
 * Local helpers (non-authoritative)
 * ────────────────────────────────────────────── */

function loadState(): Ep3State {
  try {
    return JSON.parse(localStorage.getItem(EP3_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveState(patch: Partial<Ep3State>) {
  const cur = loadState();
  localStorage.setItem(EP3_STATE_KEY, JSON.stringify({ ...cur, ...patch }));
}

/* ────────────────────────────────────────────── */

export default function EpisodeThree({
  tokenId,
  onExit,
}: {
  tokenId: bigint;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [glitch, setGlitch] = useState(0);
  const [showEcho, setShowEcho] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    !!address && !!walletClient && !!publicClient && !!tokenId && isBase;

  /* ───────── read on-chain state ───────── */
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

        if (state?.ep3Set) {
          setAlreadySet(true);
          setPhase("lock");
        }
      } catch {
        // silent
      }
    })();
  }, [tokenId, publicClient]);

  /* ───────── ambient glitch ───────── */
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.88) setGlitch(Math.random());
    }, 700);
    return () => clearInterval(t);
  }, []);

  /* ───────── echo popup ───────── */
  useEffect(() => {
    if (localStorage.getItem(BONUS_KEY)) return;

    const delay = 2500 + Math.random() * 3000;
    const t = setTimeout(() => {
      setShowEcho(true);
      setTimeout(() => setShowEcho(false), 2200);
    }, delay);

    return () => clearTimeout(t);
  }, []);

  function acknowledgeEcho() {
    localStorage.setItem(BONUS_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setShowEcho(false);
  }

  /* ───────── sound ───────── */
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/audio/s3.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    if (soundOn) audio.play().catch(() => {});
    return () => audio.pause();
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundOn) {
      a.pause();
      a.currentTime = 0;
      return;
    }
    a.play().catch(() => {});
  }, [soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  }

  /* ───────── commit cognition (ON-CHAIN) ───────── */
  async function finalize() {
    if (alreadySet || submitting) return;
    if (!ready) return;

    const s = loadState();

    let cognition: "DETERMINISTIC" | "ARCHIVAL" | "PRAGMATIC" | "PARANOID" =
      "PRAGMATIC";

    if (s.contradictionChoice === "RESOLVE" && s.signalChoice === "FILTER")
      cognition = "DETERMINISTIC";
    if (s.contradictionChoice === "PRESERVE" && s.signalChoice === "LISTEN")
      cognition = "ARCHIVAL";
    if (s.contradictionChoice === "PRESERVE" && s.signalChoice === "FILTER")
      cognition = "PARANOID";

    setSubmitting(true);

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode3Cognition",
        args: [tokenId, cognition],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  /* ──────────────────────────────────────────────
   * RENDER (VISUALS UNCHANGED)
   * ────────────────────────────────────────────── */

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(900px 400px at 50% -10%, rgba(168,85,247,0.08), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.82))",
        boxShadow: "0 60px 200px rgba(0,0,0,0.9)",
      }}
    >
      {/* scanlines */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.08,
        }}
      />

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={toggleSound} style={{ fontSize: 11 }}>
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} style={{ fontSize: 11 }}>
          Exit
        </button>
      </div>

      {/* echo */}
      {showEcho && (
        <button
          onClick={acknowledgeEcho}
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            maxWidth: 220,
            fontSize: 10,
            fontFamily: "monospace",
            opacity: 0.85,
          }}
        >
          ▒▒ you were not designed to notice this ▒▒
        </button>
      )}

      {/* PHASES (unchanged text & flow) */}
      {phase === "intro" && (
        <>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1,
              textShadow:
                glitch > 0
                  ? "2px 0 rgba(168,85,247,0.7), -2px 0 rgba(56,189,248,0.7)"
                  : "none",
            }}
          >
            FAULT LINES
          </h2>

          <p style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>
            Something above you has begun to pay attention.
          </p>

          <button onClick={() => setPhase("context")} style={{ marginTop: 20 }}>
            Continue
          </button>
        </>
      )}

      {phase === "context" && (
        <>
          <p>Contradiction is not tolerated.</p>
          <button onClick={() => setPhase("contradiction")}>Proceed</button>
        </>
      )}

      {phase === "contradiction" && (
        <>
          <button
            onClick={() => {
              saveState({ contradictionChoice: "RESOLVE" });
              setPhase("signal");
            }}
          >
            Collapse to a single truth
          </button>

          <button
            onClick={() => {
              saveState({ contradictionChoice: "PRESERVE" });
              setPhase("signal");
            }}
          >
            Retain competing realities
          </button>
        </>
      )}

      {phase === "signal" && (
        <>
          <button
            onClick={() => {
              saveState({ signalChoice: "FILTER" });
              setPhase("synthesis");
            }}
          >
            Suppress foreign context
          </button>

          <button
            onClick={() => {
              saveState({ signalChoice: "LISTEN" });
              setPhase("synthesis");
            }}
          >
            Ingest fragments despite risk
          </button>
        </>
      )}

      {phase === "synthesis" && (
        <>
          <button onClick={finalize} disabled={submitting}>
            {submitting ? "COMMITTING…" : "Commit cognition"}
          </button>
        </>
      )}

      {phase === "lock" && (
        <>
          <p>COGNITIVE FRAME SET</p>
          <button onClick={onExit}>Return to hub</button>
        </>
      )}
    </section>
  );
}
