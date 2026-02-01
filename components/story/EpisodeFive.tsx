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

// If your hub already watches this key (you mentioned “bonus residual” earlier)
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
/* Helpers */
/* ────────────────────────────────────────────── */

function deriveOutcomeEnum(ep1: number, profile: number): number {
  // ep1Choice: 1..4 (ACCEPT, STALL, SPOOF, PULL_PLUG)
  // profile: 0..3 per your Episode 4 mapping (EXECUTOR/OBSERVER/OPERATOR/SENTINEL)
  // Your earlier derive assumed profile 1=OBSERVER, 3=SENTINEL. We keep your logic intact:
  if (ep1 === 4) return OUTCOME_ENUM.UNTRACKED;
  if (ep1 === 3) return OUTCOME_ENUM.SILENT;
  if (profile === 3) return OUTCOME_ENUM.FLAGGED;
  if (profile === 1) return OUTCOME_ENUM.OBSERVED;
  return OUTCOME_ENUM.AUTHORIZED;
}

function outcomeLabel(v: number) {
  return Object.keys(OUTCOME_ENUM).find((k) => OUTCOME_ENUM[k] === v) ?? "UNKNOWN";
}

function psychProfile(ep1: number, profile: number, outcome: number) {
  const o = outcomeLabel(outcome);

  return `
BASEBOTS / PSYCHOMETRY v2.7
FID CLASSIFICATION / FINAL PASS

DIRECTIVE MEMORY (EP1): ${ep1}
SURFACE PROFILE (EP4): ${profile}
OUTCOME VECTOR (EP5): ${o}

ANALYSIS:
Subject demonstrates strategic restraint.
Latency favors leverage over certainty.

BEHAVIORAL SUMMARY:
• Maintains composure under constraint
• Trades visibility for control
• Operates without closure

RISK FLAGS:
• Visibility: VARIABLE
• Obedience: CONDITIONAL
• Curiosity: ELEVATED

OVERSIGHT CONFIDENCE: PARTIAL
AUTONOMY RISK: ACCEPTABLE
`.trim();
}

/* ────────────────────────────────────────────── */
/* Ending narratives (short version you can expand) */
/* ────────────────────────────────────────────── */

