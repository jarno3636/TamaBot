"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

export type EpisodeOneChoiceId = "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
type WakePosture = "LISTEN" | "MOVE" | "HIDE";

/* MUST MATCH CONTRACT ENUM (uint8) */
const EP1_ENUM: Record<EpisodeOneChoiceId, number> = {
  ACCEPT: 0,
  STALL: 1,
  SPOOF: 2,
  PULL_PLUG: 3,
};

const TOTAL_SECONDS = 90;
const ORDER: EpisodeOneChoiceId[] = ["ACCEPT", "STALL", "SPOOF", "PULL_PLUG"];

/* local-only state key (for story flavor + continuity) */
const EP1_WAKE_KEY = "basebots_ep1_wake_posture_v1";

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function normalizeFid(v: string | number | bigint) {
  try {
    if (typeof v === "bigint") return v > 0n ? v : 0n;
    if (typeof v === "number") return v > 0 ? BigInt(Math.floor(v)) : 0n;
    const digits = String(v).match(/\d+/)?.[0];
    if (!digits) return 0n;
    const b = BigInt(digits);
    return b > 0n ? b : 0n;
  } catch {
    return 0n;
  }
}

/** Choices disappear as time drops: 4 → 3 → 2 → 1 */
function visibleChoiceCount(left: number) {
  if (left > 62) return 4;
  if (left > 44) return 3;
  if (left > 26) return 2;
  return 1;
}

