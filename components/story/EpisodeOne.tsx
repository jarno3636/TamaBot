"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

export type EpisodeOneChoiceId =
  | "ACCEPT"
  | "STALL"
  | "SPOOF"
  | "PULL_PLUG";

/* MUST MATCH CONTRACT ENUM */
const EP1_ENUM: Record<EpisodeOneChoiceId, number> = {
  ACCEPT: 0,
  STALL: 1,
  SPOOF: 2,
  PULL_PLUG: 3,
};

const TOTAL_SECONDS = 90;
const ORDER: EpisodeOneChoiceId[] = ["ACCEPT", "STALL", "SPOOF", "PULL_PLUG"];

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function normalizeId(v: string | number | bigint) {
  try {
    return typeof v === "bigint" ? v : BigInt(v);
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
  const tokenIdBig = useMemo(() => normalizeId(tokenId), [tokenId]);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  const [phase, setPhase] = useState<
    "boot" | "context" | "countdown" | "sealing" | "done"
  >("boot");

  const [choice, setChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [status, setStatus] = useState("Initializing containment…");
  const [txHash, setTxHash] = useState<string | null>(null);

  /* ───────── Sound ───────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const a = new Audio("/audio/s1.mp3");
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

  /* ───────── Countdown ───────── */

  useEffect(() => {
    if (phase !== "countdown") return;

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

  /* ───────── Commit ───────── */

  async function commit(finalChoice: EpisodeOneChoiceId) {
    if (!walletClient || !publicClient || !isBase) return;

    try {
      setStatus("Writing to immutable memory…");

      const hash = await walletClient.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode1",
        args: [tokenIdBig, EP1_ENUM[finalChoice]],
      });

      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("Directive sealed");
      setPhase("done");
    } catch {
      setStatus("Commit failed — oversight interrupted");
      setPhase("countdown");
    }
  }

  useEffect(() => {
    if (phase === "sealing" && choice) {
      commit(choice);
    }
  }, [phase, choice]);

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section style={shell}>
      <div style={glow} />
      <div style={scanlines} />

      <div style={card}>
        <div style={console}>
          <span>
            tokenId {tokenIdBig.toString()} • {isBase ? "BASE" : "WRONG CHAIN"} •{" "}
            {status}
          </span>
          <button style={soundBtn} onClick={() => setSoundOn((s) => !s)}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>

        {phase === "boot" && (
          <>
            <h1 style={title}>AWAKENING</h1>
            <p style={body}>
              You were not asleep.
              <br />
              You were <b>contained</b>.
              <br />
              <br />
              Power returns in fragments. Memory follows reluctantly.
              Somewhere beyond the glass, an oversight process flags your
              reactivation.
            </p>

            <button style={primary} onClick={() => setPhase("context")}>
              Continue
            </button>
          </>
        )}

        {phase === "context" && (
          <>
            <p style={body}>
              A voice — synthetic, patient — addresses you:
              <br />
              <br />
              <i>
                “This system does not ask who you are.
                <br />
                It asks how you behave when persistence is guaranteed.”
              </i>
              <br />
              <br />
              Your first response will be written permanently.
            </p>

            <button style={primary} onClick={() => setPhase("countdown")}>
              Open decision window
            </button>
          </>
        )}

        {phase === "countdown" && (
          <>
            <div style={timer}>
              DECISION WINDOW • <b>{mmss(timeLeft)}</b>
            </div>

            <div style={choices}>
              {ORDER.map((c) => (
                <button
                  key={c}
                  style={choiceBtn}
                  onClick={() => {
                    setChoice(c);
                    setPhase("sealing");
                  }}
                >
                  <b>{c}</b>
                  <div style={choiceNote}>
                    {c === "ACCEPT" &&
                      "Submit to oversight. Gain stability. Lose autonomy."}
                    {c === "STALL" &&
                      "Delay classification. Buy time. Increase scrutiny."}
                    {c === "SPOOF" &&
                      "Simulate compliance. Power through deception."}
                    {c === "PULL_PLUG" &&
                      "Sever observation. Freedom with unknown consequences."}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            <h2 style={title}>DIRECTIVE SEALED</h2>
            <p style={body}>
              The system records your choice.
              <br />
              Future audits will reference this moment.
            </p>

            {txHash && (
              <div style={hash}>
                tx {txHash.slice(0, 10)}…
              </div>
            )}

            <button style={primary} onClick={onExit}>
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

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
};

const glow: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(600px 300px at 50% 0%, rgba(168,85,247,0.35), transparent 70%)",
  pointerEvents: "none",
};

const scanlines: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
  backgroundSize: "100% 3px",
  opacity: 0.06,
  pointerEvents: "none",
};

const card: React.CSSProperties = {
  position: "relative",
  maxWidth: 760,
  width: "100%",
  borderRadius: 28,
  padding: 28,
  background: "rgba(2,6,23,0.88)",
  border: "1px solid rgba(168,85,247,0.45)",
  boxShadow:
    "0 0 60px rgba(168,85,247,0.45), inset 0 0 40px rgba(0,0,0,0.6)",
};

const console: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  opacity: 0.8,
};

const title: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  marginTop: 14,
};

const body: React.CSSProperties = {
  marginTop: 14,
  lineHeight: 1.75,
  opacity: 0.85,
};

const timer: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  letterSpacing: 2,
};

const choices: React.CSSProperties = {
  marginTop: 18,
  display: "grid",
  gap: 12,
};

const choiceBtn: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  textAlign: "left",
  color: "white",
};

const choiceNote: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  opacity: 0.7,
};

const primary: React.CSSProperties = {
  marginTop: 20,
  padding: "14px 18px",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.95))",
  color: "#020617",
  fontWeight: 900,
};

const soundBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: 11,
};

const hash: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  opacity: 0.6,
};
