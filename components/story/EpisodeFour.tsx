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

const SOUND_KEY = "basebots_ep4_sound";
const BASE_CHAIN_ID = 8453;

/* ────────────────────────────────────────────── */
/* SAFE HELPERS (CRITICAL) */
/* ────────────────────────────────────────────── */

function normalizeFid(input: string | number | bigint): bigint {
  try {
    if (typeof input === "bigint") return input > 0n ? input : 0n;
    if (typeof input === "number")
      return input > 0 ? BigInt(Math.floor(input)) : 0n;

    const digits = String(input).match(/^\d+$/)?.[0];
    if (!digits) return 0n;

    const b = BigInt(digits);
    return b > 0n ? b : 0n;
  } catch {
    return 0n;
  }
}

/**
 * cognitionBias → surface profile enum
 * 0 = EXECUTOR
 * 1 = OBSERVER
 * 2 = OPERATOR
 * 3 = SENTINEL
 */
function biasToProfileEnum(bias: number): number {
  switch (bias) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 3:
      return 3;
    case 2:
    default:
      return 2;
  }
}

function profileLabel(profile: number): string {
  return ["EXECUTOR", "OBSERVER", "OPERATOR", "SENTINEL"][profile] ?? "UNKNOWN";
}

function profileDescription(profile: number): string {
  switch (profile) {
    case 0:
      return "Acts decisively once certainty is reached. Optimized for resolution under pressure.";
    case 1:
      return "Retains context across time. Observes without interrupting continuity.";
    case 3:
      return "Assumes hostile conditions. Treats absence of data as a warning.";
    case 2:
    default:
      return "Balances adaptability with outcome. Operates despite uncertainty.";
  }
}

