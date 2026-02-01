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

const EP1_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep2_sound";
const BASE_CHAIN_ID = 8453;

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile?: { archetype?: string };
};

type Phase = "descent" | "input" | "binding" | "approach";

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function loadEp1(): Ep1Save | null {
  try {
    const raw = localStorage.getItem(EP1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function validateDesignation(v: string) {
  if (!/^[A-Z0-9]+$/.test(v)) return "ONLY A–Z AND 0–9 ALLOWED";
  if (v.length !== 7) return "DESIGNATION MUST BE EXACTLY 7 CHARACTERS";
  return null;
}

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

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeTwo({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);
  const ep1 = useMemo(() => loadEp1(), []);

  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");
  const [submitting, setSubmitting] = useState(false);

  /* wagmi */
  const { address, chain, connector, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // IMPORTANT: Farcaster may show “Connected” while walletClient is undefined.
  // So we write using useWriteContract (connector-backed), not walletClient.
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const isBase = chain?.id === BASE_CHAIN_ID;
  const readyToRead = Boolean(publicClient && tokenIdBig);
  const readyToWrite = Boolean(address && publicClient && tokenIdBig);

  /* ────────────────────────────────────────────── */
  /* Audio: s2.mp3 loop + mute toggle */
  /* ────────────────────────────────────────────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  // load preference
  useEffect(() => {
    try {
      const pref = localStorage.getItem(SOUND_KEY);
      if (pref === "off") setSoundOn(false);
    } catch {}
  }, []);

  // init audio after mount
  useEffect(() => {
    const a = new Audio("/audio/s2.mp3");
    a.loop = true;
    a.volume = 0.6;
    audioRef.current = a;

    // attempt autoplay (may be blocked until user interaction)
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

  // apply toggle
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
  /* Read EP2 state */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!readyToRead) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading designation state…");

        const state: any = await publicClient!.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig!],
        });

        const ep2Set =
          state?.ep2Set ??
          state?.episode2Set ??
          (Array.isArray(state) ? state[2] : false);

        if (!cancelled && ep2Set) {
          setAlreadySet(true);
          setPhase("approach");
          setChainStatus("Designation already bound");
        } else if (!cancelled) {
          setChainStatus("Awaiting designation");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readyToRead, publicClient, tokenIdBig]);

  /* ────────────────────────────────────────────── */
  /* Commit designation */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    setError(null);

    if (!tokenIdBig) {
      setError("INVALID TOKEN ID");
      return;
    }

    const err = validateDesignation(value);
    if (err) {
      setError(err);
      return;
    }

    if (!readyToWrite) {
      // This is the only “connect” gate now — address is the truth.
      setError("CONNECT WALLET TO CONTINUE");
      return;
    }

    try {
      setSubmitting(true);

      // switch to Base if needed (best-effort)
      if (!isBase) {
        setChainStatus("Switching to Base…");
        try {
          await switchChainAsync({ chainId: BASE_CHAIN_ID });
        } catch {
          // Some wallets block programmatic switching; user must do it.
          setError("SWITCH TO BASE IN WALLET TO CONTINUE");
          setChainStatus("Wrong network");
          return;
        }
      }

      // simulate first (forces gas estimation + catches reverts)
      setChainStatus("Preparing transaction…");
      const { request } = await publicClient!.simulateContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [tokenIdBig, value],
        account: address!,
      });

      setChainStatus("Awaiting signature…");

      // write via wagmi (does not require walletClient hook)
      const hash = await writeContractAsync(request as any);

      setChainStatus("Finalizing on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));

      setChainStatus("Designation committed");
      setPhase("binding");
      setTimeout(() => setPhase("approach"), 1400);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "TRANSACTION REJECTED");
      setChainStatus("Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section style={shell}>
      {/* console row (helps you debug Farcaster) */}
      <div style={consoleRow}>
        <span>
          status: <b>{chainStatus}</b> • chain: <b>{chain?.id ?? "none"}</b> •{" "}
          addr: <b>{address ? "yes" : "no"}</b> • conn:{" "}
          <b>{connector?.name ?? (isConnected ? "connected" : "none")}</b>
        </span>

        <button
          type="button"
          onClick={() => setSoundOn((s) => !s)}
          style={soundBtn}
        >
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {phase === "descent" && (
        <>
          <h2 style={title}>VERTICAL TRANSFER</h2>

          <p style={body}>
            Elevation protocols engage. Your prior posture propagates upward.
            <br />
            Oversight reconstructs your pattern from residue alone.
          </p>

          <div style={callout}>
            <div style={calloutLabel}>ARCTYPE TRACE</div>
            <div style={calloutValue}>
              {ep1?.profile?.archetype ?? "UNRESOLVED"}
            </div>
          </div>

          <button style={primaryBtn} onClick={() => setPhase("input")}>
            Continue
          </button>
        </>
      )}

      {phase === "input" && (
        <>
          <h2 style={title}>ASSIGN DESIGNATION</h2>

          <p style={body}>
            Upper systems require a stable identifier.
            <br />
            This value will persist across all future audits.
          </p>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            style={inputStyle}
            placeholder="XXXXXXX"
          />

          <div style={hintRow}>
            <span style={{ opacity: 0.7 }}>
              Format: <b>A–Z / 0–9</b> • Length: <b>7</b>
            </span>
            <span style={{ opacity: 0.7 }}>
              Network: <b>{isBase ? "Base" : "Not Base"}</b>
            </span>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <button
            style={{
              ...primaryBtn,
              opacity: submitting || alreadySet ? 0.55 : 1,
            }}
            disabled={submitting || alreadySet}
            onClick={commit}
          >
            {submitting ? "CONFIRMING…" : "CONFIRM DESIGNATION"}
          </button>

          <button style={secondaryBtn} onClick={onExit}>
            Exit
          </button>
        </>
      )}

      {phase === "binding" && (
        <div style={mono}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>AUDIT LAYER</div>
          <div style={{ marginTop: 10, fontSize: 16, letterSpacing: 2 }}>
            IDENTITY LOCKED
          </div>
        </div>
      )}

      {phase === "approach" && (
        <>
          <h2 style={title}>RECOGNIZED</h2>
          <p style={body}>
            Designation accepted.
            <br />
            Oversight now recognizes continuity.
          </p>

          <button style={primaryBtn} onClick={onExit}>
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
  background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.72))",
  boxShadow: "0 0 80px rgba(168,85,247,0.45)",
};

const consoleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 11,
  opacity: 0.8,
  marginBottom: 14,
};

const soundBtn: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.9)",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 900,
  letterSpacing: 1,
};

const title: CSSProperties = { fontSize: 24, fontWeight: 900 };

const body: CSSProperties = {
  marginTop: 10,
  opacity: 0.78,
  lineHeight: 1.65,
};

const callout: CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
};

const calloutLabel: CSSProperties = {
  fontSize: 11,
  letterSpacing: 2,
  opacity: 0.65,
  fontWeight: 900,
};

const calloutValue: CSSProperties = {
  marginTop: 6,
  fontSize: 16,
  fontWeight: 900,
};

const hintRow: CSSProperties = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 12,
};

const mono: CSSProperties = {
  marginTop: 48,
  textAlign: "center",
  fontFamily: "monospace",
  letterSpacing: 2,
  opacity: 0.92,
};

const primaryBtn: CSSProperties = {
  marginTop: 18,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 999,
  fontWeight: 900,
  background: "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.9))",
  color: "#020617",
  boxShadow: "0 0 24px rgba(168,85,247,0.6)",
};

const secondaryBtn: CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  marginTop: 18,
  width: "100%",
  padding: "14px",
  textAlign: "center",
  fontSize: 18,
  letterSpacing: 4,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(168,85,247,0.45)",
  color: "white",
  outline: "none",
};

const errorStyle: CSSProperties = {
  color: "#fca5a5",
  fontSize: 12,
  marginTop: 10,
};
