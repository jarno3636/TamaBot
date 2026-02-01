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
import {
  bytesToString,
  hexToBytes,
  isHex,
  pad,
  stringToHex,
  type Hex,
} from "viem";

/* ────────────────────────────────────────────── */
/* Constants */
/* ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep2_sound";
const FID_KEY = "basebots_fid_v1";
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

function normalizePositiveBigint(
  input: string | number | bigint | undefined | null
): bigint | null {
  try {
    if (input === undefined || input === null) return null;
    if (typeof input === "bigint") return input > 0n ? input : null;

    // Pull first digit-run from strings like "fid: 1051488"
    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return null;

    const id = BigInt(digits);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}

/**
 * Contract expects bytes7 (NOT string).
 * Encode 7-char A–Z/0–9 -> bytes7 (right padded with 0x00).
 */
function encodeDesignationBytes7(desig: string): Hex {
  // For A–Z/0–9 this is deterministic 1 byte per char.
  return pad(stringToHex(desig), { size: 7 });
}

/**
 * Decode bytes7 -> string (trim nulls).
 */
function decodeBytes7ToString(v: unknown): string {
  try {
    if (typeof v === "string" && isHex(v)) {
      const bytes = hexToBytes(v); // Uint8Array
      return bytesToString(bytes).replace(/\u0000/g, "").trim();
    }
    // Some clients may already give Uint8Array; handle it too.
    if (v instanceof Uint8Array) {
      return bytesToString(v).replace(/\u0000/g, "").trim();
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Try to extract fid from Farcaster Frame SDK (Mini App / Frame context).
 * Uses dynamic import so builds don't fail if the SDK isn't installed.
 */
async function tryGetFidFromFarcasterSdk(): Promise<number | null> {
  try {
    const mod: any = await import("@farcaster/frame-sdk");
    const sdk: any = mod?.sdk ?? mod?.default ?? mod;

    // Support multiple SDK shapes across versions:
    // - sdk.context (promise)
    // - sdk.getContext() (fn)
    // - sdk?.actions?.ready() etc (not needed here)
    const ctx =
      (typeof sdk?.getContext === "function" ? await sdk.getContext() : null) ??
      (sdk?.context && typeof sdk.context.then === "function"
        ? await sdk.context
        : null) ??
      null;

    const fid = ctx?.user?.fid ?? ctx?.fid ?? null;
    if (typeof fid === "number" && fid > 0) return fid;

    // Some contexts nest deeper
    const fid2 = ctx?.client?.user?.fid ?? null;
    if (typeof fid2 === "number" && fid2 > 0) return fid2;

    return null;
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

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeTwo({
  tokenId,
  onExit,
}: {
  tokenId?: string | number | bigint; // now optional (we can derive from fid)
  onExit: () => void;
}) {
  const ep1 = useMemo(() => loadEp1(), []);

  // tokenId provided by parent (if any)
  const tokenIdFromProps = useMemo(
    () => normalizePositiveBigint(tokenId),
    [tokenId]
  );

  // derived fid (auto-detect)
  const [fidBig, setFidBig] = useState<bigint | null>(null);
  const [fidStatus, setFidStatus] = useState<string>("fid: idle");

  // resolved identity used by contract calls (token id == fid)
  const resolvedTokenId = tokenIdFromProps ?? fidBig;

  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadySet, setAlreadySet] = useState(false);
  const [existingDesignation, setExistingDesignation] = useState<string>("");
  const [chainStatus, setChainStatus] = useState("Idle");
  const [submitting, setSubmitting] = useState(false);

  /* wagmi */
  const { address, chain, connector, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const isBase = chain?.id === BASE_CHAIN_ID;

  // IMPORTANT: NEVER treat 0 as valid.
  const readyToRead =
    Boolean(publicClient) && resolvedTokenId !== null && resolvedTokenId > 0n;
  const readyToWrite =
    Boolean(address && publicClient) &&
    resolvedTokenId !== null &&
    resolvedTokenId > 0n;

  /* ────────────────────────────────────────────── */
  /* FID auto-detect + sync */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // If parent passed tokenId, we don't need fid detection.
      if (tokenIdFromProps && tokenIdFromProps > 0n) {
        setFidStatus("fid: using parent tokenId");
        return;
      }

      // Try cached fid first (fast)
      const cached = loadCachedFid();
      if (!cancelled && cached && cached > 0n) {
        setFidBig(cached);
        setFidStatus(`fid: cached ${cached.toString()}`);
      } else if (!cancelled) {
        setFidStatus("fid: probing Farcaster…");
      }

      // Then try SDK (best source)
      const fid = await tryGetFidFromFarcasterSdk();
      if (cancelled) return;

      if (typeof fid === "number" && fid > 0) {
        const b = BigInt(fid);
        setFidBig(b);
        cacheFid(b);
        setFidStatus(`fid: detected ${fid}`);
      } else {
        // If we had cached, keep it; otherwise show waiting.
        setFidStatus(cached ? `fid: cached ${cached}` : "fid: not available yet");
      }
    })();

    const onFidUpdate = () => {
      // allow other parts of app to write fid into localStorage and notify
      if (tokenIdFromProps && tokenIdFromProps > 0n) return;
      const cached = loadCachedFid();
      if (cached && cached > 0n) {
        setFidBig(cached);
        setFidStatus(`fid: synced ${cached.toString()}`);
      }
    };

    window.addEventListener("basebots-fid-updated", onFidUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("basebots-fid-updated", onFidUpdate);
    };
  }, [tokenIdFromProps]);

  /* ────────────────────────────────────────────── */
  /* Audio: s2.mp3 loop + mute toggle */
  /* ────────────────────────────────────────────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    try {
      const pref = localStorage.getItem(SOUND_KEY);
      if (pref === "off") setSoundOn(false);
    } catch {}
  }, []);

  useEffect(() => {
    const a = new Audio("/audio/s2.mp3");
    a.loop = true;
    a.volume = 0.6;
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
  /* Read EP2 state (designation: state[0], ep2Set: state[9]) */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient) return;

    // Explicit status if identity not ready
    if (!resolvedTokenId) {
      setChainStatus("Waiting for identity…");
      return;
    }
    if (resolvedTokenId <= 0n) {
      setChainStatus("Invalid identity (FID/tokenId must be > 0)");
      return;
    }

    if (!readyToRead) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading designation state…");

        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [resolvedTokenId],
        });

        const desig = decodeBytes7ToString(state?.[0]);
        const ep2Set = Boolean(state?.[9]);

        if (cancelled) return;

        setExistingDesignation(desig);

        if (ep2Set) {
          setAlreadySet(true);
          setPhase("approach");
          setChainStatus(desig ? `Designation bound: ${desig}` : "Designation already bound");
        } else {
          setChainStatus("Awaiting designation");
        }
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.shortMessage || e?.message || "Chain read failed";
        setChainStatus(
          String(msg).toLowerCase().includes("execution reverted")
            ? "Chain read failed (reverted)"
            : msg
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readyToRead, publicClient, resolvedTokenId]);

  /* ────────────────────────────────────────────── */
  /* Commit designation (bytes7) */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    setError(null);

    if (!resolvedTokenId || resolvedTokenId <= 0n) {
      setError("INVALID TOKEN ID (FID NOT READY)");
      return;
    }

    const cleaned = value.trim().toUpperCase();
    const err = validateDesignation(cleaned);
    if (err) {
      setError(err);
      return;
    }

    if (!readyToWrite) {
      setError("CONNECT WALLET TO CONTINUE");
      return;
    }

    const designationBytes7 = encodeDesignationBytes7(cleaned);

    try {
      setSubmitting(true);

      if (!isBase) {
        setChainStatus("Switching to Base…");
        try {
          await switchChainAsync({ chainId: BASE_CHAIN_ID });
        } catch {
          setError("SWITCH TO BASE IN WALLET TO CONTINUE");
          setChainStatus("Wrong network");
          return;
        }
      }

      setChainStatus("Preparing transaction…");
      const { request } = await publicClient!.simulateContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [resolvedTokenId, designationBytes7],
        account: address!,
      });

      setChainStatus("Awaiting signature…");
      const hash = await writeContractAsync(request as any);

      setChainStatus("Finalizing on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));

      setExistingDesignation(cleaned);
      setChainStatus(`Designation committed: ${cleaned}`);
      setPhase("binding");
      setTimeout(() => setPhase("approach"), 1400);
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || "TRANSACTION REJECTED";
      setError(msg);

      const low = String(msg).toLowerCase();
      if (low.includes("nottokenowner")) {
        setChainStatus("You must own this Basebot to bind designation");
      } else if (low.includes("designationalreadyset")) {
        setChainStatus("Designation already set");
        setAlreadySet(true);
        setPhase("approach");
      } else if (low.includes("sequenc")) {
        setChainStatus("Sequence violation (complete previous steps)");
      } else {
        setChainStatus("Transaction failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section style={shell}>
      {/* console row (helps you debug Farcaster + identity) */}
      <div style={consoleRow}>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span>
            status: <b>{chainStatus}</b>
          </span>
          <span>• chain: <b>{chain?.id ?? "none"}</b></span>
          <span>• addr: <b>{address ? "yes" : "no"}</b></span>
          <span>• conn: <b>{connector?.name ?? (isConnected ? "connected" : "none")}</b></span>
          <span>• {fidStatus}</span>
          <span>
            • tokenId raw: <b>{String(tokenId ?? "none")}</b> → parsed:{" "}
            <b>{resolvedTokenId ? resolvedTokenId.toString() : "null"}</b>
          </span>
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
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
          />

          <div style={hintRow}>
            <span style={{ opacity: 0.7 }}>
              Format: <b>A–Z / 0–9</b> • Length: <b>7</b>
            </span>
            <span style={{ opacity: 0.7 }}>
              Network: <b>{isBase ? "Base" : "Not Base"}</b>
            </span>
          </div>

          {!!existingDesignation && (
            <div style={existingRow}>
              Existing on-chain: <b>{existingDesignation}</b>
            </div>
          )}

          {!resolvedTokenId && (
            <div style={existingRow}>
              Identity: <b>waiting for FID…</b>
            </div>
          )}

          {error && <div style={errorStyle}>{error}</div>}

          <button
            style={{
              ...primaryBtn,
              opacity: submitting || alreadySet || !resolvedTokenId ? 0.55 : 1,
            }}
            disabled={submitting || alreadySet || !resolvedTokenId}
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
            {existingDesignation ? (
              <>
                Designation accepted: <b>{existingDesignation}</b>.
                <br />
                Oversight now recognizes continuity.
              </>
            ) : (
              <>
                Designation accepted.
                <br />
                Oversight now recognizes continuity.
              </>
            )}
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
  opacity: 0.85,
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

const existingRow: CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  opacity: 0.82,
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
