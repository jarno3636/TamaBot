"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const SOUND_KEY = "basebots_ep5_sound";
const BONUS_RESIDUAL_KEY = "basebots_bonus_residual_unlocked";

/*
enum Outcome {
  NONE,
  AUTHORIZED,
  OBSERVED,
  SILENT,
  UNTRACKED,
  FLAGGED
}
*/

const OUTCOME_ENUM: Record<string, number> = {
  AUTHORIZED: 1,
  OBSERVED: 2,
  SILENT: 3,
  UNTRACKED: 4,
  FLAGGED: 5,
};

/* ────────────────────────────────────────────── */
/* SAFE HELPERS (CRITICAL) */
/* ────────────────────────────────────────────── */

function normalizeFid(input: string | number | bigint): bigint {
  try {
    if (typeof input === "bigint") return input > 0n ? input : 0n;
    if (typeof input === "number")
      return input > 0 ? BigInt(Math.floor(input)) : 0n;

    const digits = String(input).match(/^\d+$/)?.[0];
    if (!digits) return 0n;

    const b = BigInt(digits);
    return b > 0n ? b : 0n;
  } catch {
    return 0n;
  }
}

function deriveOutcomeEnum(ep1: number, profile: number): number {
  if (ep1 === 4) return OUTCOME_ENUM.UNTRACKED;
  if (ep1 === 3) return OUTCOME_ENUM.SILENT;
  if (profile === 3) return OUTCOME_ENUM.FLAGGED;
  if (profile === 1) return OUTCOME_ENUM.OBSERVED;
  return OUTCOME_ENUM.AUTHORIZED;
}

