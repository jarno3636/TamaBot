"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage keys (cosmetic only)
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
  tokenId: bigint;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    !!address && !!walletClient && !!publicClient && !!tokenId && isBase;

  /* ───────── read on-chain state ───────── */
  const [cognitionBias, setCognitionBias] = useState<CognitionBias | undefined>();

  useEffect(() => {
    if (!publicClient || !tokenId) return;

    (async () => {
      try {
        const state = (await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenId],
        })) as any;

        if (state?.ep4Set) {
          setAlreadySet(true);
          setPhase("lock");
        }

        if (state?.cognitionBias) {
          setCognitionBias(state.cognitionBias);
        }
      } catch {
        // silent
      }
    })();
  }, [tokenId, publicClient]);

  const profile = useMemo(
    () => biasToProfile(cognitionBias),
    [cognitionBias]
  );

  /* ───────── sound ───────── */
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off"
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/audio/s4.mp3");
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    if (soundOn) audio.play().catch(() => {});
    return () => audio.pause();
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundOn) {
      a.pause();
      a.currentTime = 0;
      return;
    }
    a.play().catch(() => {});
  }, [soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  }

  /* ───────── commit profile (ON-CHAIN) ───────── */
  async function finalize() {
    if (alreadySet || submitting) return;
    if (!ready || !profile) return;

    setSubmitting(true);

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode4Profile",
        args: [tokenId, profile],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setPhase("lock");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

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
          "radial-gradient(900px 380px at 50% -10%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.80))",
        boxShadow: "0 60px 220px rgba(0,0,0,0.9)",
      }}
    >
      {/* scanlines */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.07,
        }}
      />

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={toggleSound} style={{ fontSize: 11 }}>
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} style={{ fontSize: 11 }}>
          Exit
        </button>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>
            THRESHOLD
          </h2>

          <p style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>
            You are no longer being observed for accuracy.
          </p>

          <button onClick={() => setPhase("analysis")} style={{ marginTop: 20 }}>
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
              padding: "10px",
              fontFamily: "monospace",
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
            Behavioral role projected for surface deployment:
          </p>

          <div
            style={{
              marginTop: 14,
              borderRadius: 20,
              padding: "14px",
              textAlign: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>
              {profile}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
              {profileDescription(profile)}
            </div>
          </div>

          <button
            onClick={finalize}
            disabled={submitting}
            style={{ marginTop: 20 }}
          >
            {submitting ? "AUTHORIZING…" : "Authorize profile"}
          </button>
        </>
      )}

      {/* LOCK */}
      {phase === "lock" && (
        <>
          <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 2 }}>
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
