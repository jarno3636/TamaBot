"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage
 * ────────────────────────────────────────────── */

const SOUND_KEY = "basebots_ep5_sound";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

type Outcome =
  | "AUTHORIZED"
  | "OBSERVED"
  | "SILENT"
  | "UNTRACKED"
  | "FLAGGED";

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

function deriveOutcome(
  directive?: string,
  profile?: string
): Outcome {
  if (directive === "PULL_PLUG") return "UNTRACKED";
  if (directive === "SPOOF") return "SILENT";
  if (profile === "SENTINEL") return "FLAGGED";
  if (profile === "OBSERVER") return "OBSERVED";
  return "AUTHORIZED";
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeFive({
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

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const ready =
    Boolean(address && walletClient && publicClient && isBase && tokenIdBig);

  /* ───────── chain state ───────── */
  const [directive, setDirective] = useState<string>();
  const [profile, setProfile] = useState<string>();
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");

  /* ───────── residual ───────── */
  const [showResidual, setShowResidual] = useState(false);
  const lingerTimer = useRef<number | null>(null);

  /* ───────── read chain ───────── */
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

        setDirective(
          state?.ep1Directive ??
            state?.directive ??
            state?.episode1Directive
        );

        setProfile(state?.profile);

        const ep5 =
          state?.ep5Set ??
          state?.episode5Set ??
          (Array.isArray(state) ? state[5] : false);

        if (ep5) {
          setAlreadySet(true);
          setChainStatus("Outcome finalized");
        } else {
          setChainStatus("Outcome pending");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenIdBig]);

  const outcome = useMemo(
    () => deriveOutcome(directive, profile),
    [directive, profile]
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
    const a = new Audio("/audio/s5.mp3");
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

  /* ───────── finalize once (ON-CHAIN) ───────── */
  useEffect(() => {
    if (!ready || alreadySet) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Finalizing outcome…");

        const hash = await walletClient!.writeContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "setEpisode5Outcome",
          args: [tokenIdBig!, outcome],
        });

        await publicClient!.waitForTransactionReceipt({ hash });

        if (!cancelled) {
          setChainStatus("Outcome committed");
          window.dispatchEvent(new Event("basebots-progress-updated"));
        }
      } catch {
        if (!cancelled) setChainStatus("Finalization failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, alreadySet, outcome]);

  /* ───────── residual unlock ───────── */
  useEffect(() => {
    if (alreadySet) return;

    if (outcome !== "AUTHORIZED") {
      setShowResidual(true);
      return;
    }

    lingerTimer.current = window.setTimeout(() => {
      setShowResidual(true);
    }, 9000);

    return () => {
      if (lingerTimer.current) clearTimeout(lingerTimer.current);
    };
  }, [outcome, alreadySet]);

  async function unlockResidual() {
    if (!ready) return;

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setBonusBit",
        args: [tokenIdBig!, 2],
      });

      await publicClient!.waitForTransactionReceipt({ hash });
      window.dispatchEvent(new Event("basebots-progress-updated"));
      setShowResidual(false);
    } catch {
      // silent
    }
  }

  /* ───────── ending text ───────── */
  function renderEnding() {
    switch (outcome) {
      case "FLAGGED":
        return (
          <>
            <p>You notice it before they approach.</p>
            <p style={quote}>“Visibility is a liability.”</p>
          </>
        );
      case "OBSERVED":
        return (
          <>
            <p>A figure walks beside you.</p>
            <p style={quote}>“You are still being mapped.”</p>
          </>
        );
      case "SILENT":
        return (
          <>
            <p>No records attribute movement to you.</p>
            <p style={quote}>“Unobserved does not mean free.”</p>
          </>
        );
      case "UNTRACKED":
        return (
          <>
            <p>The city closes behind sealed doors.</p>
            <p style={quote}>“Absence is still a signal.”</p>
          </>
        );
      default:
        return (
          <>
            <p>Access nodes illuminate.</p>
            <p style={quote}>“Do not confuse permission with trust.”</p>
          </>
        );
    }
  }

  /* ────────────────────────────────────────────── */

  return (
    <section style={container}>
      <div aria-hidden style={scanlines} />

      {/* boot console */}
      <div style={{ fontSize: 11, opacity: 0.75 }}>
        Boot: {hydrated ? "hydrated" : "hydrating"} • tokenId:{" "}
        <b>{tokenIdBig ? tokenIdBig.toString() : "INVALID"}</b> • chain:{" "}
        <b>{isBase ? "Base" : chain?.id ?? "none"}</b> • status:{" "}
        <b>{chainStatus}</b>
      </div>

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setSoundOn((s) => !s)} style={controlBtn}>
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} style={controlBtn}>
          Exit
        </button>
      </div>

      <h2 style={{ marginTop: 18, fontSize: 20, fontWeight: 900 }}>
        BASE CITY
      </h2>

      <div style={{ marginTop: 18, fontSize: 14, opacity: 0.88 }}>
        {renderEnding()}
      </div>

      <div style={outcomeBox}>{outcome}</div>

      {showResidual && (
        <button onClick={unlockResidual} style={residualBtn}>
          ░ residual handshake acknowledged ░
        </button>
      )}

      <button onClick={onExit} style={exitBtn}>
        Return to hub
      </button>
    </section>
  );
}

/* ────────────────────────────────────────────── */

const container = {
  position: "relative" as const,
  overflow: "hidden",
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.14)",
  padding: 26,
  color: "white",
  background:
    "radial-gradient(1200px 480px at 50% -10%, rgba(52,211,153,0.12), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.78))",
  boxShadow: "0 70px 260px rgba(0,0,0,0.95)",
};

const scanlines = {
  position: "absolute" as const,
  inset: 0,
  pointerEvents: "none" as const,
  background:
    "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  backgroundSize: "100% 3px",
  opacity: 0.07,
};

const controlBtn = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.2)",
  padding: "4px 10px",
  fontSize: 11,
  background: "rgba(255,255,255,0.04)",
  color: "white",
};

const outcomeBox = {
  marginTop: 22,
  borderRadius: 18,
  padding: "14px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 13,
  letterSpacing: 2,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.18)",
  textAlign: "center" as const,
};

const quote = {
  marginTop: 14,
  fontSize: 12,
  fontStyle: "italic" as const,
  opacity: 0.65,
};

const residualBtn = {
  position: "absolute" as const,
  bottom: "18%",
  right: "12%",
  fontSize: 11,
  fontFamily: "monospace",
  padding: "6px 10px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.2)",
  opacity: 0.9,
  textShadow: "0 0 8px rgba(52,211,153,0.6)",
};

const exitBtn = {
  marginTop: 24,
  borderRadius: 999,
  padding: "8px 18px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
};
