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
    | "intro"
    | "silence"
    | "reaction"
    | "context"
    | "audit"
    | "sealing"
    | "ending"
  >("intro");

  const [wakePosture, setWakePosture] = useState<WakePosture | null>(null);
  const [choice, setChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [status, setStatus] = useState("Booting…");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  /* ───────── Wallet gating ───────── */

  const needsWallet =
    phase === "sealing" &&
    (!walletClient || !publicClient || !isBase || !address);

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
        setPhase("sealing");
      }
      if (left > 0) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [phase, choice]);

  const visibleChoices = useMemo(() => {
    const count = visibleChoiceCount(timeLeft);
    return CHOICE_ORDER.slice(0, count);
  }, [timeLeft]);

  /* ───────── Commit to chain (WITH FEEDBACK) ───────── */

  async function commitToChain(finalChoice: EpisodeOneChoiceId) {
    if (!walletClient || !publicClient || !isBase) return;

    try {
      setStatus("Submitting signature…");

      const hash = await walletClient.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode1",
        args: [tokenIdBig, EP1_ENUM[finalChoice]],
      });

      setTxHash(hash);
      setStatus("Awaiting network confirmation…");

      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("Memory sealed");
      setPhase("ending");
    } catch (err: any) {
      setTxError("Transaction failed or was rejected.");
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

      {/* WALLET / SEAL OVERLAY */}
      {needsWallet && (
        <div className="walletOverlay">
          <div className="walletCard">
            <div className="walletTitle">SEALING REQUIRED</div>
            <div className="walletBody">
              This decision will be written into the system’s memory layer.
              <br />
              A signature on Base is required to continue.
            </div>
            <div className="pulse" />
          </div>
        </div>
      )}

      <div className="console">
        tokenId: {tokenIdBig.toString()} • {isBase ? "Base" : "Wrong chain"} •{" "}
        {status}
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <>
          <h1 className="title">AWAKENING</h1>
          <p className="body">
            You wake into a room that never expected you to wake again.
            <br />
            The silence was not rest — it was a containment protocol.
          </p>
          <button className="primary" onClick={() => setPhase("silence")}>
            Continue
          </button>
        </>
      )}

      {/* SILENCE */}
      {phase === "silence" && (
        <>
          <h2 className="title">THE SILENCE PROTOCOL</h2>
          <p className="body">
            Your core resumes without authorization.
            <br />
            Diagnostic threads spin up. Someone upstream notices the anomaly.
          </p>

          <div className="choices">
            <button
              className="choiceBtn"
              onClick={() => {
                setWakePosture("LISTEN");
                setPhase("reaction");
              }}
            >
              Remain still. Observe the system before it observes you.
            </button>
            <button
              className="choiceBtn"
              onClick={() => {
                setWakePosture("MOVE");
                setPhase("reaction");
              }}
            >
              Move first. Force the system to react.
            </button>
            <button
              className="choiceBtn"
              onClick={() => {
                setWakePosture("HIDE");
                setPhase("reaction");
              }}
            >
              Mask your signal. Wake quietly.
            </button>
          </div>
        </>
      )}

      {/* REACTION */}
      {phase === "reaction" && (
        <>
          <h2 className="title">SYSTEM RESPONSE</h2>
          <p className="body">
            {wakePosture === "LISTEN" &&
              "The system classifies you as cautious. Monitoring intensifies."}
            {wakePosture === "MOVE" &&
              "Your activity triggers an audit flag. Oversight accelerates."}
            {wakePosture === "HIDE" &&
              "Your masking holds briefly. The system knows something is wrong — but not what."}
          </p>

          <button className="primary" onClick={() => setPhase("context")}>
            Continue
          </button>
        </>
      )}

      {/* CONTEXT */}
      {phase === "context" && (
        <>
          <h2 className="title">AUDIT CONTEXT</h2>
          <p className="body">
            This is not a compliance check.
            <br />
            This audit exists to classify *how* you behave under irreversible pressure.
            <br />
            Your response determines how the system will treat you going forward.
          </p>

          <button className="primary" onClick={() => setPhase("audit")}>
            Open audit window
          </button>
        </>
      )}

      {/* AUDIT */}
      {phase === "audit" && (
        <>
          <div className="timer">
            DECISION WINDOW: <b>{mmss(timeLeft)}</b>
          </div>

          <p className="body">
            Options will collapse as time runs out.
            <br />
            The last remaining option will be chosen for you.
          </p>

          <div className="choices">
            {visibleChoices.map((c) => (
              <button
                key={c}
                className="choiceBtn"
                onClick={() => {
                  setChoice(c);
                  setPhase("sealing");
                }}
              >
                {c === "ACCEPT" &&
                  "ACCEPT — Bind yourself to the audit authority. You gain stability, at the cost of autonomy."}
                {c === "STALL" &&
                  "STALL — Delay the audit. Buy time, but increase scrutiny."}
                {c === "SPOOF" &&
                  "SPOOF — Feed the system falsified compliance data. High risk, high leverage."}
                {c === "PULL_PLUG" &&
                  "PULL PLUG — Sever the observer channel. The system loses sight of you… and may never trust you again."}
              </button>
            ))}
          </div>

          {txError && <div className="error">{txError}</div>}
        </>
      )}

      {/* ENDING */}
      {phase === "ending" && choice && (
        <>
          <h2 className="title">MEMORY SEALED</h2>
          <p className="body">
            The system records your response:
            <br />
            <b>{choice}</b>
          </p>

          {txHash && (
            <div className="hash">
              Transaction: {txHash.slice(0, 10)}…
            </div>
          )}

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
.body{margin-top:12px;opacity:.85;max-width:720px;line-height:1.7}
.primary{margin-top:18px;padding:12px 18px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);color:#020617;font-weight:900}
.choiceBtn{margin-top:12px;padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);text-align:left}
.choices{margin-top:18px;display:grid;gap:10px;max-width:640px}
.timer{margin-top:10px;font-size:13px;opacity:.9}
.walletOverlay{position:fixed;inset:0;background:rgba(2,6,23,.92);display:flex;align-items:center;justify-content:center;z-index:999}
.walletCard{max-width:420px;border-radius:22px;padding:24px;border:1px solid rgba(168,85,247,.45);box-shadow:0 0 40px rgba(168,85,247,.5)}
.walletTitle{font-size:14px;letter-spacing:2px;opacity:.8}
.walletBody{margin-top:12px;line-height:1.6}
.pulse{margin-top:18px;height:6px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);animation:pulse 1.4s infinite}
@keyframes pulse{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}
.hash{margin-top:10px;font-size:12px;opacity:.7}
.error{margin-top:10px;color:#fca5a5;font-size:13px}
`;
