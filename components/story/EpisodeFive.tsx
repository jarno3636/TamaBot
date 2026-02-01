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

function outcomeLabel(v: number): string {
  return Object.keys(OUTCOME_ENUM).find(k => OUTCOME_ENUM[k] === v) ?? "UNKNOWN";
}

/* ───────── ENDING NARRATIVES (FIX) ───────── */

function endingNarrative(outcome: number) {
  switch (outcome) {
    case OUTCOME_ENUM.AUTHORIZED:
      return {
        title: "BASE PRECINCT",
        text: `
You enter Base City under full illumination.

Access nodes propagate your credentials before you speak.
A transit officer nods — already briefed.

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
Systems acknowledge you — but never commit.

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

You are invisible — by design.
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

/* ───────── PSYCH PROFILE ───────── */

function psychProfile(ep1: number, profile: number) {
  return `
DIRECTIVE MEMORY: ${ep1}
SURFACE PROFILE: ${profile}

ANALYSIS:
Subject demonstrates strategic restraint.
Latency indicates preference for leverage over certainty.

BEHAVIORAL SUMMARY:
• Maintains composure under constraint
• Trades visibility for control
• Operates without closure

OVERSIGHT CONFIDENCE: PARTIAL
AUTONOMY RISK: ACCEPTABLE
`.trim();
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

  const [ep1Choice, setEp1Choice] = useState<number | null>(null);
  const [profile, setProfile] = useState<number | null>(null);
  const [alreadyFinalized, setAlreadyFinalized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("arrival");

  /* ───────── Typing animation state ───────── */

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
      audioRef.current = null;
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
      try {
        const s: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [fidBig],
        });

        setEp1Choice(Number(s?.ep1Choice));
        setProfile(Number(s?.profile));

        if (s.finalized) {
          setAlreadyFinalized(true);
          setPhase("ending");
        }
      } catch {}
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
    if (!address || submitting || alreadyFinalized || outcomeEnum == null) return;

    try {
      setSubmitting(true);
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

  const ending =
    outcomeEnum !== null ? endingNarrative(outcomeEnum) : null;

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
            <p style={body}>
              Base City initializes around you.
              <br />
              Every decision is already embedded.
            </p>
            <button style={primaryBtn} onClick={() => setPhase("judgment")}>
              Proceed
            </button>
          </>
        )}

        {phase === "judgment" && (
          <>
            <pre style={mono}>
              {outcomeEnum === null
                ? "SYNTHESIS :: IN PROGRESS…"
                : typedText}
            </pre>

            {typingDone && (
              <button style={primaryBtn} onClick={() => setPhase("finalize")}>
                Accept classification
              </button>
            )}
          </>
        )}

        {phase === "finalize" && !alreadyFinalized && (
          <button style={primaryBtn} onClick={finalize}>
            {submitting ? "FINALIZING…" : "Finalize outcome"}
          </button>
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
const body = { marginTop: 14, lineHeight: 1.75, opacity: 0.85 };

const mono = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  fontFamily: "monospace",
  fontSize: 12,
  whiteSpace: "pre-wrap" as const,
  opacity: 0.9,
};

const endingText = {
  marginTop: 14,
  fontSize: 13,
  lineHeight: 1.7,
  whiteSpace: "pre-wrap" as const,
  opacity: 0.9,
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
  marginTop: 18,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontWeight: 900,
};

const soundBtn = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: 11,
};