function outcomeLabel(v: number) {
  return Object.keys(OUTCOME_ENUM).find((k) => OUTCOME_ENUM[k] === v) ?? "UNKNOWN";
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

type Phase = "arrival" | "judgment" | "finalize" | "ending";

export default function EpisodeFive({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => normalizeFid(fid), [fid]);
  const hasFid = fidBig > 0n;

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const isBase = chain?.id === BASE_CHAIN_ID;

  const [phase, setPhase] = useState<Phase>("arrival");
  const [ep1Choice, setEp1Choice] = useState<number | null>(null);
  const [profile, setProfile] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [alreadyFinalized, setAlreadyFinalized] = useState(false);
  const [readyToFinalize, setReadyToFinalize] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusLine, setStatusLine] = useState("Awaiting identity…");
  const [bonusReady, setBonusReady] = useState(false);

  /* ───────── Sound ───────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const a = new Audio("/audio/s5.mp3");
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

  /* ───────── Chain Read (SAFE) ───────── */

  useEffect(() => {
    if (!publicClient || !hasFid) {
      setStatusLine("Awaiting identity…");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setStatusLine("Reading sequence state…");

        const s: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [fidBig],
        });

        if (cancelled) return;

        const ep1 = Number(s?.ep1Choice);
        const prof = Number(s?.profile);

        setEp1Choice(Number.isFinite(ep1) ? ep1 : null);
        setProfile(Number.isFinite(prof) ? prof : null);

        const missingEpisodes: string[] = [];
        if (!s?.ep1Set) missingEpisodes.push("Episode 1");
        if (!s?.ep2Set) missingEpisodes.push("Episode 2");
        if (!s?.ep3Set) missingEpisodes.push("Episode 3");
        if (!s?.ep4Set) missingEpisodes.push("Episode 4");

        setMissing(missingEpisodes);

        const finalized = Boolean(s?.finalized);
        setAlreadyFinalized(finalized);
        setReadyToFinalize(missingEpisodes.length === 0 && !finalized);

        setStatusLine(
          finalized
            ? "Finalization already committed"
            : missingEpisodes.length
              ? "Sequence incomplete"
              : "Sequence valid"
        );

        try {
          setBonusReady(
            localStorage.getItem(BONUS_RESIDUAL_KEY) === "true" || finalized
          );
        } catch {}

        if (finalized) setPhase("ending");
      } catch {
        if (!cancelled) setStatusLine("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, hasFid, fidBig]);

  const outcomeEnum = useMemo(() => {
    if (ep1Choice == null || profile == null) return null;
    return deriveOutcomeEnum(ep1Choice, profile);
  }, [ep1Choice, profile]);

  /* ───────── Finalize (SAFE) ───────── */

  async function finalize() {
    if (!hasFid || !readyToFinalize || !publicClient) return;

    if (!address) {
      setStatusLine("Connect wallet to finalize");
      return;
    }

    if (outcomeEnum == null) {
      setStatusLine("Outcome not derivable");
      return;
    }

    try {
      setSubmitting(true);

      if (!isBase) {
        setStatusLine("Switching to Base…");
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      setStatusLine("Awaiting signature…");

      const hash = await writeContractAsync({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "finalize",
        args: [fidBig, outcomeEnum],
      });

      setStatusLine("Finalizing on-chain…");
      await publicClient.waitForTransactionReceipt({ hash });

      try {
        localStorage.setItem(BONUS_RESIDUAL_KEY, "true");
      } catch {}

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setBonusReady(true);
      setAlreadyFinalized(true);
      setPhase("ending");
      setStatusLine("Outcome committed");
    } catch {
      setStatusLine("Finalization failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section style={container}>
      <style>{css}</style>

      {/* IMPORTANT: pointerEvents none so taps pass through */}
      <div style={glow} aria-hidden />
      <div style={scanlines} aria-hidden />

      <div style={card}>
        <div style={topRow}>
          <span style={{ fontSize: 11, opacity: 0.78 }}>
            BASE CITY • FINALIZATION • {statusLine}
          </span>

          <button style={soundBtn} onClick={() => setSoundOn((s) => !s)}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>

        {phase === "arrival" && (
          <>
            <h2 style={title}>EMERGENCE</h2>
            <p style={body}>
              Base City initializes around you.
              <br />
              Every decision is already embedded.
            </p>

            {/* Proceed ALWAYS works now (overlays no longer eat taps) */}
            <button style={primaryBtn} onClick={() => setPhase("judgment")}>
              Proceed
            </button>

            {/* Bonus teaser (optional) */}
            {bonusReady && (
              <button
                style={ghostBtn}
                onClick={() => {
                  window.dispatchEvent(new Event("basebots-progress-updated"));
                  onExit();
                }}
              >
                BONUS SIGNAL DETECTED ▸ Return to hub
              </button>
            )}
          </>
        )}

        {phase === "judgment" && (
          <>
            <pre style={mono}>
              {typedText}
              {!typingDone && <span className="cursor">█</span>}
            </pre>

            {/* If data is missing, show CTA immediately instead of trapping them */}
            {outcomeEnum == null && (
              <div style={hintBox}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>
                  Upstream steps missing
                </div>
                <div style={{ opacity: 0.85, fontSize: 13 }}>
                  Return to the hub and complete Episodes 1–4 so the system can
                  classify you.
                </div>
                <button style={secondaryBtn} onClick={onExit}>
                  Return to hub
                </button>
              </div>
            )}

            {typingDone && outcomeEnum != null && (
              <button style={primaryBtn} onClick={() => setPhase("finalize")}>
                Accept classification
              </button>
            )}
          </>
        )}

        {phase === "finalize" && (
          <>
            {!readyToFinalize && (
              <div className="glitchBox">
                <div className="glitchTitle">SEQUENCE VIOLATION</div>
                <div style={{ marginTop: 10, opacity: 0.92, fontSize: 13 }}>
                  Missing prerequisites:
                </div>
                <ul style={{ marginTop: 10, paddingLeft: 18, opacity: 0.9 }}>
                  {missing.length ? (
                    missing.map((m) => <li key={m}>{m}</li>)
                  ) : (
                    <li>Unknown (refresh hub state)</li>
                  )}
                </ul>

                <button style={secondaryBtn} onClick={onExit}>
                  Return to hub
                </button>
              </div>
            )}

            {readyToFinalize && (
              <>
                <div style={ctaBox}>
                  <div style={{ fontWeight: 900 }}>READY TO COMMIT</div>
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                    This writes your outcome permanently on-chain.
                  </div>
                </div>

                <button style={primaryBtn} onClick={finalize} disabled={submitting}>
                  {submitting ? "FINALIZING…" : "Finalize outcome"}
                </button>
              </>
            )}
          </>
        )}

        {phase === "ending" && ending && (
          <>
            <h3 style={subtitle}>{ending.title}</h3>
            <pre style={endingText}>{ending.text}</pre>

            {/* Bonus CTA in-ending */}
            {bonusReady && (
              <button
                style={primaryBtn}
                onClick={() => {
                  window.dispatchEvent(new Event("basebots-progress-updated"));
                  onExit();
                }}
              >
                Continue ▸ Bonus episode available in hub
              </button>
            )}

            <button style={secondaryBtn} onClick={onExit}>
              Return to hub
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const container = {
  minHeight: "100vh",
  background: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative" as const,
};

const glow = {
  position: "absolute" as const,
  inset: 0,
  pointerEvents: "none" as const, // ✅ FIX: allow clicks
  background:
    "radial-gradient(900px 360px at 50% 10%, rgba(168,85,247,0.35), transparent 70%)",
};

const scanlines = {
  position: "absolute" as const,
  inset: 0,
  pointerEvents: "none" as const, // ✅ FIX: allow clicks
  background: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
  backgroundSize: "100% 3px",
  opacity: 0.06,
};

const card = {
  position: "relative" as const,
  zIndex: 10, // ✅ FIX: ensure it's above background layers
  maxWidth: 760,
  width: "100%",
  borderRadius: 28,
  padding: 28,
  background: "rgba(2,6,23,0.88)",
  border: "1px solid rgba(168,85,247,0.45)",
  boxShadow: "0 0 60px rgba(168,85,247,0.45)",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const title = { fontSize: 32, fontWeight: 900 };
const subtitle = { fontSize: 22, fontWeight: 900, marginTop: 16 };
const body = { marginTop: 14, lineHeight: 1.75, opacity: 0.85 };

const mono = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
  fontSize: 12,
  whiteSpace: "pre-wrap" as const,
  opacity: 0.93,
};

const endingText = {
  marginTop: 14,
  fontSize: 13,
  lineHeight: 1.7,
  whiteSpace: "pre-wrap" as const,
  opacity: 0.92,
};

const primaryBtn = {
  marginTop: 22,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 999,
  background: "linear-gradient(90deg,#38bdf8,#a855f7)",
  color: "#020617",
  fontWeight: 900,
};

const secondaryBtn = {
  marginTop: 14,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontWeight: 900,
};

const ghostBtn = {
  marginTop: 10,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.04)",
  border: "1px dashed rgba(56,189,248,0.35)",
  color: "white",
  fontWeight: 900,
  fontSize: 12,
};

const soundBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 999,
  padding: "8px 12px",
  color: "white",
  fontSize: 11,
  fontWeight: 900,
};

const hintBox = {
  marginTop: 14,
  padding: 14,
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
};

const ctaBox = {
  marginTop: 14,
  padding: 14,
  borderRadius: 18,
  background: "rgba(56,189,248,0.08)",
  border: "1px solid rgba(56,189,248,0.22)",
};

const css = `
.cursor {
  display: inline-block;
  margin-left: 2px;
  opacity: 0.8;
  animation: blink 0.9s infinite;
}

@keyframes blink {
  0%, 49% { opacity: 0.15; }
  50%, 100% { opacity: 0.85; }
}

.glitchBox {
  margin-top: 18px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.6);
  position: relative;
  overflow: hidden;
  animation: shake 1.2s infinite;
}

.glitchBox::before {
  content: "";
  position: absolute;
  inset: -40px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent);
  transform: rotate(8deg);
  animation: sweep 1.4s infinite;
}

.glitchTitle {
  font-weight: 900;
  letter-spacing: 2px;
  color: #f87171;
}

@keyframes sweep {
  0% { transform: translateX(-40%) rotate(8deg); opacity: 0; }
  15% { opacity: 1; }
  50% { transform: translateX(40%) rotate(8deg); opacity: 0.7; }
  100% { transform: translateX(80%) rotate(8deg); opacity: 0; }
}

@keyframes shake {
  0% { transform: translate(0,0); }
  86% { transform: translate(0,0); }
  88% { transform: translate(-1px, 1px); }
  90% { transform: translate(2px, -1px); }
  92% { transform: translate(-2px, 0); }
  94% { transform: translate(1px, 2px); }
  96% { transform: translate(0, -1px); }
  100% { transform: translate(0,0); }
}
`;
