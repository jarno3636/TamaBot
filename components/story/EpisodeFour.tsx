// components/story/EpisodeFour.tsx
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

function normalizePositiveBigint(
  input: string | number | bigint | undefined | null
): bigint | null {
  try {
    if (input === undefined || input === null) return null;
    if (typeof input === "bigint") return input > 0n ? input : null;
    // Pull first digit-run from strings like "123" or "tokenId: 12"
    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return null;
    const v = BigInt(digits);
    return v > 0n ? v : null;
  } catch {
    return null;
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

function isEmptyHexLike(v: unknown): boolean {
  // Some clients/bugs surface empty read results as "0x"
  return typeof v === "string" && v.toLowerCase() === "0x";
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

type Phase = "intro" | "analysis" | "projection" | "lock";

export default function EpisodeFour({
  tokenId,
  onExit,
}: {
  tokenId?: string | number | bigint;
  onExit: () => void;
}) {
  const resolvedTokenId = useMemo(
    () => normalizePositiveBigint(tokenId),
    [tokenId]
  );

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

  const hasIdentity = Boolean(resolvedTokenId && resolvedTokenId > 0n);

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
  /* Chain Read (callable + safe) */
  /* ────────────────────────────────────────────── */

  async function readChainState() {
    if (!publicClient) {
      setChainStatus("No public client");
      return;
    }
    if (!resolvedTokenId || resolvedTokenId <= 0n) {
      setChainStatus("No Basebot tokenId provided");
      setBias(null);
      setAlreadySet(false);
      return;
    }

    setReadBusy(true);
    try {
      setChainStatus("Reading state…");

      const state: any = await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getBotState",
        args: [resolvedTokenId],
      });

      // Defensive: some environments surface "0x" for missing data
      if (isEmptyHexLike(state) || state == null) {
        setBias(null);
        setAlreadySet(false);
        setChainStatus('No data returned (tokenId not found?)');
        return;
      }

      // ABI outputs order (per your ABI):
      // [2] cognitionBias, [11] ep4Set
      const nextBiasRaw = state?.[2];
      const ep4SetRaw = state?.[11];

      const nextBias = Number(nextBiasRaw);
      const ep4Set = Boolean(ep4SetRaw);

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
      const msg = e?.shortMessage || e?.message || "Chain read failed";
      const low = String(msg).toLowerCase();

      if (low.includes("returned no data") || low.includes("0x")) {
        setChainStatus('getBotState returned no data ("0x"). Check tokenId.');
      } else {
        setChainStatus(msg);
      }
      setBias(null);
      setAlreadySet(false);
    } finally {
      setReadBusy(false);
    }
  }

  useEffect(() => {
    // auto read when identity becomes available
    if (!publicClient) return;
    if (!hasIdentity) {
      setChainStatus("Waiting for tokenId…");
      return;
    }
    void readChainState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, hasIdentity, resolvedTokenId]);

  /* ────────────────────────────────────────────── */
  /* Commit */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    if (!resolvedTokenId || resolvedTokenId <= 0n) {
      setChainStatus("TokenId not ready");
      return;
    }

    if (!address) {
      setChainStatus("Connect wallet to continue");
      return;
    }

    if (profileEnum === null) {
      setChainStatus("Bias not loaded — tap Refresh");
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
        args: [resolvedTokenId, profileEnum],
      });

      setChainStatus("Finalizing on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
      setChainStatus("Surface profile registered");
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || "Transaction failed";
      setChainStatus(msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  const canProceedToAnalysis = hasIdentity;
  const canProceedToProjection = hasIdentity && bias !== null;

  return (
    <section style={shell}>
      <div style={topRow}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, opacity: 0.75 }}>{chainStatus}</span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>
            tokenId:{" "}
            <b>{resolvedTokenId ? resolvedTokenId.toString() : "none"}</b> • chain:{" "}
            <b>{chain?.id ?? "none"}</b>
          </span>
        </div>

        <button style={soundBtn} onClick={() => setSoundOn((s) => !s)} type="button">
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 style={title}>THRESHOLD</h2>

          <p style={body}>
            Oversight opens a sealed channel.
            <br />
            <b>“Cognition confirmed. Surface posture required.”</b>
            <br />
            <br />
            Out there, you won’t be judged by what you are —
            <br />
            only by what you do when someone is watching.
          </p>

          <button
            type="button"
            style={{ ...primaryBtn, opacity: canProceedToAnalysis ? 1 : 0.6 }}
            onClick={() => setPhase("analysis")}
            disabled={!canProceedToAnalysis}
          >
            {canProceedToAnalysis ? "Continue" : "Waiting for tokenId…"}
          </button>

          {!canProceedToAnalysis && (
            <p style={{ ...body, fontSize: 12, opacity: 0.65 }}>
              Episode 4 needs a real <b>Basebots tokenId</b> from the hub.
              <br />
              (FID cannot be used as tokenId.)
            </p>
          )}
        </>
      )}

      {/* ANALYSIS */}
      {phase === "analysis" && (
        <>
          <p style={body}>
            Oversight replays your previous decisions and isolates a dominant bias.
            <br />
            This bias becomes your deployment posture.
          </p>

          <div style={monoBox}>
            {bias !== null ? `COGNITION_BIAS :: ${bias}` : "CLASSIFYING…"}
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
              {readBusy ? "reading chain…" : "tap refresh if this stalls"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              type="button"
              style={secondaryBtnInline}
              onClick={() => void readChainState()}
              disabled={!hasIdentity || readBusy}
            >
              {readBusy ? "REFRESHING…" : "Refresh"}
            </button>

            <button
              type="button"
              style={{
                ...secondaryBtnInline,
                opacity: canProceedToProjection ? 1 : 0.6,
              }}
              onClick={() => setPhase("projection")}
              disabled={!canProceedToProjection}
            >
              Project surface role
            </button>
          </div>

          {!canProceedToProjection && (
            <p style={{ ...body, fontSize: 12, opacity: 0.65 }}>
              If you see “CLASSIFYING…” forever:
              <br />
              1) your tokenId is missing/invalid, or 2) getBotState returned no data.
              <br />
              Tap <b>Refresh</b>.
            </p>
          )}
        </>
      )}

      {/* PROJECTION */}
      {phase === "projection" && (
        <>
          <p style={body}>
            The system now determines how you move under observation.
            <br />
            Your surface profile is a mask — but masks can save lives.
          </p>

          {profileEnum === null ? (
            <>
              <div style={monoBox}>
                ▒▒ SYNTHESIZING SURFACE PROFILE ▒▒
                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
                  missing bias — go back and refresh chain read
                </div>
              </div>

              <button
                type="button"
                style={secondaryBtn}
                onClick={() => setPhase("analysis")}
              >
                Back
              </button>
            </>
          ) : (
            <>
              <div style={card}>
                <div style={cardTitle}>{profileLabel(profileEnum)}</div>
                <div style={cardDesc}>{profileDescription(profileEnum)}</div>
              </div>

              <p style={{ ...body, fontSize: 13 }}>
                This will be written on-chain.
                <br />
                Once registered, you don’t get to “rebrand” in the field.
              </p>

              <button
                type="button"
                style={{
                  ...primaryBtn,
                  opacity: submitting || alreadySet ? 0.65 : 1,
                }}
                onClick={commit}
                disabled={submitting || alreadySet}
              >
                {submitting ? "AUTHORIZING…" : "Authorize surface profile"}
              </button>

              <button type="button" style={secondaryBtn} onClick={onExit}>
                Exit
              </button>
            </>
          )}
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p style={locked}>SURFACE PROFILE REGISTERED</p>
          <button style={secondaryBtn} onClick={onExit} type="button">
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
  background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.78))",
  boxShadow: "0 60px 160px rgba(0,0,0,0.85)",
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 18,
  gap: 12,
};

const title: CSSProperties = { fontSize: 24, fontWeight: 900 };

const body: CSSProperties = {
  marginTop: 12,
  opacity: 0.78,
  lineHeight: 1.65,
};

const primaryBtn: CSSProperties = {
  marginTop: 22,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 999,
  fontWeight: 900,
  background:
    "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.9))",
  color: "#020617",
  boxShadow: "0 0 24px rgba(168,85,247,0.6)",
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

const secondaryBtnInline: CSSProperties = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontWeight: 900,
};

const monoBox: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
  letterSpacing: 2,
};

const card: CSSProperties = {
  marginTop: 14,
  padding: 16,
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  textAlign: "center",
};

const cardTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  letterSpacing: 3,
};

const cardDesc: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  opacity: 0.7,
};

const locked: CSSProperties = {
  marginTop: 12,
  fontFamily: "monospace",
  letterSpacing: 2,
  opacity: 0.85,
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
