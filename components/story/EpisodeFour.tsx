"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage
 * ────────────────────────────────────────────── */

const SOUND_KEY = "basebots_ep4_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Phase = "intro" | "analysis" | "projection" | "lock";

type CognitionBias =
  | "DETERMINISTIC"
  | "ARCHIVAL"
  | "PRAGMATIC"
  | "PARANOID";

type Profile =
  | "EXECUTOR"
  | "OBSERVER"
  | "OPERATOR"
  | "SENTINEL";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function normalizeTokenId(input: string | number | bigint): bigint | null {
  try {
    if (typeof input === "bigint") return input;
    if (typeof input === "number")
      return Number.isFinite(input) ? BigInt(Math.floor(input)) : null;
    if (typeof input === "string" && input.trim())
      return BigInt(input.trim());
    return null;
  } catch {
    return null;
  }
}

function biasToProfile(bias?: CognitionBias): Profile {
  switch (bias) {
    case "DETERMINISTIC":
      return "EXECUTOR";
    case "ARCHIVAL":
      return "OBSERVER";
    case "PARANOID":
      return "SENTINEL";
    case "PRAGMATIC":
    default:
      return "OPERATOR";
  }
}

function profileDescription(profile: Profile): string {
  switch (profile) {
    case "EXECUTOR":
      return "Optimized for resolution. Acts decisively once certainty is declared.";
    case "OBSERVER":
      return "Retains context across time. Defers action to preserve continuity.";
    case "SENTINEL":
      return "Assumes hostile conditions. Treats absence of data as signal.";
    case "OPERATOR":
    default:
      return "Balances outcome and adaptability. Proceeds despite incomplete information.";
  }
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeFour({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  /* ───────── hydration ───────── */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  /* ───────── state ───────── */
  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");

  /* ───────── chain derived ───────── */
  const [cognitionBias, setCognitionBias] = useState<CognitionBias | undefined>();

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    Boolean(address && walletClient && publicClient && isBase && tokenIdBig);

  /* ───────── read chain state ───────── */
  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading chain…");

        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig],
        });

        if (cancelled) return;

        if (state?.cognitionBias) {
          setCognitionBias(state.cognitionBias);
        }

        const ep4Set =
          state?.ep4Set ??
          state?.episode4Set ??
          (Array.isArray(state) ? state[4] : false);

        if (ep4Set) {
          setAlreadySet(true);
          setPhase("lock");
          setChainStatus("Profile already registered");
        } else {
          setChainStatus("Profile pending");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenIdBig]);

  const profile = useMemo(
    () => biasToProfile(cognitionBias),
    [cognitionBias]
  );

  /* ───────── sound ───────── */
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    if (!soundOn) {
      a.pause();
      a.currentTime = 0;
    } else {
      a.play().catch(() => {});
    }
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    } catch {}
  }, [soundOn]);

  /* ───────── commit profile ───────── */
  async function finalize() {
    if (alreadySet || submitting) return;
    if (!ready || !profile) return;

    setSubmitting(true);
    setChainStatus("Authorizing profile…");

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode4Profile",
        args: [tokenIdBig!, profile],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setChainStatus("Profile registered");
      setPhase("lock");
    } catch {
      setChainStatus("Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ──────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────── */

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(900px 380px at 50% -10%, rgba(56,189,248,0.10), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.80))",
        boxShadow: "0 60px 220px rgba(0,0,0,0.9)",
      }}
    >
      {/* boot console */}
      <div style={{ fontSize: 11, opacity: 0.78, marginBottom: 14 }}>
        Boot: {hydrated ? "hydrated" : "hydrating"} • tokenId:{" "}
        <b>{tokenIdBig ? tokenIdBig.toString() : "INVALID"}</b> • chain:{" "}
        <b>{isBase ? "Base" : chain?.id ?? "none"}</b> • status:{" "}
        <b>{chainStatus}</b>
      </div>

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setSoundOn((s) => !s)} style={{ fontSize: 11 }}>
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} style={{ fontSize: 11 }}>
          Exit
        </button>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
            THRESHOLD
          </h2>

          <p style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>
            Observation has concluded. You are being prepared for deployment.
          </p>

          <button onClick={() => setPhase("analysis")} style={{ marginTop: 22 }}>
            Continue
          </button>
        </>
      )}

      {/* ANALYSIS */}
      {phase === "analysis" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Derived cognitive behavior:
          </p>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              padding: 12,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 13,
              letterSpacing: 2,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            {cognitionBias ?? "UNCLASSIFIED"}
          </div>

          <button onClick={() => setPhase("projection")} style={{ marginTop: 20 }}>
            Simulate surface conditions
          </button>
        </>
      )}

      {/* PROJECTION */}
      {phase === "projection" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Projected operational role:
          </p>

          <div
            style={{
              marginTop: 14,
              borderRadius: 20,
              padding: 16,
              textAlign: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3 }}>
              {profile}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
              {profileDescription(profile)}
            </div>
          </div>

          <button
            onClick={finalize}
            disabled={submitting}
            style={{ marginTop: 22 }}
          >
            {submitting ? "AUTHORIZING…" : "Authorize profile"}
          </button>
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              letterSpacing: 2,
              opacity: 0.85,
            }}
          >
            SURFACE PROFILE REGISTERED
          </p>

          <button onClick={onExit} style={{ marginTop: 20 }}>
            Return to hub
          </button>
        </>
      )}
    </section>
  );
}
