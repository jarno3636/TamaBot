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
const FID_KEY = "basebots_fid_v1";

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function normalizePositiveBigint(
  input: string | number | bigint | undefined | null
): bigint | null {
  try {
    if (input === undefined || input === null) return null;
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

async function tryGetFidFromFarcasterSdk(): Promise<number | null> {
  try {
    const mod: any = await import("@farcaster/frame-sdk");
    const sdk: any = mod?.sdk ?? mod?.default ?? mod;
    const ctx =
      (typeof sdk?.getContext === "function"
        ? await sdk.getContext()
        : sdk?.context && typeof sdk.context.then === "function"
        ? await sdk.context
        : null) ?? null;

    const fid = ctx?.user?.fid ?? ctx?.fid ?? null;
    return typeof fid === "number" && fid > 0 ? fid : null;
  } catch {
    return null;
  }
}

/* cognitionBias → profile enum */
function biasToProfileEnum(bias: number): number {
  switch (bias) {
    case 0: return 0; // EXECUTOR
    case 1: return 1; // OBSERVER
    case 3: return 3; // SENTINEL
    case 2:
    default: return 2; // OPERATOR
  }
}

const PROFILE_LABEL = ["EXECUTOR", "OBSERVER", "OPERATOR", "SENTINEL"];

const PROFILE_DESC = [
  "Optimized for resolution. Acts decisively once certainty is declared.",
  "Retains context across time. Defers action to preserve continuity.",
  "Balances outcome and adaptability. Operates despite incomplete information.",
  "Assumes hostile conditions. Treats absence of data as signal.",
];

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
  /* identity resolution */
  const tokenIdFromProps = useMemo(
    () => normalizePositiveBigint(tokenId),
    [tokenId]
  );

  const [fidBig, setFidBig] = useState<bigint | null>(null);
  const resolvedTokenId = tokenIdFromProps ?? fidBig;

  /* episode state */
  const [phase, setPhase] = useState<"intro" | "analysis" | "projection" | "lock">("intro");
  const [chainStatus, setChainStatus] = useState("Idle");
  const [bias, setBias] = useState<number | null>(null);
  const [alreadySet, setAlreadySet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [readBusy, setReadBusy] = useState(false);

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

  /* ───────── identity wiring (same as Ep3) ───────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (tokenIdFromProps && tokenIdFromProps > 0n) return;

      const cached = loadCachedFid();
      if (!cancelled && cached) setFidBig(cached);

      const fid = await tryGetFidFromFarcasterSdk();
      if (cancelled) return;

      if (fid && fid > 0) {
        const b = BigInt(fid);
        setFidBig(b);
        cacheFid(b);
      }
    })();

    const sync = () => {
      if (tokenIdFromProps) return;
      const cached = loadCachedFid();
      if (cached) setFidBig(cached);
    };

    window.addEventListener("basebots-fid-updated", sync);
    return () => window.removeEventListener("basebots-fid-updated", sync);
  }, [tokenIdFromProps]);

  /* ───────── HARD-GATED CHAIN READ ───────── */

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

      if (!state) {
        setChainStatus("Cognition not initialized");
        setBias(null);
        return;
      }

      const cognitionBias = Number(state.cognitionBias);
      const ep3Set = Boolean(state.ep3Set);
      const ep4Set = Boolean(state.ep4Set);

      if (!ep3Set) {
        setChainStatus("Prior cognition missing (Episode 3 required)");
        setBias(null);
        return;
      }

      setBias(Number.isFinite(cognitionBias) ? cognitionBias : null);

      if (ep4Set) {
        setAlreadySet(true);
        setPhase("lock");
        setChainStatus("Surface profile already registered");
      } else {
        setChainStatus("Profile pending");
      }
    } catch (e: any) {
      setChainStatus(e?.shortMessage || "Chain read failed");
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
  }, [resolvedTokenId]);

  /* ───────── commit ───────── */

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

      await publicClient!.waitForTransactionReceipt({ hash });
      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
      setChainStatus("Surface profile registered");
    } catch (e: any) {
      setChainStatus(e?.shortMessage || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ───────── render ───────── */

  return (
    <section style={shell}>
      <div style={topRow}>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{chainStatus}</span>
      </div>

      {phase === "intro" && (
        <>
          <h2 style={title}>THRESHOLD</h2>
          <p style={body}>
            Cognition confirmed.  
            Surface posture required before deployment.
          </p>
          <button style={primaryBtn} onClick={() => setPhase("analysis")}>
            Continue
          </button>
        </>
      )}

      {phase === "analysis" && (
        <>
          <p style={body}>Oversight isolates your dominant bias.</p>
          <div style={monoBox}>
            {bias !== null ? `COGNITION_BIAS :: ${bias}` : "CLASSIFYING…"}
          </div>

          <button
            style={{ ...primaryBtn, opacity: bias !== null ? 1 : 0.5 }}
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
            <div style={cardTitle}>{PROFILE_LABEL[profileEnum]}</div>
            <div style={cardDesc}>{PROFILE_DESC[profileEnum]}</div>
          </div>

          <button style={primaryBtn} onClick={commit} disabled={submitting}>
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

/* ───────── styles ───────── */

const shell: CSSProperties = {
  borderRadius: 28,
  padding: 24,
  color: "white",
  border: "1px solid rgba(168,85,247,0.35)",
  background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.78))",
};

const topRow: CSSProperties = { marginBottom: 18 };
const title: CSSProperties = { fontSize: 24, fontWeight: 900 };
const body: CSSProperties = { marginTop: 12, opacity: 0.78 };
const monoBox: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
};
const card: CSSProperties = {
  marginTop: 14,
  padding: 16,
  borderRadius: 20,
  background: "rgba(255,255,255,0.06)",
};
const cardTitle: CSSProperties = { fontSize: 18, fontWeight: 900 };
const cardDesc: CSSProperties = { fontSize: 12, opacity: 0.7 };
const primaryBtn: CSSProperties = {
  marginTop: 22,
  width: "100%",
  padding: "14px",
  borderRadius: 999,
  fontWeight: 900,
};
const secondaryBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "12px",
  borderRadius: 999,
};
const locked: CSSProperties = { marginTop: 12, fontWeight: 900 };
