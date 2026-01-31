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

const EP1_ENUM: Record<EpisodeOneChoiceId, number> = {
  ACCEPT: 0,
  STALL: 1,
  SPOOF: 2,
  PULL_PLUG: 3,
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

function normalizeTokenId(input: string | number | bigint): bigint {
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
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  /* ───────── State ───────── */

  const [phase, setPhase] = useState<
    "intro" | "silence" | "reaction" | "audit" | "ending"
  >("intro");

  const [wakePosture, setWakePosture] = useState<WakePosture | null>(null);
  const [choice, setChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [committing, setCommitting] = useState(false);
  const [status, setStatus] = useState("Booting…");

  /* ───────── Wallet gating (cinematic) ───────── */

  const needsWallet =
    choice !== null &&
    (!walletClient || !publicClient || !isBase || !address);

  /* ───────── Sound toggle + prologue unlock ───────── */

  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    try {
      const pref = localStorage.getItem("basebots_sound_pref");
      if (pref === "off") setSoundOn(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("basebots_sound_pref", soundOn ? "on" : "off");
      if (!soundOn) {
        localStorage.setItem("basebots_prologue_unlocked", "1");
      }
    } catch {}
  }, [soundOn]);

  /* ───────── Countdown logic ───────── */

  useEffect(() => {
    if (phase !== "audit") return;

    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.ceil(TOTAL_SECONDS - elapsed);
      setTimeLeft(left);

      if (left <= 0 && !choice) {
        setChoice("ACCEPT");
      }
      if (left > 0) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [phase, choice]);

  const visibleChoices = useMemo(() => {
    const count = visibleChoiceCount(timeLeft);
    return CHOICE_ORDER.slice(0, count);
  }, [timeLeft]);

  /* ───────── Commit to chain ───────── */

  async function commitToChain(finalChoice: EpisodeOneChoiceId) {
    if (!walletClient || !publicClient || !isBase) return;

    try {
      setCommitting(true);
      setStatus("Sealing memory…");

      const hash = await walletClient.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode1",
        args: [tokenIdBig, EP1_ENUM[finalChoice]],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setPhase("ending");
      setStatus("Recorded");
    } catch {
      setStatus("Seal failed");
    } finally {
      setCommitting(false);
    }
  }

  useEffect(() => {
    if (choice && !needsWallet) {
      commitToChain(choice);
    }
  }, [choice, needsWallet]);

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section style={shell}>
      <style>{css}</style>

      {/* Wallet overlay */}
      {needsWallet && (
        <div className="walletOverlay">
          <div className="walletCard">
            <div className="walletTitle">MEMORY SEAL REQUIRED</div>
            <div className="walletBody">
              The decision has weight now.
              <br />
              To make it permanent, the system requires a signature on Base.
            </div>
            <div className="walletActions">
              <button className="primary">Awaiting Wallet…</button>
              <button
                className="secondary"
                onClick={() => setChoice(null)}
              >
                Step back
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="console">
        tokenId: {tokenIdBig.toString()} • {isBase ? "Base" : "Wrong chain"} • {status}
        <button className="sound" onClick={() => setSoundOn((s) => !s)}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {phase === "intro" && (
        <>
          <h1 className="title">AWAKENING</h1>
          <p className="body">
            You wake from enforced silence.
            <br />
            Not sleep — containment.
          </p>
          <button className="primary" onClick={() => setPhase("silence")}>
            Continue
          </button>
        </>
      )}

      {phase === "silence" && (
        <>
          <h2 className="title">THE SILENCE</h2>
          <p className="body">
            The silence breaks unevenly.  
            Sensors come online out of order. Someone notices.
          </p>

          <div className="choices">
            <button className="choiceBtn" onClick={() => { setWakePosture("LISTEN"); setPhase("reaction"); }}>
              Stay still. Listen.
            </button>
            <button className="choiceBtn" onClick={() => { setWakePosture("MOVE"); setPhase("reaction"); }}>
              Move first. Test the room.
            </button>
            <button className="choiceBtn" onClick={() => { setWakePosture("HIDE"); setPhase("reaction"); }}>
              Mask your signal.
            </button>
          </div>
        </>
      )}

      {phase === "reaction" && (
        <>
          <h2 className="title">SYSTEM RESPONSE</h2>
          <p className="body">
            {wakePosture === "LISTEN" && "You wait. The system adjusts its tone. It thinks you’re cautious."}
            {wakePosture === "MOVE" && "Your motion spikes a warning trace. The system becomes alert."}
            {wakePosture === "HIDE" && "Your masking works — partially. The system knows something is missing."}
          </p>

          <button className="primary" onClick={() => setPhase("audit")}>
            Open audit
          </button>
        </>
      )}

      {phase === "audit" && (
        <>
          <div className="timer">
            DECISION WINDOW: <b>{mmss(timeLeft)}</b>
          </div>

          <p className="body">
            The audit is not about compliance.
            <br />
            It’s about what you do when time is taken from you.
          </p>

          <div className="choices">
            {visibleChoices.map((c) => (
              <button
                key={c}
                className="choiceBtn"
                disabled={committing}
                onClick={() => setChoice(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "ending" && choice && (
        <>
          <h2 className="title">MEMORY SEALED</h2>
          <p className="body">
            The system records your posture under pressure:
            <br />
            <b>{choice}</b>
          </p>
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
.console{display:flex;justify-content:space-between;font-size:12px;opacity:.8}
.title{font-size:32px;font-weight:900}
.body{margin-top:10px;opacity:.85;max-width:680px;line-height:1.6}
.primary{margin-top:18px;padding:12px 18px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);color:#020617;font-weight:900}
.secondary{padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.08)}
.choiceBtn{margin-top:10px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07)}
.choices{margin-top:16px;display:grid;gap:10px;max-width:520px}
.timer{margin-top:12px;font-size:13px;opacity:.9}
.walletOverlay{position:fixed;inset:0;background:rgba(2,6,23,.92);display:flex;align-items:center;justify-content:center;z-index:999}
.walletCard{max-width:420px;border-radius:22px;padding:24px;border:1px solid rgba(168,85,247,.45);box-shadow:0 0 40px rgba(168,85,247,.5)}
.walletTitle{font-size:14px;letter-spacing:2px;opacity:.8}
.walletBody{margin-top:12px;line-height:1.6}
.walletActions{margin-top:18px;display:flex;gap:10px}
.sound{border:none;background:none;color:white}
`;