function cinematicProfileSummary(profile: number): string {
  switch (profile) {
    case 0:
      return "You move before consensus forms. Oversight notes your willingness to conclude.";
    case 1:
      return "You watch long enough to see patterns others miss. Oversight learns to wait.";
    case 3:
      return "You expect threat even in silence. Oversight flags your perimeter instinct.";
    case 2:
    default:
      return "You adapt mid-motion. Oversight cannot fully predict you.";
  }
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

type Phase =
  | "intro"
  | "summary"
  | "analysis"
  | "projection"
  | "aftermath"
  | "lock";

export default function EpisodeFour({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => normalizeFid(fid), [fid]);
  const hasFid = fidBig > 0n;

  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);

  const [chainStatus, setChainStatus] = useState("Awaiting identity…");
  const [readBusy, setReadBusy] = useState(false);
  const [bias, setBias] = useState<number | null>(null);

  const profileEnum = useMemo(
    () => (bias !== null ? biasToProfileEnum(bias) : null),
    [bias],
  );

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
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "off") setSoundOn(false);
    } catch {}
  }, []);

  useEffect(() => {
    const a = new Audio("/audio/s4.mp3");
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
  /* Chain Read (SAFE) */
  /* ────────────────────────────────────────────── */

  async function readChainState() {
    if (!publicClient || !hasFid) return;

    setReadBusy(true);
    try {
      setChainStatus("Synthesizing prior decisions…");

      const state: any = await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getBotState",
        args: [fidBig],
      });

      const nextBias = Number(state?.cognitionBias);
      const ep4Set = Boolean(state?.ep4Set);

      setBias(Number.isFinite(nextBias) ? nextBias : null);

      if (ep4Set) {
        setAlreadySet(true);
        setPhase("lock");
        setChainStatus("Surface profile already registered");
      } else {
        setAlreadySet(false);
        setChainStatus("Surface profile pending");
      }
    } catch {
      setChainStatus("Chain read failed");
      setBias(null);
      setAlreadySet(false);
    } finally {
      setReadBusy(false);
    }
  }

  useEffect(() => {
    if (!hasFid) {
      setChainStatus("Awaiting identity…");
      return;
    }
    if (!publicClient) return;
    void readChainState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, hasFid]);

  /* ────────────────────────────────────────────── */
  /* Commit (SAFE) */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (!hasFid || submitting || alreadySet) return;

    if (!address) {
      setChainStatus("Connect wallet to continue");
      return;
    }

    if (profileEnum === null) {
      setChainStatus("Cognitive frame missing");
      return;
    }

    try {
      setSubmitting(true);

      if (!isBase) {
        setChainStatus("Switching to Base…");
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      setChainStatus("Awaiting authorization…");

      const hash = await writeContractAsync({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode4Profile",
        args: [fidBig, profileEnum],
      });

      setChainStatus("Finalizing surface identity…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("aftermath");
      setChainStatus("Surface profile locked");
    } catch {
      setChainStatus("Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

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
          <button style={soundBtn} onClick={() => setSoundOn(s => !s)}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>

        {phase === "intro" && (
          <>
            <div style={chipRow}>
              <div style={chip}>EP4</div>
              <div style={chipPurple}>SURFACE PROFILE</div>
            </div>

            <h2 style={title}>THRESHOLD</h2>

            <p style={body}>
              Oversight opens a sealed channel.
              <br />
              <b>“Internal cognition validated. External posture required.”</b>
            </p>

            <button style={primaryBtn} onClick={() => setPhase("summary")}>
              Continue
            </button>
          </>
        )}

        {phase === "summary" && (
          <>
            <p style={body}>
              Your prior decisions form a pattern:
              <br />
              how you obeyed, resisted, adapted.
              <br />
              <br />
              Oversight does not care why —
              only how you behave when observed.
            </p>

            <button style={primaryBtn} onClick={() => setPhase("analysis")}>
              Synthesize posture
            </button>
          </>
        )}

        {phase === "analysis" && (
          <>
            <div style={monoBox}>
              {bias !== null ? `COGNITION_BIAS :: ${bias}` : "CLASSIFYING…"}
            </div>

            <button
              style={secondaryBtn}
              onClick={() => void readChainState()}
              disabled={readBusy}
            >
              {readBusy ? "REFRESHING…" : "Refresh"}
            </button>

            <button
              style={{
                ...secondaryBtn,
                opacity: bias !== null ? 1 : 0.6,
              }}
              disabled={bias === null}
              onClick={() => setPhase("projection")}
            >
              Project surface identity
            </button>
          </>
        )}

        {phase === "projection" && profileEnum !== null && (
          <>
            <div style={cardInner}>
              <div style={cardTitle}>{profileLabel(profileEnum)}</div>
              <div style={cardDesc}>{profileDescription(profileEnum)}</div>
              <div style={cinematic}>{cinematicProfileSummary(profileEnum)}</div>
            </div>

            <button
              style={{
                ...primaryBtn,
                opacity: submitting || alreadySet ? 0.65 : 1,
              }}
              onClick={commit}
              disabled={submitting || alreadySet}
            >
              {submitting ? "AUTHORIZING…" : "Authorize surface profile"}
            </button>

            <button style={secondaryBtn} onClick={onExit}>
              Exit
            </button>
          </>
        )}

        {phase === "aftermath" && (
          <>
            <h3 style={{ fontWeight: 900 }}>SURFACE PROFILE ESTABLISHED</h3>
            <p style={body}>
              The system no longer speculates.
              <br />
              It assigns expectation.
              <br />
              <br />
              From here on, deviation will be noted.
            </p>

            <button style={secondaryBtn} onClick={() => setPhase("lock")}>
              Acknowledge
            </button>
          </>
        )}

        {phase === "lock" && (
          <>
            <p style={locked}>SURFACE PROFILE REGISTERED</p>
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
/* Styles — matched to EP1–EP3 */
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

const chipRow: CSSProperties = { display: "flex", gap: 8, marginBottom: 10 };

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

const title: CSSProperties = { fontSize: 30, fontWeight: 900 };
const body: CSSProperties = { marginTop: 14, lineHeight: 1.75, opacity: 0.85 };

const monoBox: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
};

const cardInner: CSSProperties = {
  marginTop: 14,
  padding: 18,
  borderRadius: 20,
  background: "rgba(255,255,255,0.06)",
  textAlign: "center",
};

const cardTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  letterSpacing: 2,
};

const cardDesc: CSSProperties = { marginTop: 8, fontSize: 12, opacity: 0.7 };

const cinematic: CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  opacity: 0.8,
  fontStyle: "italic",
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

const locked: CSSProperties = {
  marginTop: 12,
  fontFamily: "monospace",
  letterSpacing: 2,
};

const soundBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 11,
  fontWeight: 900,
  color: "white",
};