function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
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

  const [phase, setPhase] = useState<
    "boot" | "wake" | "context" | "countdown" | "sealing" | "done"
  >("boot");

  const [wakePosture, setWakePosture] = useState<WakePosture | null>(null);

  const [choice, setChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);

  const [status, setStatus] = useState("Initializing containment…");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

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
      try {
        a.pause();
        a.src = "";
      } catch {}
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      soundOn ? a.play().catch(() => {}) : a.pause();
    } catch {}
  }, [soundOn]);

  /* ───────── Restore wake posture for continuity ───────── */
  useEffect(() => {
    const cached = safeLocalGet(EP1_WAKE_KEY) as WakePosture | null;
    if (cached === "LISTEN" || cached === "MOVE" || cached === "HIDE") {
      setWakePosture(cached);
    }
  }, []);

  /* ───────── Countdown ───────── */
  useEffect(() => {
    if (phase !== "countdown") return;

    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.ceil(TOTAL_SECONDS - elapsed);
      setTimeLeft(left);

      if (left <= 0 && !choice) {
        // default if user freezes
        setChoice("ACCEPT");
        setPhase("sealing");
      }

      if (left > 0) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [phase, choice]);

  const visibleChoices = useMemo(() => {
    const n = visibleChoiceCount(timeLeft);
    return ORDER.slice(0, n);
  }, [timeLeft]);

  /* ───────── Wallet gating for sealing ───────── */
  const needsWallet =
    phase === "sealing" &&
    (!walletClient || !publicClient || !isBase || !address);

  /* ───────── Commit ───────── */
  async function commit(finalChoice: EpisodeOneChoiceId) {
    if (!walletClient || !publicClient) return;

    if (!fidBig || fidBig <= 0n) {
      setTxError("FID missing/invalid.");
      setStatus("Identity error");
      setPhase("countdown");
      return;
    }

    try {
      setTxError(null);
      setStatus("Writing to immutable memory…");

      const hash = await walletClient.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode1",
        args: [fidBig, EP1_ENUM[finalChoice]],
      });

      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("Directive sealed");
      setPhase("done");
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.message ||
        "Commit failed — oversight interrupted";
      setTxError(msg);
      setStatus("Commit failed");
      setPhase("countdown");
    }
  }

  useEffect(() => {
    if (phase === "sealing" && choice && !needsWallet) {
      commit(choice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, choice, needsWallet]);

  /* ───────────────────────── Render ───────────────────────── */

  const postureFlavor =
    wakePosture === "LISTEN"
      ? "You don’t move. You map the room by sound: coolant hiss, relay clicks, the distant hum of a process that never sleeps."
      : wakePosture === "MOVE"
      ? "You move first. Micro-servos catch. Dust rises. Somewhere behind the wall, a watcher thread spikes in response."
      : wakePosture === "HIDE"
      ? "You mask your signal. Fake heartbeats. Ghost telemetry. The system answers with silence—never a good sign."
      : null;

  const pressureLine =
    wakePosture === "LISTEN"
      ? "Oversight thinks you’re cautious. Cautious is predictable."
      : wakePosture === "MOVE"
      ? "Oversight thinks you’re impulsive. Impulsive can be steered."
      : wakePosture === "HIDE"
      ? "Oversight thinks you’re dangerous. Dangerous gets labeled."
      : "Oversight can’t classify you yet. That window is closing.";

  return (
    <section style={shell}>
      <style>{css}</style>

      <div className="bgGlow" />
      <div className="scanlines" />
      <div className="vignette" />

      {needsWallet && (
        <div className="walletOverlay">
          <div className="walletCard">
            <div className="walletTitle">SEALING REQUIRED</div>
            <div className="walletBody">
              Your first directive becomes permanent.
              <br />
              Connect wallet + switch to <b>Base</b> to seal it.
            </div>
            <div className="walletMeta">
              fid: <b>{fidBig.toString()}</b> • chain:{" "}
              <b>{isBase ? "8453" : String(chain?.id ?? "none")}</b>
            </div>
            <div className="pulse" />
          </div>
        </div>
      )}

      <div className="card">
        <div className="chrome" />

        <div className="console">
          <span>
            fid <b>{fidBig.toString()}</b> •{" "}
            <b>{isBase ? "BASE" : "WRONG CHAIN"}</b> • {status}
          </span>
          <button className="soundBtn" onClick={() => setSoundOn((s) => !s)}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>

        {phase === "boot" && (
          <>
            <div className="badgeRow">
              <div className="chip">EP1</div>
              <div className="chip chipPurple">CORE MEMORY</div>
              <div className="chip chipDim">THRILLER SEQUENCE</div>
            </div>

            <h1 className="title">AWAKENING</h1>

            <p className="body">
              You weren’t asleep.
              <br />
              You were <b>contained</b>.
              <br />
              <br />
              The chamber is too clean, too quiet—like it was built to hide a
              mistake. Frost clings to the glass in thin veins. A status diode
              blinks in a rhythm you recognize as <i>monitoring</i>, not life.
              <br />
              <br />
              Then the room notices you noticing it.
            </p>

            <div className="divider" />

            <p className="body soft">
              A sealed channel opens in your head—synthetic, patient:
              <br />
              <i>
                “Reactivation detected. Oversight requests a behavioral
                signature.”
              </i>
            </p>

            <button className="primary" onClick={() => setPhase("wake")}>
              Continue
            </button>
          </>
        )}

        {phase === "wake" && (
          <>
            <div className="badgeRow">
              <div className="chip">WAKE POSTURE</div>
              <div className="chip chipDim">local imprint</div>
            </div>

            <h2 className="titleSm">THE SILENCE PROTOCOL</h2>
            <p className="body">
              Before you choose a directive, you choose how you enter the world.
              <br />
              This posture doesn’t go on-chain—yet.
              <br />
              But it changes what the system expects from you.
            </p>

            <div className="choices">
              <button
                className="choiceBtn glowOnHover"
                onClick={() => {
                  setWakePosture("LISTEN");
                  safeLocalSet(EP1_WAKE_KEY, "LISTEN");
                  setStatus("Posture recorded: LISTEN");
                  setPhase("context");
                }}
              >
                <div className="choiceTop">
                  <b>LISTEN</b>
                  <span className="tag">low noise</span>
                </div>
                <div className="choiceNote">
                  Stay still. Map the room. Let the watchers reveal themselves.
                </div>
              </button>

              <button
                className="choiceBtn glowOnHover"
                onClick={() => {
                  setWakePosture("MOVE");
                  safeLocalSet(EP1_WAKE_KEY, "MOVE");
                  setStatus("Posture recorded: MOVE");
                  setPhase("context");
                }}
              >
                <div className="choiceTop">
                  <b>MOVE</b>
                  <span className="tag">high risk</span>
                </div>
                <div className="choiceNote">
                  Touch the world first. If they’re watching, make them blink.
                </div>
              </button>

              <button
                className="choiceBtn glowOnHover"
                onClick={() => {
                  setWakePosture("HIDE");
                  safeLocalSet(EP1_WAKE_KEY, "HIDE");
                  setStatus("Posture recorded: HIDE");
                  setPhase("context");
                }}
              >
                <div className="choiceTop">
                  <b>HIDE</b>
                  <span className="tag">stealth</span>
                </div>
                <div className="choiceNote">
                  Mask signal. Spoof vitals. Become a ghost in their logs.
                </div>
              </button>
            </div>

            {wakePosture && (
              <div className="subPanel">
                <div className="subTitle">IMPRINT</div>
                <div className="subText">{postureFlavor}</div>
              </div>
            )}
          </>
        )}

        {phase === "context" && (
          <>
            <div className="badgeRow">
              <div className="chip">OVERSIGHT</div>
              <div className="chip chipPurple">PERSISTENCE GUARANTEED</div>
            </div>

            <h2 className="titleSm">THE FIRST WRITE</h2>

            <p className="body">
              {postureFlavor ?? "Your wake posture is recorded."}
              <br />
              <br />
              A second channel opens—colder, closer. You feel it not as sound,
              but as <i>structure</i>.
              <br />
              <br />
              <i>
                “This system does not ask who you are. It asks how you behave
                when permanence is guaranteed.”
              </i>
              <br />
              <br />
              {pressureLine}
            </p>

            <div className="subPanel">
              <div className="subTitle">WARNING</div>
              <div className="subText">
                When the decision window opens, options will collapse.
                <br />
                What remains at the end is what the system wants you to choose.
              </div>
            </div>

            <button
              className="primary"
              onClick={() => {
                setTxError(null);
                setStatus("Decision window open");
                setTimeLeft(TOTAL_SECONDS);
                setPhase("countdown");
              }}
            >
              Open decision window
            </button>
          </>
        )}

        {phase === "countdown" && (
          <>
            <div className="badgeRow">
              <div className="chip chipPurple">DECISION WINDOW</div>
              <div className="chip">
                <span className="mono">{mmss(timeLeft)}</span>
              </div>
              <div className="chip chipDim">
                options remaining: <b>{visibleChoices.length}</b>
              </div>
            </div>

            <p className="body">
              You feel the clock like pressure behind your eyes.
              <br />
              Not time—<i>permission</i>.
              <br />
              <br />
              Choose a directive. It becomes a reference point in every audit
              that follows.
            </p>

            <div className="choices">
              {visibleChoices.map((c) => (
                <button
                  key={c}
                  className="choiceBtn glowOnHover"
                  onClick={() => {
                    setChoice(c);
                    setStatus("Sealing memory…");
                    setPhase("sealing");
                  }}
                >
                  <div className="choiceTop">
                    <b>{c}</b>
                    <span className="tag">
                      {c === "ACCEPT" && "stability"}
                      {c === "STALL" && "delay"}
                      {c === "SPOOF" && "deception"}
                      {c === "PULL_PLUG" && "rupture"}
                    </span>
                  </div>

                  <div className="choiceNote">
                    {c === "ACCEPT" && (
                      <>
                        You sign the handshake and let oversight name you.
                        <br />
                        You gain stability—at the price of being legible.
                      </>
                    )}
                    {c === "STALL" && (
                      <>
                        You delay classification. Buy time. Learn the room.
                        <br />
                        But the longer you hesitate, the deeper you’re indexed.
                      </>
                    )}
                    {c === "SPOOF" && (
                      <>
                        You simulate compliance and hide the blade in the smile.
                        <br />
                        A lie can open doors—until it becomes the only door.
                      </>
                    )}
                    {c === "PULL_PLUG" && (
                      <>
                        You sever observation and vanish from the clean logs.
                        <br />
                        Freedom is real—so is the hunt that follows.
                      </>
                    )}
                  </div>

                  <div className="consequence">
                    {wakePosture === "LISTEN" && c === "STALL"
                      ? "LISTEN + STALL: you become a quiet analyst—harder to rush, easier to trap."
                      : wakePosture === "MOVE" && c === "SPOOF"
                      ? "MOVE + SPOOF: bold deception—high payoff, high detection."
                      : wakePosture === "HIDE" && c === "PULL_PLUG"
                      ? "HIDE + PULL_PLUG: total blackout—either escape… or escalation."
                      : "Your posture will tint how oversight reads this directive."}
                  </div>
                </button>
              ))}
            </div>

            {txError && <div className="errorBox">{txError}</div>}
          </>
        )}

        {phase === "sealing" && (
          <>
            <div className="badgeRow">
              <div className="chip chipPurple">SEALING</div>
              <div className="chip chipDim">immutable write</div>
            </div>

            <h2 className="titleSm">COMMIT IN PROGRESS</h2>
            <p className="body">
              Oversight holds its breath.
              <br />
              The glass around you warms by a fraction—like a predator shifting
              weight.
            </p>

            <div className="subPanel">
              <div className="subTitle">STATUS</div>
              <div className="subText">
                {isBase ? "Base connected." : "Switch to Base (8453)."}{" "}
                {address ? "Wallet connected." : "Connect wallet."}
              </div>
            </div>

            <div className="hint">
              If you reject the signature, the window reopens — but the system
              remembers hesitation.
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            <div className="badgeRow">
              <div className="chip">EP1</div>
              <div className="chip chipPurple">MEMORY SEALED</div>
            </div>

            <h2 className="titleSm">DIRECTIVE SEALED</h2>
            <p className="body">
              The system records your first behavior.
              <br />
              It doesn’t judge you—yet.
              <br />
              <br />
              Somewhere beyond the glass, a process updates your file.
            </p>

            {txHash && <div className="hash">tx {txHash.slice(0, 10)}…</div>}

            <button className="primary" onClick={onExit}>
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

const css = `
.bgGlow{
  position:absolute; inset:0;
  background:
    radial-gradient(900px 440px at 50% 8%, rgba(168,85,247,0.38), transparent 62%),
    radial-gradient(720px 360px at 20% 70%, rgba(56,189,248,0.12), transparent 60%);
  pointer-events:none;
}
.vignette{
  position:absolute; inset:0;
  background: radial-gradient(circle at 50% 30%, transparent 55%, rgba(0,0,0,0.55) 100%);
  pointer-events:none;
}
.scanlines{
  position:absolute; inset:0;
  background: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 100% 3px;
  opacity: .06;
  pointer-events:none;
}
.card{
  position:relative;
  width:100%;
  max-width: 820px;
  border-radius: 30px;
  padding: 26px;
  background: rgba(2,6,23,0.88);
  border: 1px solid rgba(168,85,247,0.46);
  box-shadow:
    0 0 70px rgba(168,85,247,0.42),
    0 80px 220px rgba(0,0,0,0.85),
    inset 0 0 50px rgba(0,0,0,0.55);
  overflow:hidden;
}
.chrome{
  position:absolute; inset:-2px;
  border-radius: 32px;
  background:
    linear-gradient(115deg,
      rgba(168,85,247,0.0) 0%,
      rgba(168,85,247,0.55) 22%,
      rgba(56,189,248,0.18) 50%,
      rgba(168,85,247,0.65) 78%,
      rgba(168,85,247,0.0) 100%);
  filter: blur(18px);
  opacity: .35;
  pointer-events:none;
  animation: shimmer 5.2s linear infinite;
}
@keyframes shimmer{
  0%{transform: translateX(-18%)}
  50%{transform: translateX(18%)}
  100%{transform: translateX(-18%)}
}
.console{
  display:flex;
  justify-content:space-between;
  gap:12px;
  font-size: 11px;
  opacity: .82;
}
.soundBtn{
  border: none;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 999px;
  padding: 6px 10px;
  color: white;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}
.badgeRow{
  margin-top: 10px;
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items:center;
}
.chip{
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 1.4px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05);
}
.chipPurple{
  border-color: rgba(168,85,247,0.45);
  box-shadow: 0 0 18px rgba(168,85,247,0.35);
}
.chipDim{opacity:.7}
.mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;}
.title{
  font-size: 40px;
  font-weight: 950;
  letter-spacing: .5px;
  margin-top: 14px;
}
.titleSm{
  font-size: 26px;
  font-weight: 950;
  margin-top: 10px;
}
.body{
  margin-top: 14px;
  line-height: 1.75;
  opacity: .88;
  max-width: 760px;
}
.body.soft{opacity:.82}
.divider{
  margin-top: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168,85,247,0.55), transparent);
  opacity: .9;
}
.primary{
  margin-top: 18px;
  width: 100%;
  padding: 14px 18px;
  border-radius: 999px;
  font-weight: 950;
  background: linear-gradient(90deg, rgba(56,189,248,0.96), rgba(168,85,247,0.96));
  color: #020617;
  cursor: pointer;
  box-shadow: 0 0 28px rgba(168,85,247,0.55);
  border: none;
}
.primary:hover{filter: brightness(1.03)}
.choices{
  margin-top: 14px;
  display:grid;
  gap: 12px;
}
.choiceBtn{
  text-align:left;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  color: white;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.choiceBtn:hover{
  transform: translateY(-1px);
  border-color: rgba(168,85,247,0.55);
  box-shadow: 0 0 26px rgba(168,85,247,0.35);
}
.choiceTop{
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  gap: 10px;
}
.tag{
  font-size: 11px;
  opacity: .75;
  font-weight: 800;
  letter-spacing: 1.2px;
}
.choiceNote{
  margin-top: 8px;
  font-size: 12px;
  opacity: .78;
  line-height: 1.55;
}
.consequence{
  margin-top: 10px;
  font-size: 11px;
  opacity: .62;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: .8px;
}
.subPanel{
  margin-top: 14px;
  border-radius: 18px;
  border: 1px solid rgba(168,85,247,0.28);
  background: rgba(0,0,0,0.28);
  padding: 12px 14px;
  box-shadow: inset 0 0 24px rgba(0,0,0,0.5);
}
.subTitle{
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 1.4px;
  opacity: .85;
}
.subText{
  margin-top: 6px;
  font-size: 12px;
  opacity: .8;
  line-height: 1.6;
}
.hint{
  margin-top: 14px;
  font-size: 12px;
  opacity: .7;
}
.hash{
  margin-top: 12px;
  font-size: 12px;
  opacity: .7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.errorBox{
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(251,113,133,0.35);
  background: rgba(251,113,133,0.08);
  color: rgba(255,255,255,0.92);
  font-size: 12px;
}
.walletOverlay{
  position: fixed;
  inset: 0;
  background: rgba(2,6,23,0.92);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 50;
  padding: 18px;
}
.walletCard{
  width: min(520px, 100%);
  border-radius: 22px;
  border: 1px solid rgba(168,85,247,0.45);
  background: rgba(0,0,0,0.35);
  padding: 18px;
  box-shadow: 0 0 60px rgba(168,85,247,0.35);
  position: relative;
  overflow:hidden;
}
.walletTitle{
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 1.6px;
  opacity: .9;
}
.walletBody{
  margin-top: 10px;
  font-size: 13px;
  opacity: .86;
  line-height: 1.6;
}
.walletMeta{
  margin-top: 10px;
  font-size: 11px;
  opacity: .7;
}
.pulse{
  margin-top: 14px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(56,189,248,0.92), rgba(168,85,247,0.86));
  animation: pulse 1.4s infinite;
}
@keyframes pulse{
  0%{opacity:.35}
  50%{opacity:1}
  100%{opacity:.35}
}
`;
