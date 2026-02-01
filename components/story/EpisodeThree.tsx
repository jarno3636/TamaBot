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

// reuse the same fid cache key Episode 2 uses
const FID_KEY = "basebots_fid_v1";

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

function normalizePositiveBigint(
  input: string | number | bigint | undefined | null
): bigint | null {
  try {
    if (input === undefined || input === null) return null;
    if (typeof input === "bigint") return input > 0n ? input : null;

    // pulls first digit-run from strings like "fid: 1051488"
    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return null;

    const v = BigInt(digits);
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

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeThree({
  tokenId,
  onExit,
}: {
  tokenId?: string | number | bigint; // optional now
  onExit: () => void;
}) {
  // tokenId from parent if present
  const tokenIdFromProps = useMemo(
    () => normalizePositiveBigint(tokenId),
    [tokenId]
  );

  // fid-derived identity fallback (same model as Ep2)
  const [fidBig, setFidBig] = useState<bigint | null>(null);
  const [fidStatus, setFidStatus] = useState<string>("");

  // resolved identity: tokenId if provided else fid
  const resolvedTokenId = tokenIdFromProps ?? fidBig;

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

  /* ────────────────────────────────────────────── */
  /* FID auto-detect (Ep2 pattern) */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (tokenIdFromProps && tokenIdFromProps > 0n) {
        setFidStatus("identity: using tokenId");
        return;
      }

      const cached = loadCachedFid();
      if (!cancelled && cached && cached > 0n) {
        setFidBig(cached);
        setFidStatus(`identity: cached fid ${cached.toString()}`);
      } else if (!cancelled) {
        setFidStatus("identity: probing farcaster…");
      }

      const fid = await tryGetFidFromFarcasterSdk();
      if (cancelled) return;

      if (typeof fid === "number" && fid > 0) {
        const b = BigInt(fid);
        setFidBig(b);
        cacheFid(b);
        setFidStatus(`identity: fid ${fid}`);
      } else {
        setFidStatus(cached ? `identity: cached fid ${cached}` : "identity: not ready");
      }
    })();

    const onFidUpdate = () => {
      if (tokenIdFromProps && tokenIdFromProps > 0n) return;
      const cached = loadCachedFid();
      if (cached && cached > 0n) {
        setFidBig(cached);
        setFidStatus(`identity: synced fid ${cached.toString()}`);
      }
    };

    window.addEventListener("basebots-fid-updated", onFidUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("basebots-fid-updated", onFidUpdate);
    };
  }, [tokenIdFromProps]);

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
  /* Read chain: ep3Set is state[10] */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient) return;

    if (!resolvedTokenId) {
      setChainStatus("Waiting for identity…");
      return;
    }
    if (resolvedTokenId <= 0n) {
      setChainStatus("Invalid identity");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading cognition state…");
        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [resolvedTokenId],
        });

        const ep3Set = Boolean(state?.[10]);

        if (cancelled) return;

        if (ep3Set) {
          setAlreadySet(true);
          setPhase("lock");
          setChainStatus("Cognition already set");
        } else {
          setChainStatus("Awaiting cognition");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, resolvedTokenId]);

  /* ────────────────────────────────────────────── */
  /* Secret Echo: GUARANTEED when entering context */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "context") return;

    // if already unlocked, don’t show
    if (localStorage.getItem(BONUS_KEY)) return;

    // guarantee it shows while user is in-context
    const t = setTimeout(() => {
      setShowEcho(true);
      const t2 = setTimeout(() => setShowEcho(false), 3000);
      // cleanup inner timeout too
      return () => clearTimeout(t2);
    }, 1200);

    return () => clearTimeout(t);
  }, [phase]);

  function unlockEcho() {
    try {
      localStorage.setItem(BONUS_KEY, "true");
    } catch {}
    try {
      window.dispatchEvent(new Event("basebots-progress-updated"));
    } catch {}
    setShowEcho(false);
    setChainStatus("Anomaly captured");
  }

  /* ────────────────────────────────────────────── */
  /* Commit: simulate → write(request) (Ep2-grade) */
  /* ────────────────────────────────────────────── */

  async function commit() {
    // NEVER silently do nothing
    if (submitting) return;
    if (alreadySet) {
      setChainStatus("Already locked");
      return;
    }
    if (!resolvedTokenId || resolvedTokenId <= 0n) {
      setChainStatus("Identity not ready");
      return;
    }
    if (!publicClient) {
      setChainStatus("No public client");
      return;
    }
    if (!address) {
      setChainStatus("Connect wallet to continue");
      return;
    }

    const s = loadState();
    if (!s.contradiction || !s.signal) {
      setChainStatus("Make both choices first");
      return;
    }

    let bias = 2; // PRAGMATIC
    if (s.contradiction === "RESOLVE" && s.signal === "FILTER") bias = 0; // DETERMINISTIC
    if (s.contradiction === "PRESERVE" && s.signal === "LISTEN") bias = 1; // ARCHIVAL
    if (s.contradiction === "PRESERVE" && s.signal === "FILTER") bias = 3; // PARANOID

    try {
      setSubmitting(true);

      if (!isBase) {
        setChainStatus("Switching to Base…");
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      setChainStatus("Preparing transaction…");

      const { request } = await publicClient.simulateContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode3",
        args: [resolvedTokenId, bias],
        account: address,
      });

      setChainStatus("Awaiting signature…");

      const hash = await writeContractAsync(request);

      setChainStatus("Finalizing on-chain…");
      await publicClient.waitForTransactionReceipt({ hash });

      try {
        window.dispatchEvent(new Event("basebots-progress-updated"));
      } catch {}

      setPhase("lock");
      setChainStatus("Cognitive frame locked");
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

  return (
    <section style={shell}>
      {/* utility row */}
      <div style={topRow}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{chainStatus}</span>
          {!!fidStatus && (
            <span style={{ fontSize: 10, opacity: 0.55 }}>{fidStatus}</span>
          )}
        </div>

        <button
          type="button"
          style={soundBtn}
          onClick={() => setSoundOn((v) => !v)}
        >
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {/* secret echo */}
      {showEcho && (
        <button type="button" onClick={unlockEcho} style={echo}>
          <div style={{ opacity: 0.9 }}>▒▒ ERRANT CODE ▒▒</div>
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            tap to capture anomaly
          </div>
        </button>
      )}

      {phase === "intro" && (
        <>
          <h2 style={title}>FAULT LINES</h2>
          <p style={body}>
            Two internal models predict opposite outcomes. Oversight pauses your
            pipeline and asks a single question:
            <br />
            <b>Do you force agreement—or learn to operate while split?</b>
          </p>

          <button
            type="button"
            style={primaryBtn}
            onClick={() => setPhase("context")}
          >
            Continue
          </button>
        </>
      )}

      {phase === "context" && (
        <>
          <p style={body}>
            The contradiction isn’t noise — it’s evidence.
            <br />
            Pick how you handle internal disagreement.
          </p>

          <button
            type="button"
            style={primaryBtn}
            onClick={() => setPhase("contradiction")}
          >
            Evaluate contradiction
          </button>
        </>
      )}

      {phase === "contradiction" && (
        <>
          <button
            type="button"
            style={choiceBtn}
            onClick={() => {
              saveState({ contradiction: "RESOLVE" });
              setPhase("signal");
              setChainStatus("Choice recorded");
            }}
          >
            Resolve contradiction
            <div style={choiceNote}>
              You force alignment. You’d rather be wrong consistently than
              unstable.
            </div>
          </button>

          <button
            type="button"
            style={choiceBtn}
            onClick={() => {
              saveState({ contradiction: "PRESERVE" });
              setPhase("signal");
              setChainStatus("Choice recorded");
            }}
          >
            Preserve contradiction
            <div style={choiceNote}>
              You keep both interpretations alive. Truth can be plural until it
              collapses.
            </div>
          </button>
        </>
      )}

      {phase === "signal" && (
        <>
          <p style={body}>
            Next: how you treat the outside world when you’re already split.
          </p>

          <button
            type="button"
            style={choiceBtn}
            onClick={() => {
              saveState({ signal: "FILTER" });
              setPhase("synthesis");
              setChainStatus("Choice recorded");
            }}
          >
            Filter incoming signal
            <div style={choiceNote}>
              Reduce noise. Optimize for certainty, even if it costs insight.
            </div>
          </button>

          <button
            type="button"
            style={choiceBtn}
            onClick={() => {
              saveState({ signal: "LISTEN" });
              setPhase("synthesis");
              setChainStatus("Choice recorded");
            }}
          >
            Listen to fragments
            <div style={choiceNote}>
              Accept instability to gain detail. You can survive turbulence.
            </div>
          </button>
        </>
      )}

      {phase === "synthesis" && (
        <>
          <p style={body}>
            This cognition will persist across future audits.
            <br />
            Commit it on-chain.
          </p>

          <button
            type="button"
            style={{
              ...primaryBtn,
              opacity:
                submitting || !resolvedTokenId || alreadySet ? 0.55 : 1,
            }}
            onClick={commit}
            disabled={submitting || !resolvedTokenId || alreadySet}
          >
            {submitting ? "COMMITTING…" : "Commit cognition"}
          </button>

          <button type="button" style={secondaryBtn} onClick={onExit}>
            Exit
          </button>
        </>
      )}

      {phase === "lock" && (
        <>
          <p style={{ fontWeight: 900, marginTop: 8 }}>
            COGNITIVE FRAME LOCKED
          </p>
          <button type="button" style={secondaryBtn} onClick={onExit}>
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
  fontWeight: 600,
};

const soundBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap",
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
  color: "rgba(255,255,255,0.92)",
  fontSize: 10,
  fontFamily: "monospace",
  letterSpacing: 1,
  boxShadow: "0 0 24px rgba(56,189,248,0.25)",
};
