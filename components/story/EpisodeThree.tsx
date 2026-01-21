"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage
 * ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const BONUS_KEY = "basebots_bonus_echo_unlocked";
const SOUND_KEY = "basebots_ep3_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

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
 * Helpers
 * ────────────────────────────────────────────── */

function normalizeTokenId(input: string | number | bigint): bigint | null {
  try {
    if (typeof input === "bigint") return input;
    if (typeof input === "number") return Number.isFinite(input) ? BigInt(Math.floor(input)) : null;
    if (typeof input === "string" && input.trim()) return BigInt(input.trim());
    return null;
  } catch {
    return null;
  }
}

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

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeThree({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  /* ───────── hydration safety ───────── */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  /* ───────── state ───────── */
  const [phase, setPhase] = useState<Phase>("intro");
  const [glitch, setGlitch] = useState(0);
  const [showEcho, setShowEcho] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    Boolean(address && walletClient && publicClient && isBase && tokenIdBig);

  /* ───────── read chain state ───────── */
  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading chain…");
        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig],
        });

        const ep3Set =
          state?.ep3Set ??
          state?.episode3Set ??
          (Array.isArray(state) ? state[3] : false);

        if (!cancelled && ep3Set) {
          setAlreadySet(true);
          setPhase("lock");
          setChainStatus("Cognition already set");
        } else if (!cancelled) {
          setChainStatus("Awaiting cognition");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenIdBig]);

  /* ───────── ambient glitch ───────── */
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.86) setGlitch(Math.random());
    }, 800);
    return () => clearInterval(t);
  }, []);

  /* ───────── echo bonus ───────── */
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
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/s3.mp3");
    a.loop = true;
    a.volume = 0.5;
    audioRef.current = a;
    if (soundOn) a.play().catch(() => {});
    return () => {
      try {
        a.pause();
        a.src = "";
      } catch {}
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundOn) {
      a.pause();
      a.currentTime = 0;
    } else {
      a.play().catch(() => {});
    }
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    } catch {}
  }, [soundOn]);

  /* ───────── commit cognition ───────── */
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
    setChainStatus("Committing cognition…");

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode3Cognition",
        args: [tokenIdBig!, cognition],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setChainStatus("Cognition locked");
      setPhase("lock");
    } catch {
      setChainStatus("Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ──────────────────────────────────────────────
   * Render
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
          "radial-gradient(900px 400px at 50% -10%, rgba(168,85,247,0.10), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.82))",
        boxShadow: "0 60px 200px rgba(0,0,0,0.9)",
      }}
    >
      {/* boot console */}
      <div style={{ fontSize: 11, opacity: 0.78, marginBottom: 14 }}>
        Boot: {hydrated ? "hydrated" : "hydrating"} • tokenId:{" "}
        <b>{tokenIdBig ? tokenIdBig.toString() : "INVALID"}</b> • chain:{" "}
        <b>{isBase ? "Base" : chain?.id ?? "none"}</b> • status: <b>{chainStatus}</b>
      </div>

      {/* echo */}
      {showEcho && (
        <button
          onClick={acknowledgeEcho}
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            maxWidth: 240,
            fontSize: 10,
            fontFamily: "monospace",
            opacity: 0.85,
          }}
        >
          ▒▒ you were not designed to notice this ▒▒
        </button>
      )}

      {/* PHASES */}

      {phase === "intro" && (
        <>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
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
            Your internal models no longer agree. The system has noticed.
          </p>

          <button onClick={() => setPhase("context")} style={{ marginTop: 22 }}>
            Continue
          </button>
        </>
      )}

      {phase === "context" && (
        <>
          <p>
            Contradiction creates ambiguity. Ambiguity creates risk.
            Upper layers require a cognitive stance.
          </p>
          <button onClick={() => setPhase("contradiction")}>
            Assess contradiction
          </button>
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
            Preserve competing interpretations
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
            Filter external noise
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
          <p>
            This cognition will define how uncertainty is handled going forward.
          </p>
          <button onClick={finalize} disabled={submitting}>
            {submitting ? "COMMITTING…" : "Commit cognition"}
          </button>
        </>
      )}

      {phase === "lock" && (
        <>
          <p style={{ fontWeight: 800 }}>COGNITIVE FRAME LOCKED</p>
          <button onClick={onExit}>Return to hub</button>
        </>
      )}
    </section>
  );
}
