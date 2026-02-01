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

// match Ep2/Ep3 fid cache key
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

    // pull first digit run (handles strings like "fid: 1434171")
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
    const raw = localStorage.getItem(FID_KEY);
    return normalizePositiveBigint(raw);
  } catch {
    return null;
  }
}

function cacheFid(fid: bigint) {
  try {
    localStorage.setItem(FID_KEY, fid.toString());
  } catch {}
  try {
    window.dispatchEvent(new Event("basebots-fid-updated"));
  } catch {}
}

/**
 * Try to extract fid from Farcaster Frame SDK (dynamic import).
 */
async function tryGetFidFromFarcasterSdk(): Promise<number | null> {
  try {
    const mod: any = await import("@farcaster/frame-sdk");
    const sdk: any = mod?.sdk ?? mod?.default ?? mod;

    const ctx =
      (typeof sdk?.getContext === "function" ? await sdk.getContext() : null) ??
      (sdk?.context && typeof sdk.context.then === "function"
        ? await sdk.context
        : null) ??
      null;

    const fid = ctx?.user?.fid ?? ctx?.fid ?? ctx?.client?.user?.fid ?? null;
    return typeof fid === "number" && fid > 0 ? fid : null;
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

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeFour({
  tokenId,
  onExit,
}: {
  tokenId?: string | number | bigint; // optional
  onExit: () => void;
}) {
  const tokenIdFromProps = useMemo(
    () => normalizePositiveBigint(tokenId),
    [tokenId]
  );

  // fid fallback (Ep2/Ep3 wiring)
  const [fidBig, setFidBig] = useState<bigint | null>(null);
  const [identityStatus, setIdentityStatus] = useState<string>("");

  const resolvedTokenId = tokenIdFromProps ?? fidBig;

  const [phase, setPhase] = useState<"intro" | "analysis" | "projection" | "lock">(
    "intro"
  );

  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");

  const [bias, setBias] = useState<number | null>(null);
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

  /* ────────────────────────────────────────────── */
  /* Identity wiring (tokenId OR fid) */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // if we have tokenId, use it and skip fid probing
      if (tokenIdFromProps && tokenIdFromProps > 0n) {
        setIdentityStatus(`identity: tokenId ${tokenIdFromProps.toString()}`);
        return;
      }

      const cached = loadCachedFid();
      if (!cancelled && cached && cached > 0n) {
        setFidBig(cached);
        setIdentityStatus(`identity: cached fid ${cached.toString()}`);
      } else if (!cancelled) {
        setIdentityStatus("identity: probing farcaster…");
      }

      const fid = await tryGetFidFromFarcasterSdk();
      if (cancelled) return;

      if (typeof fid === "number" && fid > 0) {
        const b = BigInt(fid);
        setFidBig(b);
        cacheFid(b);
        setIdentityStatus(`identity: fid ${fid}`);
      } else {
        setIdentityStatus(cached ? `identity: cached fid ${cached}` : "identity: not ready");
      }
    })();

    const onFidUpdate = () => {
      if (tokenIdFromProps && tokenIdFromProps > 0n) return;
      const cached = loadCachedFid();
      if (cached && cached > 0n) {
        setFidBig(cached);
        setIdentityStatus(`identity: synced fid ${cached.toString()}`);
      }
    };

    window.addEventListener("basebots-fid-updated", onFidUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("basebots-fid-updated", onFidUpdate);
    };
  }, [tokenIdFromProps]);

  /* ────────────────────────────────────────────── */
  /* Chain read (extracted into callable) */
  /* ────────────────────────────────────────────── */

  async function readChainState(targetId: bigint) {
    if (!publicClient) {
      setChainStatus("No public client");
      return;
    }

    setReadBusy(true);
    try {
      setChainStatus("Reading cognition…");

      const state: any = await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getBotState",
        args: [targetId],
      });

      // getBotState tuple index map:
      // [2] cognitionBias, [11] ep4Set
      const nextBias = Number(state?.[2]);
      const ep4Set = Boolean(state?.[11]);

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
    } finally {
      setReadBusy(false);
    }
  }

  // initial read whenever identity becomes available
  useEffect(() => {
    if (!resolvedTokenId || resolvedTokenId <= 0n) {
      setChainStatus("Waiting for identity…");
      return;
    }
    void readChainState(resolvedTokenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTokenId, publicClient]);

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
  /* Commit profile (Ep2/Ep3 pattern) */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    if (!resolvedTokenId || resolvedTokenId <= 0n) {
      setChainStatus("Identity not ready");
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
      setChainStatus(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  const canProject = Boolean(resolvedTokenId && resolvedTokenId > 0n);
  const canProceedToProjection = canProject && bias !== null;

  return (
    <section style={shell}>
      <div style={topRow}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{chainStatus}</span>
          {!!identityStatus && (
            <span style={{ fontSize: 10, opacity: 0.55 }}>{identityStatus}</span>
          )}
        </div>

        <button style={soundBtn} onClick={() => setSoundOn((s) => !s)}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 style={title}>THRESHOLD</h2>
          <p style={body}>
            Oversight opens a sealed channel. The message is short:
            <br />
            <b>“Cognition confirmed. Surface posture required.”</b>
            <br />
            <br />
            Out there, you won’t be judged by what you are —
            <br />
            only by what you do when someone is watching.
          </p>

          <button
            style={{ ...primaryBtn, opacity: canProject ? 1 : 0.6 }}
            onClick={() => setPhase("analysis")}
            disabled={!canProject}
            type="button"
          >
            {canProject ? "Continue" : "Waiting for identity…"}
          </button>
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
              onClick={() => {
                if (resolvedTokenId) void readChainState(resolvedTokenId);
              }}
              disabled={!resolvedTokenId || readBusy}
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
              If you’re seeing “CLASSIFYING…” forever, your identity wasn’t available
              or the chain read didn’t run. Hit <b>Refresh</b>.
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
                style={primaryBtn}
                onClick={commit}
                disabled={submitting}
              >
                {submitting ? "AUTHORIZING…" : "Authorize surface profile"}
              </button>

              <button
                type="button"
                style={secondaryBtn}
                onClick={onExit}
              >
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
/* Styles (match Ep2/Ep3) */
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
  alignItems: "flex-start",
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
