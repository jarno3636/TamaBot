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

const BASE_CHAIN_ID = 8453;
const SOUND_KEY = "basebots_ep4_sound";
const FID_KEY = "basebots_fid_v1";

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

/**
 * getBotState tuple — MUST match ABI order exactly
 */
type BotStateTuple = readonly [
  string,  // designation
  number,  // ep1Choice
  number,  // cognitionBias
  number,  // profile
  number,  // outcome
  number,  // bonusFlags
  number,  // schemaVersion
  boolean, // finalized
  boolean, // ep1Set
  boolean, // ep2Set
  boolean, // ep3Set
  boolean, // ep4Set
  boolean, // ep5Set
  bigint,  // updatedAt
  bigint   // finalizedAt
];

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function normalizePositiveBigint(
  input: string | number | bigint | undefined | null
): bigint | null {
  try {
    if (input == null) return null;
    if (typeof input === "bigint") return input > 0n ? input : null;
    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return null;
    const v = BigInt(digits);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}

function loadCachedFid(): bigint | null {
  try {
    return normalizePositiveBigint(localStorage.getItem(FID_KEY));
  } catch {
    return null;
  }
}

function cacheFid(fid: bigint) {
  try {
    localStorage.setItem(FID_KEY, fid.toString());
    window.dispatchEvent(new Event("basebots-fid-updated"));
  } catch {}
}

/**
 * cognitionBias → surface profile enum
 */
function biasToProfileEnum(bias: number): number {
  switch (bias) {
    case 0: return 0; // EXECUTOR
    case 1: return 1; // OBSERVER
    case 3: return 3; // SENTINEL
    case 2:
    default:
      return 2; // OPERATOR
  }
}

function profileLabel(p: number) {
  return ["EXECUTOR", "OBSERVER", "OPERATOR", "SENTINEL"][p] ?? "UNKNOWN";
}

function profileDescription(p: number) {
  switch (p) {
    case 0:
      return "Optimized for resolution. Acts decisively once certainty is declared.";
    case 1:
      return "Retains context across time. Defers action to preserve continuity.";
    case 3:
      return "Assumes hostile conditions. Treats absence of data as signal.";
    default:
      return "Balances outcome and adaptability. Operates despite incomplete information.";
  }
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeFour({
  tokenId,
  onExit,
}: {
  tokenId?: string | number | bigint;
  onExit: () => void;
}) {
  /* ───────── identity resolution ───────── */

  const tokenIdFromProps = useMemo(
    () => normalizePositiveBigint(tokenId),
    [tokenId]
  );

  const [fidBig, setFidBig] = useState<bigint | null>(null);
  const resolvedTokenId = tokenIdFromProps ?? fidBig;

  /* ───────── wagmi ───────── */

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const isBase = chain?.id === BASE_CHAIN_ID;

  /* ───────── state ───────── */

  const [phase, setPhase] =
    useState<"intro" | "analysis" | "projection" | "lock">("intro");

  const [bias, setBias] = useState<number | null>(null);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");
  const [submitting, setSubmitting] = useState(false);
  const [readBusy, setReadBusy] = useState(false);

  const profileEnum = useMemo(
    () => (bias !== null ? biasToProfileEnum(bias) : null),
    [bias]
  );

  /* ────────────────────────────────────────────── */
  /* FID auto-detect (same model as Ep3) */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (tokenIdFromProps) return;

    const cached = loadCachedFid();
    if (cached) setFidBig(cached);

    const handler = () => {
      const c = loadCachedFid();
      if (c) setFidBig(c);
    };

    window.addEventListener("basebots-fid-updated", handler);
    return () => window.removeEventListener("basebots-fid-updated", handler);
  }, [tokenIdFromProps]);

  /* ────────────────────────────────────────────── */
  /* Chain read (ABI-safe tuple decoding) */
  /* ────────────────────────────────────────────── */

  async function readChainState(id: bigint) {
    if (!publicClient) return;

    setReadBusy(true);
    try {
      setChainStatus("Reading cognition…");

      const state = await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getBotState",
        args: [id],
      });

      const tuple = state as BotStateTuple;

      const cognitionBias = Number(tuple[2]);
      const ep3Set = Boolean(tuple[10]);
      const ep4Set = Boolean(tuple[11]);

      if (!ep3Set) {
        setChainStatus("Episode 3 not completed");
        return;
      }

      setBias(Number.isFinite(cognitionBias) ? cognitionBias : null);

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
    } finally {
      setReadBusy(false);
    }
  }

  useEffect(() => {
    if (!resolvedTokenId) {
      setChainStatus("Waiting for identity…");
      return;
    }
    void readChainState(resolvedTokenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTokenId]);

  /* ────────────────────────────────────────────── */
  /* Commit profile */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;
    if (!resolvedTokenId || !address || profileEnum === null) return;

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
        <span style={{ fontSize: 11, opacity: 0.7 }}>{chainStatus}</span>
      </div>

      {phase === "intro" && (
        <>
          <h2 style={title}>THRESHOLD</h2>
          <p style={body}>
            Cognition has stabilized.
            <br />
            Before deployment, the system determines how you appear when observed.
          </p>
          <button style={primaryBtn} onClick={() => setPhase("analysis")}>
            Continue
          </button>
        </>
      )}

      {phase === "analysis" && (
        <>
          <p style={body}>Derived cognitive bias:</p>
          <div style={monoBox}>
            {bias !== null ? `BIAS :: ${bias}` : "CLASSIFYING…"}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              style={secondaryBtnInline}
              disabled={readBusy}
              onClick={() => resolvedTokenId && readChainState(resolvedTokenId)}
            >
              Refresh
            </button>

            <button
              style={{
                ...secondaryBtnInline,
                opacity: bias !== null ? 1 : 0.6,
              }}
              disabled={bias === null}
              onClick={() => setPhase("projection")}
            >
              Project surface role
            </button>
          </div>
        </>
      )}

      {phase === "projection" && profileEnum !== null && (
        <>
          <div style={card}>
            <div style={cardTitle}>{profileLabel(profileEnum)}</div>
            <div style={cardDesc}>{profileDescription(profileEnum)}</div>
          </div>

          <button
            style={primaryBtn}
            disabled={submitting}
            onClick={commit}
          >
            {submitting ? "AUTHORIZING…" : "Authorize surface profile"}
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
/* Styles */
/* ────────────────────────────────────────────── */

const shell: CSSProperties = {
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
  color: "white",
};

const secondaryBtnInline: CSSProperties = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
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
