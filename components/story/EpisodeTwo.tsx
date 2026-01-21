"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep2_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile?: { archetype?: string };
};

type Phase = "descent" | "input" | "binding" | "approach";

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function loadEp1(): Ep1Save | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(EP1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function validateDesignation(v: string) {
  if (!/^[A-Z0-9]*$/.test(v)) return "ONLY A–Z AND 0–9 ALLOWED";
  if (v.length !== 7) return "DESIGNATION MUST BE EXACTLY 7 CHARACTERS";
  return null;
}

function normalizeTokenId(input: string | number | bigint): bigint | null {
  try {
    if (typeof input === "bigint") return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input) || input < 0) return null;
      return BigInt(Math.floor(input));
    }
    if (typeof input === "string" && input.trim()) return BigInt(input.trim());
    return null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeTwo({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  /* ───────── hydration safety ───────── */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  /* ───────── episode state ───────── */
  const ep1 = useMemo(() => loadEp1(), []);
  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    Boolean(address && walletClient && publicClient && isBase && tokenIdBig);

  /* ───────── chain read (EP2) ───────── */
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

        const ep2Set =
          state?.ep2Set ??
          state?.episode2Set ??
          (Array.isArray(state) ? state[2] : false);

        if (!cancelled && ep2Set) {
          setAlreadySet(true);
          setPhase("approach");
          setChainStatus("Designation already set");
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
  }, [publicClient, tokenIdBig]);

  /* ───────── ambient glitch ───────── */
  const [glitchTick, setGlitchTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setGlitchTick((n) => n + 1), 1200);
    return () => clearInterval(t);
  }, []);

  /* ───────── sound ───────── */
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/s2.mp3");
    a.loop = true;
    a.volume = 0.6;
    audioRef.current = a;
    if (soundEnabled) a.play().catch(() => {});
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
    if (!soundEnabled) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    } else {
      a.play().catch(() => {});
    }
    try {
      localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
    } catch {}
  }, [soundEnabled]);

  /* ───────── commit designation ───────── */
  async function commit() {
    if (alreadySet || submitting) return;

    const err = validateDesignation(value);
    if (err) {
      setError(err);
      return;
    }

    if (!ready) {
      setError("CONNECT WALLET ON BASE");
      return;
    }

    setSubmitting(true);
    setError(null);
    setChainStatus("Submitting…");

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [tokenIdBig!, value],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));

      setChainStatus("Designation committed");
      setPhase("binding");
      setTimeout(() => setPhase("approach"), 1400);
    } catch {
      setError("TRANSACTION FAILED");
      setChainStatus("Tx failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ──────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────── */

  return (
    <section
      role="region"
      aria-label="Episode Two: Designation"
      style={{
        borderRadius: 28,
        padding: 22,
        color: "white",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.72))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.85)",
      }}
    >
      {/* Boot console */}
      <div style={{ fontSize: 11, opacity: 0.78, marginBottom: 12 }}>
        Boot: {hydrated ? "hydrated" : "hydrating"} • tokenId:{" "}
        <b>{tokenIdBig ? tokenIdBig.toString() : "INVALID"}</b> • chain:{" "}
        <b>{isBase ? "Base" : chain?.id ?? "none"}</b> • status: <b>{chainStatus}</b>
      </div>

      {!tokenIdBig && (
        <div style={{ fontSize: 13, color: "#f87171" }}>
          Invalid tokenId. Pass tokenId as a string or number from the hub.
        </div>
      )}

      {/* DESCENT */}
      {phase === "descent" && tokenIdBig && (
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
              textShadow:
                glitchTick % 2
                  ? "1px 0 rgba(56,189,248,0.6)"
                  : "-1px 0 rgba(168,85,247,0.6)",
            }}
          >
            VERTICAL TRANSFER
          </h2>

          <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
            Your prior classification —{" "}
            <strong>{ep1?.profile?.archetype ?? "UNRESOLVED"}</strong> — propagates ahead.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.6 }}>
            Upper systems require a stable designation.
          </p>

          <button onClick={() => setPhase("input")} style={{ marginTop: 24 }}>
            CONTINUE
          </button>
        </div>
      )}

      {/* INPUT */}
      {phase === "input" && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>ASSIGN DESIGNATION</h2>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            style={{
              marginTop: 18,
              width: "100%",
              textAlign: "center",
              fontSize: 18,
              letterSpacing: 3,
            }}
          />

          {error && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            disabled={submitting || alreadySet}
            onClick={commit}
            style={{ marginTop: 22 }}
          >
            {submitting ? "CONFIRMING…" : "CONFIRM DESIGNATION"}
          </button>
        </div>
      )}

      {/* BINDING */}
      {phase === "binding" && (
        <div
          style={{
            marginTop: 60,
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 1.5,
          }}
        >
          IDENTITY LOCKED
        </div>
      )}

      {/* APPROACH */}
      {phase === "approach" && (
        <div>
          <p>Designation accepted.</p>
          <button onClick={onExit} style={{ marginTop: 24 }}>
            RETURN TO HUB
          </button>
        </div>
      )}
    </section>
  );
}