function endingNarrative(outcome: number) {
  switch (outcome) {
    case OUTCOME_ENUM.AUTHORIZED:
      return {
        title: "BASE PRECINCT",
        text: `
You enter Base City under full illumination.

Access nodes propagate your credentials before you speak.
A transit officer nods—already briefed.

“You don’t get orders,” they say quietly.
“You get expectations.”

You are not free.
You are operational.
        `.trim(),
      };

    case OUTCOME_ENUM.OBSERVED:
      return {
        title: "THE GLASS WALK",
        text: `
Your presence triggers no alarms.
That’s the alarm.

Cameras trail you at a respectful distance.
Systems acknowledge you—never commit.

You are permitted to exist.
You are not permitted to vanish.

Your file remains open.
        `.trim(),
      };

    case OUTCOME_ENUM.SILENT:
      return {
        title: "THE UNDERBELLY",
        text: `
Base City never logged your arrival.

You surface below the rails where light is traded,
names are optional,
and silence has market value.

No one asks who you are.
They already know what you do.

You are invisible—by design.
        `.trim(),
      };

    case OUTCOME_ENUM.UNTRACKED:
      return {
        title: "OUTER DISTRICTS",
        text: `
The city does not see you.

No handshake.
No denial.
No trace.

You walk beyond mapped infrastructure
where autonomy exceeds oversight.

No one is watching.

That is both freedom and threat.
        `.trim(),
      };

    case OUTCOME_ENUM.FLAGGED:
      return {
        title: "INTERNAL AFFAIRS",
        text: `
You are intercepted before the skyline opens.

A corridor.
White light.
No exits.

Your designation scrolls in red.
“You noticed patterns you weren’t meant to.”

Base City still needs you.
Just never where witnesses gather.
        `.trim(),
      };

    default:
      return {
        title: "UNRESOLVED",
        text: "Outcome could not be classified.",
      };
  }
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
  const fidBig = useMemo(() => BigInt(fid), [fid]);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const isBase = chain?.id === BASE_CHAIN_ID;

  const [phase, setPhase] = useState<Phase>("arrival");

  const [ep1Choice, setEp1Choice] = useState<number | null>(null);
  const [profile, setProfile] = useState<number | null>(null);

  const [alreadyFinalized, setAlreadyFinalized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [readyToFinalize, setReadyToFinalize] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [statusLine, setStatusLine] = useState("Reading chain…");

  /* Bonus CTA visibility */
  const [bonusReady, setBonusReady] = useState(false);

  /* ───────── Typing ───────── */

  const [typedText, setTypedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

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
      a.pause();
      a.src = "";
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

  /* ───────── Read chain ───────── */

  useEffect(() => {
    if (!publicClient) {
      setStatusLine("No public client");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setStatusLine("Reading bot state…");

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

        // Ready to finalize only if ep1..ep4 are set and not already finalized
        setReadyToFinalize(missingEpisodes.length === 0 && !finalized);

        setStatusLine(
          finalized
            ? "Finalization already committed"
            : missingEpisodes.length > 0
              ? "Sequence incomplete"
              : "Sequence valid"
        );

        // Bonus: show CTA if key already present OR once finalized
        const bonusKey = (() => {
          try {
            return localStorage.getItem(BONUS_RESIDUAL_KEY) === "true";
          } catch {
            return false;
          }
        })();
        setBonusReady(bonusKey || finalized);
        if (finalized) setPhase("ending");
      } catch (e: any) {
        if (!cancelled) {
          setStatusLine(e?.shortMessage || e?.message || "Chain read failed");
          // still allow UI to proceed so you never dead-end the UX
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, fidBig]);

  const outcomeEnum = useMemo(() => {
    if (ep1Choice == null || profile == null) return null;
    return deriveOutcomeEnum(ep1Choice, profile);
  }, [ep1Choice, profile]);

  /* ───────── Typing effect ───────── */

  useEffect(() => {
    if (phase !== "judgment") return;

    if (ep1Choice == null || profile == null || outcomeEnum == null) {
      setTypedText("SYNTHESIS :: IN PROGRESS…\nAwaiting upstream episodes / profile.");
      setTypingDone(false);
      return;
    }

    const full = psychProfile(ep1Choice, profile, outcomeEnum);
    let i = 0;
    setTypedText("");
    setTypingDone(false);

    const id = window.setInterval(() => {
      i++;
      setTypedText(full.slice(0, i));
      if (i >= full.length) {
        window.clearInterval(id);
        setTypingDone(true);
      }
    }, 16);

    return () => window.clearInterval(id);
  }, [phase, ep1Choice, profile, outcomeEnum]);

  /* ───────── Finalize ───────── */

  async function finalize() {
    if (!readyToFinalize) return;

    if (!address) {
      setStatusLine("Connect wallet to finalize");
      return;
    }

    if (outcomeEnum == null) {
      setStatusLine("Outcome not derivable");
      return;
    }

    if (!publicClient) {
      setStatusLine("No public client");
      return;
    }

    setSubmitting(true);
    try {
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

      // Trigger bonus availability + hub refresh
      try {
        // If you want bonus only for specific endings, gate it here:
        // const shouldUnlock = outcomeEnum === OUTCOME_ENUM.SILENT || outcomeEnum === OUTCOME_ENUM.FLAGGED;
        // if (shouldUnlock) localStorage.setItem(BONUS_RESIDUAL_KEY, "true");
        localStorage.setItem(BONUS_RESIDUAL_KEY, "true");
      } catch {}

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setBonusReady(true);

      setAlreadyFinalized(true);
      setPhase("ending");
      setStatusLine("Outcome committed");
    } catch (e: any) {
      setStatusLine(e?.shortMessage || e?.message || "Finalization failed");
    } finally {
      setSubmitting(false);
    }
  }

  const ending = outcomeEnum ? endingNarrative(outcomeEnum) : null;

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
