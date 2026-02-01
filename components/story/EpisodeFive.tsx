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
  if (ep1 === 4) return OUTCOME_ENUM.UNTRACKED;
  if (ep1 === 3) return OUTCOME_ENUM.SILENT;
  if (profile === 3) return OUTCOME_ENUM.FLAGGED;
  if (profile === 1) return OUTCOME_ENUM.OBSERVED;
  return OUTCOME_ENUM.AUTHORIZED;
}

function outcomeLabel(v: number) {
  return Object.keys(OUTCOME_ENUM).find(k => OUTCOME_ENUM[k] === v) ?? "UNKNOWN";
}

function psychProfile(ep1: number, profile: number) {
  return `
DIRECTIVE MEMORY: ${ep1}
SURFACE PROFILE: ${profile}

ANALYSIS:
Subject demonstrates strategic restraint.
Latency favors leverage over certainty.

BEHAVIORAL SUMMARY:
• Maintains composure under constraint
• Trades visibility for control
• Operates without closure

OVERSIGHT CONFIDENCE: PARTIAL
AUTONOMY RISK: ACCEPTABLE
`.trim();
}

/* ────────────────────────────────────────────── */
/* Ending narratives */
/* ────────────────────────────────────────────── */

function endingNarrative(outcome: number) {
  switch (outcome) {
    case OUTCOME_ENUM.AUTHORIZED:
      return { title: "BASE PRECINCT", text: "You are expected." };
    case OUTCOME_ENUM.OBSERVED:
      return { title: "THE GLASS WALK", text: "Your file remains open." };
    case OUTCOME_ENUM.SILENT:
      return { title: "THE UNDERBELLY", text: "Silence has value here." };
    case OUTCOME_ENUM.UNTRACKED:
      return { title: "OUTER DISTRICTS", text: "No one is watching." };
    case OUTCOME_ENUM.FLAGGED:
      return { title: "INTERNAL AFFAIRS", text: "Never in public." };
    default:
      return { title: "UNRESOLVED", text: "Classification failed." };
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

  const [readyToFinalize, setReadyToFinalize] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [alreadyFinalized, setAlreadyFinalized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ───────── Typing ───────── */

  const [typedText, setTypedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  /* ───────── Sound ───────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const a = new Audio("/audio/s5.mp3");
    a.loop = true;
    a.volume = 0.45;
    audioRef.current = a;
    if (soundOn) a.play().catch(() => {});
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    soundOn ? a.play().catch(() => {}) : a.pause();
  }, [soundOn]);

  /* ───────── Read chain ───────── */

  useEffect(() => {
    if (!publicClient) return;

    (async () => {
      const s: any = await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getBotState",
        args: [fidBig],
      });

      setEp1Choice(Number(s.ep1Choice));
      setProfile(Number(s.profile));

      const missingEpisodes: string[] = [];
      if (!s.ep1Set) missingEpisodes.push("Episode 1");
      if (!s.ep2Set) missingEpisodes.push("Episode 2");
      if (!s.ep3Set) missingEpisodes.push("Episode 3");
      if (!s.ep4Set) missingEpisodes.push("Episode 4");

      setMissing(missingEpisodes);
      setReadyToFinalize(missingEpisodes.length === 0 && !s.finalized);

      if (s.finalized) {
        setAlreadyFinalized(true);
        setPhase("ending");
      }
    })();
  }, [publicClient, fidBig]);

  const outcomeEnum = useMemo(() => {
    if (ep1Choice == null || profile == null) return null;
    return deriveOutcomeEnum(ep1Choice, profile);
  }, [ep1Choice, profile]);

  /* ───────── Typing effect ───────── */

  useEffect(() => {
    if (phase !== "judgment" || ep1Choice == null || profile == null) return;

    const full = psychProfile(ep1Choice, profile);
    let i = 0;
    setTypedText("");
    setTypingDone(false);

    const id = setInterval(() => {
      i++;
      setTypedText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        setTypingDone(true);
      }
    }, 18);

    return () => clearInterval(id);
  }, [phase, ep1Choice, profile]);

  /* ───────── Finalize ───────── */

  async function finalize() {
    if (!readyToFinalize || !address || outcomeEnum == null) return;

    setSubmitting(true);
    try {
      if (!isBase) await switchChainAsync({ chainId: BASE_CHAIN_ID });

      const hash = await writeContractAsync({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "finalize",
        args: [fidBig, outcomeEnum],
      });

      await publicClient!.waitForTransactionReceipt({ hash });
      setPhase("ending");
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
      <div style={glow} />
      <div style={scanlines} />

      <div style={card}>
        <div style={topRow}>
          <span style={{ fontSize: 11, opacity: 0.75 }}>
            BASE CITY • FINALIZATION
          </span>
          <button style={soundBtn} onClick={() => setSoundOn(s => !s)}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>

        {phase === "arrival" && (
          <>
            <h2 style={title}>EMERGENCE</h2>
            <p style={body}>Every decision has already arrived.</p>
            <button style={primaryBtn} onClick={() => setPhase("judgment")}>
              Proceed
            </button>
          </>
        )}

        {phase === "judgment" && (
          <>
            <pre style={mono}>{typedText || "SYNTHESIS…"}</pre>

            {typingDone && (
              <button style={primaryBtn} onClick={() => setPhase("finalize")}>
                Accept classification
              </button>
            )}
          </>
        )}

        {phase === "finalize" && (
          <>
            {!readyToFinalize && (
              <div style={glitchBox}>
                <div style={glitchTitle}>SEQUENCE VIOLATION</div>
                <div style={glitchText}>
                  Missing:
                  <ul>
                    {missing.map(m => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>

                <button style={secondaryBtn} onClick={onExit}>
                  Return to hub
                </button>
              </div>
            )}

            {readyToFinalize && (
              <button style={primaryBtn} onClick={finalize}>
                {submitting ? "FINALIZING…" : "Finalize outcome"}
              </button>
            )}
          </>
        )}

        {phase === "ending" && ending && (
          <>
            <h3 style={subtitle}>{ending.title}</h3>
            <pre style={endingText}>{ending.text}</pre>
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
  background:
    "radial-gradient(900px 360px at 50% 10%, rgba(168,85,247,0.35), transparent 70%)",
};

const scanlines = {
  position: "absolute" as const,
  inset: 0,
  background:
    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
  backgroundSize: "100% 3px",
  opacity: 0.06,
};

const card = {
  maxWidth: 760,
  width: "100%",
  borderRadius: 28,
  padding: 28,
  background: "rgba(2,6,23,0.88)",
  border: "1px solid rgba(168,85,247,0.45)",
  boxShadow: "0 0 60px rgba(168,85,247,0.45)",
};

const topRow = { display: "flex", justifyContent: "space-between" };
const title = { fontSize: 32, fontWeight: 900 };
const subtitle = { fontSize: 22, fontWeight: 900, marginTop: 16 };
const body = { marginTop: 14, opacity: 0.85 };

const mono = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
  fontSize: 12,
  whiteSpace: "pre-wrap" as const,
};

const glitchBox = {
  marginTop: 18,
  padding: 18,
  borderRadius: 18,
  background: "rgba(220,38,38,0.15)",
  border: "1px solid rgba(220,38,38,0.6)",
  animation: "glitch 1.2s infinite",
};

const glitchTitle = {
  fontWeight: 900,
  letterSpacing: 2,
  color: "#f87171",
};

const glitchText = {
  marginTop: 8,
  fontSize: 13,
};

const endingText = {
  marginTop: 14,
  whiteSpace: "pre-wrap" as const,
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
};

const soundBtn = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: 11,
};
