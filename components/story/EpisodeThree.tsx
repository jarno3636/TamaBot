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
/* Types */
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
    if (typeof input === "bigint") return input;
    const s = String(input).trim();
    if (!s) return null;
    return BigInt(s);
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
  const [alreadySet, setAlreadySet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEcho, setShowEcho] = useState(false);

  /* wagmi */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const isBase = chain?.id === BASE_CHAIN_ID;
  const ready =
    Boolean(address && publicClient && tokenIdBig && isBase);

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
  /* Chain read (ep3Set) */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

    let cancelled = false;

    (async () => {
      try {
        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig],
        });

        const ep3Set = Boolean(state?.[10]); // per ABI

        if (!cancelled && ep3Set) {
          setAlreadySet(true);
          setPhase("lock");
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenIdBig]);

  /* ────────────────────────────────────────────── */
  /* Glitch / Bonus Echo */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (localStorage.getItem(BONUS_KEY)) return;

    const t = setTimeout(() => {
      setShowEcho(true);
      setTimeout(() => setShowEcho(false), 3000);
    }, 2800);

    return () => clearTimeout(t);
  }, []);

  function unlockEcho() {
    localStorage.setItem(BONUS_KEY, "true");
    window.dispatchEvent(new Event("basebots-progress-updated"));
    setShowEcho(false);
  }

  /* ────────────────────────────────────────────── */
  /* Commit Episode 3 */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (alreadySet || submitting || !ready) return;

    const s = loadState();

    let bias: number = 2; // PRAGMATIC default

    if (s.contradiction === "RESOLVE" && s.signal === "FILTER") bias = 0; // DETERMINISTIC
    if (s.contradiction === "PRESERVE" && s.signal === "LISTEN") bias = 1; // ARCHIVAL
    if (s.contradiction === "PRESERVE" && s.signal === "FILTER") bias = 3; // PARANOID

    try {
      setSubmitting(true);

      if (!isBase) {
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      const hash = await writeContractAsync({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode3",
        args: [tokenIdBig!, bias],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
    } catch {
      /* silent fail – Episode 2 pattern */
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section style={shell}>
      <button style={soundBtn} onClick={() => setSoundOn((v) => !v)}>
        {soundOn ? "SOUND ON" : "SOUND OFF"}
      </button>

      {showEcho && (
        <button onClick={unlockEcho} style={echo}>
          ▒▒ anomalous process detected ▒▒
        </button>
      )}

      {phase === "intro" && (
        <>
          <h2 style={title}>FAULT LINES</h2>
          <p style={body}>
            Your internal models no longer agree. The system has noticed.
          </p>
          <button style={primaryBtn} onClick={() => setPhase("context")}>
            Continue
          </button>
        </>
      )}

      {phase === "context" && (
        <>
          <p style={body}>
            Contradiction introduces ambiguity. Ambiguity introduces risk.
          </p>
          <button style={primaryBtn} onClick={() => setPhase("contradiction")}>
            Assess contradiction
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
            Collapse to a single truth
          </button>
          <button
            style={choiceBtn}
            onClick={() => {
              saveState({ contradiction: "PRESERVE" });
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
            style={choiceBtn}
            onClick={() => {
              saveState({ signal: "FILTER" });
              setPhase("synthesis");
            }}
          >
            Filter external noise
          </button>
          <button
            style={choiceBtn}
            onClick={() => {
              saveState({ signal: "LISTEN" });
              setPhase("synthesis");
            }}
          >
            Ingest fragments despite risk
          </button>
        </>
      )}

      {phase === "synthesis" && (
        <>
          <p style={body}>
            This cognition will define how uncertainty is handled.
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
  position: "relative",
  borderRadius: 28,
  padding: 24,
  color: "white",
  border: "1px solid rgba(168,85,247,0.35)",
  background:
    "radial-gradient(800px 300px at 50% -10%, rgba(168,85,247,0.12), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.78))",
  boxShadow: "0 60px 160px rgba(0,0,0,0.85)",
};

const title: CSSProperties = { fontSize: 24, fontWeight: 900 };
const body: CSSProperties = { marginTop: 12, opacity: 0.78, lineHeight: 1.6 };

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
  marginTop: 16,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
};

const choiceBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "white",
  fontWeight: 700,
};

const soundBtn: CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
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
  bottom: 18,
  right: 18,
  fontSize: 10,
  fontFamily: "monospace",
  opacity: 0.85,
  background: "transparent",
  color: "rgba(255,255,255,0.85)",
};
