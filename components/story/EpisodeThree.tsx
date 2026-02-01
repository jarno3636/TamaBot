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

const EP3_STATE_KEY = "basebots_ep3_state_v1";
const BONUS_KEY = "basebots_bonus_echo_unlocked";
const SOUND_KEY = "basebots_ep3_sound";
const BASE_CHAIN_ID = 8453;

/* ────────────────────────────────────────────── */

type Phase =
  | "intro"
  | "context"
  | "contradiction"
  | "signal"
  | "synthesis"
  | "lock";

type Ep3State = {
  contradiction?: "RESOLVE" | "PRESERVE";
  signal?: "FILTER" | "LISTEN";
};

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function normalizeTokenId(input: string | number | bigint): bigint | null {
  try {
    const v = BigInt(String(input).trim());
    return v > 0n ? v : null;
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

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeThree({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");
  const [showEcho, setShowEcho] = useState(false);

  /* wagmi */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const isBase = chain?.id === BASE_CHAIN_ID;
  const ready =
    Boolean(address && publicClient && tokenIdBig && tokenIdBig > 0n);

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
    a.volume = 0.55;
    audioRef.current = a;
    if (soundOn) a.play().catch(() => {});
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (soundOn) {
      a.play().catch(() => {});
      localStorage.setItem(SOUND_KEY, "on");
    } else {
      a.pause();
      a.currentTime = 0;
      localStorage.setItem(SOUND_KEY, "off");
    }
  }, [soundOn]);

  /* ────────────────────────────────────────────── */
  /* Read chain state */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

    (async () => {
      try {
        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig],
        });

        if (state?.[10]) {
          setAlreadySet(true);
          setPhase("lock");
        }
      } catch {
        setChainStatus("Chain read failed");
      }
    })();
  }, [publicClient, tokenIdBig]);

  /* ────────────────────────────────────────────── */
  /* Secret Echo – guaranteed */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "context") return;
    if (localStorage.getItem(BONUS_KEY)) return;

    const t = setTimeout(() => {
      setShowEcho(true);
      setTimeout(() => setShowEcho(false), 3000);
    }, 2000);

    return () => clearTimeout(t);
  }, [phase]);

  function unlockEcho() {
    localStorage.setItem(BONUS_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setShowEcho(false);
  }

  /* ────────────────────────────────────────────── */
  /* Commit */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (!ready || submitting || alreadySet) return;

    const s = loadState();

    let bias = 2; // PRAGMATIC
    if (s.contradiction === "RESOLVE" && s.signal === "FILTER") bias = 0;
    if (s.contradiction === "PRESERVE" && s.signal === "LISTEN") bias = 1;
    if (s.contradiction === "PRESERVE" && s.signal === "FILTER") bias = 3;

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
        args: [tokenIdBig!, bias],
      });

      setChainStatus("Finalizing…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
      setChainStatus("Cognition locked");
    } catch (e: any) {
      setChainStatus(e?.shortMessage || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section style={shell}>
      {/* top utility row */}
      <div style={topRow}>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{chainStatus}</span>
        <button style={soundBtn} onClick={() => setSoundOn((v) => !v)}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {showEcho && (
        <button onClick={unlockEcho} style={echo}>
          ▒▒ anomalous process ▒▒
        </button>
      )}

      {phase === "intro" && (
        <>
          <h2 style={title}>FAULT LINES</h2>
          <p style={body}>
            Your internal models are diverging. Oversight flags instability.
          </p>
          <button style={primaryBtn} onClick={() => setPhase("context")}>
            Continue
          </button>
        </>
      )}

      {phase === "context" && (
        <>
          <p style={body}>
            When systems disagree, the response defines the intelligence.
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
              Force alignment. Remove ambiguity.
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
              Maintain parallel interpretations.
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
              Reduce noise. Prioritize certainty.
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
              Accept instability to gain insight.
            </div>
          </button>
        </>
      )}

      {phase === "synthesis" && (
        <>
          <p style={body}>
            This cognitive frame will persist.
          </p>
          <button style={primaryBtn} onClick={commit} disabled={submitting}>
            {submitting ? "COMMITTING…" : "Commit cognition"}
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
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const shell: CSSProperties = {
  borderRadius: 28,
  padding: 24,
  color: "white",
  border: "1px solid rgba(168,85,247,0.35)",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.78))",
  boxShadow: "0 60px 160px rgba(0,0,0,0.85)",
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
};

const title: CSSProperties = { fontSize: 24, fontWeight: 900 };
const body: CSSProperties = { marginTop: 12, opacity: 0.78 };

const primaryBtn: CSSProperties = {
  marginTop: 22,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 999,
  fontWeight: 900,
  background:
    "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.9))",
  color: "#020617",
};

const secondaryBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
};

const choiceBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
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
  fontSize: 11,
  fontWeight: 900,
};

const echo: CSSProperties = {
  position: "absolute",
  bottom: 18,
  right: 18,
  fontSize: 10,
  fontFamily: "monospace",
  opacity: 0.85,
};
