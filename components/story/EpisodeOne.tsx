"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {
  BASEBOTS_SEASON2_STATE_ADDRESS,
  BASEBOTS_SEASON2_STATE_ABI,
} from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

export type EpisodeOneChoiceId = "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
type WakePosture = "LISTEN" | "MOVE" | "HIDE";

/* 🔑 MUST MATCH CONTRACT ENUM */
const EP1_ENUM: Record<EpisodeOneChoiceId, number> = {
  ACCEPT: 1,
  STALL: 2,
  SPOOF: 3,
  PULL_PLUG: 4,
};

const TOTAL_SECONDS = 90;
const CHOICE_ORDER: EpisodeOneChoiceId[] = [
  "ACCEPT",
  "STALL",
  "SPOOF",
  "PULL_PLUG",
];

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function visibleChoiceCount(left: number) {
  if (left > 60) return 4;
  if (left > 45) return 3;
  if (left > 30) return 2;
  return 1;
}

function normalizeFid(input: string | number | bigint): bigint {
  try {
    return typeof input === "bigint" ? input : BigInt(input);
  } catch {
    return 0n;
  }
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeOne({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => normalizeFid(fid), [fid]);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  /* ───────── State ───────── */

  const [phase, setPhase] = useState<
    "intro" | "silence" | "reaction" | "context" | "audit" | "sealing" | "ending"
  >("intro");

  const [wakePosture, setWakePosture] = useState<WakePosture | null>(null);
  const [choice, setChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [status, setStatus] = useState("Booting…");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  /* ───────── Audio ───────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    if (audioRef.current) return;
    const audio = new Audio("/audio/s1.mp3");
    audio.loop = true;
    audio.volume = 0.55;
    audioRef.current = audio;
    audio.play().catch(() => {});
    return () => audio.pause();
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    soundOn ? audioRef.current.play().catch(() => {}) : audioRef.current.pause();
  }, [soundOn]);

  /* ───────── Wallet gating ───────── */

  const needsWallet =
    phase === "sealing" &&
    (!walletClient || !publicClient || !isBase || !address);

  /* ───────── Countdown ───────── */

  useEffect(() => {
    if (phase !== "audit") return;

    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.ceil(TOTAL_SECONDS - elapsed);
      setTimeLeft(left);

      if (left <= 0 && !choice) {
        setChoice("ACCEPT");
        setPhase("sealing");
      }
      if (left > 0) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [phase, choice]);

  const visibleChoices = useMemo(
    () => CHOICE_ORDER.slice(0, visibleChoiceCount(timeLeft)),
    [timeLeft]
  );

  /* ───────── Commit ───────── */

  async function commitToChain(finalChoice: EpisodeOneChoiceId) {
    try {
      setStatus("Sealing memory…");

      const hash = await walletClient!.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode1",
        args: [fidBig, EP1_ENUM[finalChoice]],
      });

      setTxHash(hash);
      await publicClient!.waitForTransactionReceipt({ hash });

      setStatus("Memory sealed");
      setPhase("ending");
    } catch {
      setTxError("Seal rejected or reverted.");
      setStatus("Seal failed");
      setPhase("audit");
    }
  }

  useEffect(() => {
    if (phase === "sealing" && choice && !needsWallet) {
      commitToChain(choice);
    }
  }, [phase, choice, needsWallet]);

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section style={shell}>
      <style>{css}</style>

      {needsWallet && (
        <div className="walletOverlay">
          <div className="walletCard glow">
            <div className="walletTitle">SEALING REQUIRED</div>
            <div className="walletBody">
              This decision becomes part of the Core Memory.
            </div>
            <div className="pulse" />
          </div>
        </div>
      )}

      <div className="console">
        <span>FID {fidBig.toString()} • {status}</span>
        <button className="sound" onClick={() => setSoundOn(s => !s)}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {phase === "intro" && (
        <>
          <h1 className="title">AWAKENING</h1>
          <p className="body">
            You wake into a room that never expected you to wake again.
          </p>
          <button className="primary" onClick={() => setPhase("silence")}>
            Continue
          </button>
        </>
      )}

      {phase === "silence" && (
        <>
          <h2 className="title">THE SILENCE PROTOCOL</h2>
          <div className="choices">
            <button className="choiceBtn" onClick={() => { setWakePosture("LISTEN"); setPhase("reaction"); }}>
              Stay still.
            </button>
            <button className="choiceBtn" onClick={() => { setWakePosture("MOVE"); setPhase("reaction"); }}>
              Move first.
            </button>
            <button className="choiceBtn" onClick={() => { setWakePosture("HIDE"); setPhase("reaction"); }}>
              Mask signal.
            </button>
          </div>
        </>
      )}

      {phase === "reaction" && (
        <>
          <p className="body">
            {wakePosture === "LISTEN" && "Oversight sharpens."}
            {wakePosture === "MOVE" && "Audit pathways accelerate."}
            {wakePosture === "HIDE" && "Something watches harder."}
          </p>
          <button className="primary" onClick={() => setPhase("context")}>
            Continue
          </button>
        </>
      )}

      {phase === "context" && (
        <>
          <p className="body">
            This audit measures permanence.
          </p>
          <button className="primary" onClick={() => setPhase("audit")}>
            Begin audit
          </button>
        </>
      )}

      {phase === "audit" && (
        <>
          <div className="timer">DECISION WINDOW {mmss(timeLeft)}</div>
          <div className="choices">
            {visibleChoices.map(c => (
              <button
                key={c}
                className="choiceBtn glowOnHover"
                onClick={() => { setChoice(c); setPhase("sealing"); }}
              >
                {c}
              </button>
            ))}
          </div>
          {txError && <div className="error">{txError}</div>}
        </>
      )}

      {phase === "ending" && (
        <>
          <h2 className="title">MEMORY SEALED</h2>
          {txHash && <div className="hash">{txHash.slice(0, 10)}…</div>}
          <button className="primary" onClick={onExit}>
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

const shell: React.CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  color: "white",
  background: "#020617",
};

const css = `
.console{display:flex;justify-content:space-between;font-size:12px;opacity:.85}
.title{font-size:32px;font-weight:900}
.body{margin-top:12px;opacity:.86;max-width:720px}
.primary{margin-top:18px;padding:12px 18px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);font-weight:900}
.choiceBtn{padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07)}
.glowOnHover:hover{box-shadow:0 0 18px rgba(168,85,247,.6)}
.timer{margin-top:10px;font-size:13px}
.walletOverlay{position:fixed;inset:0;background:rgba(2,6,23,.92);display:flex;align-items:center;justify-content:center}
.walletCard{padding:24px;border-radius:22px;border:1px solid rgba(168,85,247,.45)}
.pulse{height:6px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);animation:pulse 1.4s infinite}
@keyframes pulse{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}
.error{color:#fca5a5}
.sound{background:none;border:none;color:white}
`;
