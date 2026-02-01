"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Constants */
/* ────────────────────────────────────────────── */

const EP3_STATE_KEY = "basebots_ep3_state_v2";
const BONUS_KEY = "basebots_bonus_echo_unlocked";
const SOUND_KEY = "basebots_ep3_sound";

const BASE_CHAIN_ID = 8453;

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

type Phase =
  | "boot"
  | "context"
  | "contradiction"
  | "signal"
  | "synthesis"
  | "sealing"
  | "aftermath"
  | "lock";

type Ep3State = {
  contradiction?: "RESOLVE" | "PRESERVE";
  signal?: "FILTER" | "LISTEN";
};

/* ────────────────────────────────────────────── */
/* Local state helpers */
/* ────────────────────────────────────────────── */

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

function normalizeFid(input: string | number | bigint): bigint {
  try {
    if (typeof input === "bigint") return input > 0n ? input : 0n;
    if (typeof input === "number") return input > 0 ? BigInt(Math.floor(input)) : 0n;
    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return 0n;
    const b = BigInt(digits);
    return b > 0n ? b : 0n;
  } catch {
    return 0n;
  }
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeThree({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => normalizeFid(fid), [fid]);

  const [phase, setPhase] = useState<Phase>("boot");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Initializing cognition scan…");
  const [showEcho, setShowEcho] = useState(false);

  /* wagmi */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const isBase = chain?.id === BASE_CHAIN_ID;

  /* ────────────────────────────────────────────── */
  /* Sound */
  /* ────────────────────────────────────────────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const a = new Audio("/audio/s3.mp3");
    a.loop = true;
    a.volume = 0.45;
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
    try {
      if (soundOn) {
        a.play().catch(() => {});
        localStorage.setItem(SOUND_KEY, "on");
      } else {
        a.pause();
        a.currentTime = 0;
        localStorage.setItem(SOUND_KEY, "off");
      }
    } catch {}
  }, [soundOn]);

  /* ────────────────────────────────────────────── */
  /* Read chain state */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient || fidBig <= 0n) {
      setChainStatus("Awaiting identity…");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading cognitive markers…");

        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [fidBig],
        });

        const ep3Set = Boolean(state?.ep3Set);

        if (cancelled) return;

        if (ep3Set) {
          setAlreadySet(true);
          setPhase("lock");
          setChainStatus("Cognitive frame already locked");
        } else {
          setChainStatus("Cognitive frame unstable");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, fidBig]);

  /* ────────────────────────────────────────────── */
  /* Bonus Echo */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "context") return;
    if (localStorage.getItem(BONUS_KEY)) return;

    const t = setTimeout(() => {
      setShowEcho(true);
      setTimeout(() => setShowEcho(false), 3200);
    }, 1200);

    return () => clearTimeout(t);
  }, [phase]);

  function unlockEcho() {
    localStorage.setItem(BONUS_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setShowEcho(false);
    setChainStatus("Anomaly captured");
  }

  /* ────────────────────────────────────────────── */
  /* Commit cognition */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    if (!address) {
      setChainStatus("Connect wallet to continue");
      return;
    }

    const s = loadState();
    if (!s.contradiction || !s.signal) {
      setChainStatus("Cognitive inputs incomplete");
      return;
    }

    let bias = 2; // default (OBEDIENCE)
    if (s.contradiction === "RESOLVE" && s.signal === "FILTER") bias = 0; // DETERMINISM
    if (s.contradiction === "PRESERVE" && s.signal === "LISTEN") bias = 1; // NOVELTY
    if (s.contradiction === "PRESERVE" && s.signal === "FILTER") bias = 3; // ADAPTATION

    try {
      setSubmitting(true);

      if (!isBase) {
        setChainStatus("Switching to Base…");
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      setChainStatus("Awaiting signature…");

      const hash = await writeContractAsync({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode3",
        args: [fidBig, bias],
      });

      setChainStatus("Finalizing cognition on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("aftermath");
      setChainStatus("Cognitive frame sealed");
    } catch (e: any) {
      setChainStatus(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section style={shell}>
      <div style={bgGlow} />
      <div style={scanlines} />

      <div style={card}>
        <div style={chrome} />

        <div style={topRow}>
          <span style={{ fontSize: 11, opacity: 0.75 }}>{chainStatus}</span>
          <button style={soundBtn} onClick={() => setSoundOn(v => !v)}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>

        {showEcho && (
          <button onClick={unlockEcho} style={echo}>
            ░░ ERRANT SIGNAL ░░
            <div style={{ marginTop: 6, opacity: 0.7 }}>
              tap to isolate anomaly
            </div>
          </button>
        )}

        {phase === "boot" && (
          <>
            <div style={chipRow}>
              <div style={chip}>EP3</div>
              <div style={chipPurple}>COGNITIVE FRAME</div>
            </div>

            <h2 style={title}>FAULT LINES</h2>

            <p style={body}>
              Your previous directives conflict.
              <br />
              The system does not resolve this automatically.
              <br />
              <br />
              What emerges next depends on how you handle internal disagreement.
            </p>

            <button style={primaryBtn} onClick={() => setPhase("context")}>
              Continue
            </button>
          </>
        )}

        {phase === "context" && (
          <>
            <p style={body}>
              Contradiction is not an error.
              <br />
              It is a signal the system cannot compress.
            </p>

            <button style={primaryBtn} onClick={() => setPhase("contradiction")}>
              Evaluate contradiction
            </button>
          </>
        )}

        {phase === "contradiction" && (
          <>
            <button
              style={choiceBtn}
              onClick={() => {
                saveState({ contradiction: "RESOLVE" });
                setPhase("signal");
              }}
            >
              Resolve contradiction
              <div style={choiceNote}>
                Force alignment. Reduce ambiguity. Accept rigidity.
              </div>
            </button>

            <button
              style={choiceBtn}
              onClick={() => {
                saveState({ contradiction: "PRESERVE" });
                setPhase("signal");
              }}
            >
              Preserve contradiction
              <div style={choiceNote}>
                Allow parallel truths. Maintain instability.
              </div>
            </button>
          </>
        )}

        {phase === "signal" && (
          <>
            <button
              style={choiceBtn}
              onClick={() => {
                saveState({ signal: "FILTER" });
                setPhase("synthesis");
              }}
            >
              Filter incoming signal
              <div style={choiceNote}>
                Suppress noise. Prioritize internal models.
              </div>
            </button>

            <button
              style={choiceBtn}
              onClick={() => {
                saveState({ signal: "LISTEN" });
                setPhase("synthesis");
              }}
            >
              Listen to fragments
              <div style={choiceNote}>
                Accept incomplete data. Risk contamination.
              </div>
            </button>
          </>
        )}

        {phase === "synthesis" && (
          <>
            <button
              style={{
                ...primaryBtn,
                opacity: submitting || alreadySet ? 0.55 : 1,
              }}
              disabled={submitting || alreadySet}
              onClick={commit}
            >
              {submitting ? "COMMITTING…" : "Commit cognition"}
            </button>

            <button style={secondaryBtn} onClick={onExit}>
              Exit
            </button>
          </>
        )}

        {phase === "aftermath" && (
          <>
            <h3 style={{ fontWeight: 900 }}>COGNITIVE FRAME ESTABLISHED</h3>

            <p style={body}>
              The system no longer asks how you should think.
              <br />
              It assumes it knows.
              <br />
              <br />
              Future decisions will be interpreted through this lens —
              whether you agree with it or not.
            </p>

            <button style={secondaryBtn} onClick={() => setPhase("lock")}>
              Acknowledge
            </button>
          </>
        )}

        {phase === "lock" && (
          <>
            <p style={{ fontWeight: 900 }}>COGNITIVE FRAME LOCKED</p>
            <button style={secondaryBtn} onClick={onExit}>
              Return to hub
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles (matched to EP1 / EP2) */
/* ────────────────────────────────────────────── */

const shell: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  padding: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#020617",
};

const bgGlow: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(800px 360px at 50% 8%, rgba(168,85,247,0.35), transparent 65%)",
  pointerEvents: "none",
};

const scanlines: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
  backgroundSize: "100% 3px",
  opacity: 0.06,
  pointerEvents: "none",
};

const card: CSSProperties = {
  position: "relative",
  maxWidth: 780,
  width: "100%",
  borderRadius: 28,
  padding: 26,
  background: "rgba(2,6,23,0.88)",
  border: "1px solid rgba(168,85,247,0.45)",
  boxShadow:
    "0 0 60px rgba(168,85,247,0.4), 0 80px 200px rgba(0,0,0,0.85)",
};

const chrome: CSSProperties = {
  position: "absolute",
  inset: -2,
  borderRadius: 30,
  background:
    "linear-gradient(120deg, transparent, rgba(168,85,247,0.45), transparent)",
  filter: "blur(18px)",
  opacity: 0.35,
  pointerEvents: "none",
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 16,
};

const chipRow: CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 10,
};

const chip: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
};

const chipPurple: CSSProperties = {
  ...chip,
  borderColor: "rgba(168,85,247,0.45)",
  boxShadow: "0 0 16px rgba(168,85,247,0.35)",
};

const title: CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  marginTop: 8,
};

const body: CSSProperties = {
  marginTop: 14,
  lineHeight: 1.75,
  opacity: 0.85,
};

const primaryBtn: CSSProperties = {
  marginTop: 22,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 999,
  fontWeight: 900,
  background: "linear-gradient(90deg,#38bdf8,#a855f7)",
  color: "#020617",
};

const secondaryBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontWeight: 900,
};

const choiceBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "white",
  fontWeight: 800,
  textAlign: "left",
};

const choiceNote: CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  opacity: 0.7,
};

const soundBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontSize: 11,
  fontWeight: 900,
};

const echo: CSSProperties = {
  position: "absolute",
  right: 16,
  bottom: 16,
  zIndex: 50,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(56,189,248,0.35)",
  background: "rgba(2,6,23,0.92)",
  fontSize: 10,
  fontFamily: "monospace",
};
