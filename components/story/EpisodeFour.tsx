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
/* Helpers */
/* ────────────────────────────────────────────── */

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
      return "Optimized for resolution. Acts decisively once certainty is declared.";
    case 1:
      return "Retains context across time. Defers action to preserve continuity.";
    case 3:
      return "Assumes hostile conditions. Treats absence of data as signal.";
    case 2:
    default:
      return "Balances outcome and adaptability. Operates despite incomplete information.";
  }
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

type Phase = "intro" | "analysis" | "projection" | "lock";

export default function EpisodeFour({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => BigInt(fid), [fid]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);

  const [chainStatus, setChainStatus] = useState("Idle");
  const [readBusy, setReadBusy] = useState(false);

  const [bias, setBias] = useState<number | null>(null);

  const profileEnum = useMemo(
    () => (bias !== null ? biasToProfileEnum(bias) : null),
    [bias]
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
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  /* Chain Read (FIXED ep4Set) */
  /* ────────────────────────────────────────────── */

  async function readChainState() {
    if (!publicClient) {
      setChainStatus("No public client");
      return;
    }

    setReadBusy(true);
    try {
      setChainStatus("Reading cognition frame…");

      const state: any = await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getBotState",
        args: [fidBig],
      });

      const nextBias = Number(state?.cognitionBias);
      const ep4Set = Boolean(state?.ep4Set); // ✅ CORRECT

      setBias(Number.isFinite(nextBias) ? nextBias : null);

      if (ep4Set) {
        setAlreadySet(true);
        setPhase("lock");
        setChainStatus("Surface profile already registered");
      } else {
        setAlreadySet(false);
        setChainStatus("Profile pending");
      }
    } catch (e: any) {
      setChainStatus(e?.shortMessage || e?.message || "Chain read failed");
      setBias(null);
      setAlreadySet(false);
    } finally {
      setReadBusy(false);
    }
  }

  useEffect(() => {
    if (!publicClient) return;
    void readChainState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, fidBig]);

  /* ────────────────────────────────────────────── */
  /* Commit */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    if (!address) {
      setChainStatus("Connect wallet to continue");
      return;
    }

    if (profileEnum === null) {
      setChainStatus("Cognition frame missing");
      return;
    }

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
        functionName: "setEpisode4Profile",
        args: [fidBig, profileEnum],
      });

      setChainStatus("Finalizing on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
      setChainStatus("Surface profile registered");
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
      <div style={topRow}>
        <span style={{ fontSize: 11, opacity: 0.75 }}>{chainStatus}</span>
        <button style={soundBtn} onClick={() => setSoundOn(s => !s)}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {phase === "intro" && (
        <>
          <h2 style={title}>THRESHOLD</h2>
          <p style={body}>
            Oversight opens a sealed channel.
            <br />
            <b>“Cognition confirmed. Surface posture required.”</b>
          </p>
          <button style={primaryBtn} onClick={() => setPhase("analysis")}>
            Continue
          </button>
        </>
      )}

      {phase === "analysis" && (
        <>
          <p style={body}>
            Your prior decisions resolve into a dominant posture.
          </p>

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
            Project surface role
          </button>
        </>
      )}

      {phase === "projection" && profileEnum !== null && (
        <>
          <div style={card}>
            <div style={cardTitle}>{profileLabel(profileEnum)}</div>
            <div style={cardDesc}>{profileDescription(profileEnum)}</div>
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

      {phase === "lock" && (
        <>
          <p style={locked}>SURFACE PROFILE REGISTERED</p>
          <button style={secondaryBtn} onClick={onExit}>
            Return to hub
          </button>
        </>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles (unchanged) */
/* ────────────────────────────────────────────── */

const shell: CSSProperties = {
  position: "relative",
  borderRadius: 28,
  padding: 24,
  color: "white",
  border: "1px solid rgba(168,85,247,0.35)",
  background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.78))",
  boxShadow: "0 60px 160px rgba(0,0,0,0.85)",
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 18,
};

const title: CSSProperties = { fontSize: 24, fontWeight: 900 };
const body: CSSProperties = { marginTop: 12, opacity: 0.78 };
const monoBox: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
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
const card: CSSProperties = {
  marginTop: 14,
  padding: 16,
  borderRadius: 20,
  background: "rgba(255,255,255,0.06)",
  textAlign: "center",
};
const cardTitle: CSSProperties = { fontSize: 18, fontWeight: 900 };
const cardDesc: CSSProperties = { marginTop: 8, fontSize: 12, opacity: 0.7 };
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
};
