"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import {
  BASEBOTS_SEASON2_STATE_ADDRESS,
  BASEBOTS_SEASON2_STATE_ABI,
} from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

export type EpisodeOneChoiceId = "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";

const EP1_ENUM: Record<EpisodeOneChoiceId, number> = {
  ACCEPT: 0,
  STALL: 1,
  SPOOF: 2,
  PULL_PLUG: 3,
};

const EP1_FROM_ENUM: Record<number, EpisodeOneChoiceId> = {
  0: "ACCEPT",
  1: "STALL",
  2: "SPOOF",
  3: "PULL_PLUG",
};

type SaveShape = {
  v: number;
  episodeId: "ep1";
  choiceId: EpisodeOneChoiceId;
  flags: {
    complied: boolean;
    cautious: boolean;
    adversarial: boolean;
    severed: boolean;
    soundOff: boolean;
  };
  profile: {
    archetype: "Operator" | "Ghost" | "Saboteur" | "Severed";
    threat: number;
    trust: number;
  };
  artifact: {
    name: string;
    desc: string;
  };
  createdAt: number;
};

const STORAGE_KEY = "basebots_ep1_cinematic_v1";
const SOUND_KEY = "basebots_ep1_sound";

/* ──────────────────────────────────────────────
 * Persistence
 * ────────────────────────────────────────────── */

function loadSave(): SaveShape | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SaveShape) : null;
  } catch {
    return null;
  }
}

function saveGame(save: SaveShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

/* ──────────────────────────────────────────────
 * UI helpers
 * ────────────────────────────────────────────── */

const fadeIn = { animation: "fadeIn 420ms ease-out both" };

function cardShell() {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.30)",
    boxShadow: "0 40px 160px rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
  } as const;
}

function pillButtonStyle(active?: boolean) {
  return {
    border: "1px solid rgba(255,255,255,0.14)",
    background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
    boxShadow: "0 14px 50px rgba(0,0,0,0.35)",
    WebkitTapHighlightColor: "transparent",
  } as const;
}

function primaryButtonStyle() {
  return {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.78))",
    color: "rgba(2,6,23,0.98)",
    borderRadius: 999,
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.3,
    boxShadow: "0 18px 70px rgba(56,189,248,0.18)",
    WebkitTapHighlightColor: "transparent",
  } as const;
}

function SceneImage({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 220,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 300px at 20% 0%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(900px 300px at 90% 10%, rgba(168,85,247,0.14), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.20), rgba(2,6,23,0.94))",
        boxShadow: "0 30px 140px rgba(0,0,0,0.8)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* subtle scanline */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 2px, transparent 6px)",
          opacity: 0.12,
          mixBlendMode: "overlay",
        }}
      />
      {/* label */}
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 14,
          padding: "8px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.35)",
          color: "rgba(255,255,255,0.86)",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function normalizeTokenId(input: string | number | bigint): bigint | null {
  try {
    if (typeof input === "bigint") return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input) || input < 0) return null;
      return BigInt(Math.floor(input));
    }
    // string
    const trimmed = input.trim();
    if (!trimmed) return null;
    // allow "123" or "0x..." (though tokenIds usually decimal)
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeOne({
  tokenId,
  onExit,
}: {
  // IMPORTANT: allow string/number so parent server components don’t try to pass BigInt (serialization crash)
  tokenId: bigint | string | number;
  onExit: () => void;
}) {
  // Always visible “hydration proof”
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  const existing = useMemo(() => loadSave(), []);
  const [phase, setPhase] = useState<
    "intro" | "signal" | "local" | "localAfter" | "choice" | "ending"
  >("intro");

  const CHOICE_WINDOW_SECONDS = 90;
  const [secondsLeft, setSecondsLeft] = useState(CHOICE_WINDOW_SECONDS);
  const [save, setSave] = useState<SaveShape | null>(existing);
  const [localPick, setLocalPick] = useState<null | "PRESS" | "LEAVE" | "BACK">(null);

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;
  const ready = !!address && !!walletClient && !!publicClient && isBase;

  /* ───────── chain state ───────── */
  const [chainChoice, setChainChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [chainStatus, setChainStatus] = useState<string>("Idle");

  /* ───────── sound ───────── */
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/s1.mp3");
    a.loop = true;
    a.volume = 0.6;
    audioRef.current = a;

    // Don’t auto-play aggressively; still try but don’t crash
    if (soundEnabled) a.play().catch(() => {});

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

    if (!soundEnabled) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    } else {
      a.play().catch(() => {});
    }

    try {
      localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
    } catch {}
  }, [soundEnabled]);

  /* ───────── timer ───────── */
  useEffect(() => {
    if (phase !== "choice") return;
    setSecondsLeft(CHOICE_WINDOW_SECONDS);
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "choice" && secondsLeft === 0) {
      resolveChoice("STALL");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  /* ───────── helpers ───────── */

  function buildSave(choiceId: EpisodeOneChoiceId, soundOn: boolean): SaveShape {
    return {
      v: 1,
      episodeId: "ep1",
      choiceId,
      flags: {
        complied: choiceId === "ACCEPT",
        cautious: choiceId === "STALL",
        adversarial: choiceId === "SPOOF",
        severed: choiceId === "PULL_PLUG",
        soundOff: !soundOn,
      },
      profile: {
        archetype:
          choiceId === "ACCEPT"
            ? "Operator"
            : choiceId === "STALL"
            ? "Ghost"
            : choiceId === "SPOOF"
            ? "Saboteur"
            : "Severed",
        trust:
          choiceId === "ACCEPT" ? 70 : choiceId === "STALL" ? 55 : choiceId === "SPOOF" ? 26 : 16,
        threat:
          choiceId === "ACCEPT" ? 22 : choiceId === "STALL" ? 36 : choiceId === "SPOOF" ? 74 : 58,
      },
      artifact: {
        name:
          choiceId === "ACCEPT"
            ? "Compliance Record"
            : choiceId === "STALL"
            ? "Observation Gap"
            : choiceId === "SPOOF"
            ? "Contradictory Authority"
            : "Termination Evidence",
        desc:
          choiceId === "ACCEPT"
            ? "A credentialed profile registered to your Basebot without challenge."
            : choiceId === "STALL"
            ? "A session finalized with withheld identity — logged as non-cooperative."
            : choiceId === "SPOOF"
            ? "A forged credential accepted long enough to create two official records."
            : "A hard sever logged at the transport layer with a surviving trace.",
      },
      createdAt: Date.now(),
    };
  }

  async function fetchEp1FromChain() {
    if (!publicClient) return;
    if (!tokenIdBig) {
      setChainStatus("TokenId invalid (client)");
      return;
    }

    setChainStatus("Reading chain…");
    try {
      const state: any = await publicClient.readContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "getBotState",
        args: [tokenIdBig],
      });

      const raw =
        state?.episode1Choice ?? state?.ep1Choice ?? state?.episode1 ?? state?.[0];

      const n = typeof raw === "bigint" ? Number(raw) : typeof raw === "number" ? raw : NaN;

      if (!Number.isNaN(n) && n in EP1_FROM_ENUM) {
        const choice = EP1_FROM_ENUM[n];
        setChainChoice(choice);
        setChainStatus(`Chain EP1 set: ${choice}`);
        if (!save) {
          const synthetic = buildSave(choice, soundEnabled);
          setSave(synthetic);
          saveGame(synthetic);
        }
        setPhase("ending");
      } else {
        setChainChoice(null);
        setChainStatus("Chain EP1 not set");
      }
    } catch (e: any) {
      setChainChoice(null);
      setChainStatus(`Read failed: ${String(e?.shortMessage || e?.message || e)}`);
    }
  }

  useEffect(() => {
    fetchEp1FromChain();
    const handler = () => fetchEp1FromChain();
    window.addEventListener("basebots-progress-updated", handler);
    return () => window.removeEventListener("basebots-progress-updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, tokenIdBig]);

  async function resolveChoice(choiceId: EpisodeOneChoiceId) {
    if (chainChoice) {
      setPhase("ending");
      return;
    }

    if (!tokenIdBig) {
      alert("tokenId is invalid on client. Pass tokenId as a string/number, not BigInt.");
      return;
    }

    if (!ready) {
      alert(!isBase ? "Switch to Base (8453) first." : "Connect wallet to continue.");
      return;
    }

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode1",
        args: [tokenIdBig, EP1_ENUM[choiceId]],
      });

      setChainStatus("Waiting for confirmation…");
      await publicClient!.waitForTransactionReceipt({ hash });

      const s = buildSave(choiceId, soundEnabled);
      saveGame(s);
      setSave(s);
      setChainChoice(choiceId);
      setPhase("ending");
      setChainStatus(`Committed: ${choiceId}`);

      window.dispatchEvent(new Event("basebots-progress-updated"));
    } catch (e: any) {
      setChainStatus(`Tx failed: ${String(e?.shortMessage || e?.message || e)}`);
      alert("Transaction failed or was rejected.");
    }
  }

  function hardRestart() {
    // Hard reset: clear local + force reload to guarantee hydration resets
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.location.reload();
  }

  function softRestart() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSave(null);
    setLocalPick(null);
    setPhase("intro");
    try {
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch {}
  }

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section
      style={{
        padding: 18,
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.74))",
        boxShadow: "0 60px 200px rgba(0,0,0,0.85)",
      }}
    >
      {/* Always-visible boot console (proves hydration) */}
      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "radial-gradient(900px 260px at 20% 0%, rgba(56,189,248,0.10), transparent 60%), rgba(255,255,255,0.04)",
          padding: 14,
          color: "rgba(255,255,255,0.78)",
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>BOOT CONSOLE</div>
          <div style={{ opacity: 0.9 }}>
            {hydrated ? "Hydrated ✅" : "Hydrating…"} • tokenId:{" "}
            <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 800 }}>
              {tokenIdBig ? tokenIdBig.toString() : "INVALID"}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 8, opacity: 0.92 }}>
          chain: <b>{isBase ? "Base(8453)" : String(chain?.id ?? "none")}</b> • wallet:{" "}
          <b>{address ? "connected" : "not connected"}</b> • status: <b>{chainStatus}</b>
        </div>

        {!tokenIdBig && (
          <div style={{ marginTop: 10, color: "rgba(251,113,133,0.92)", fontWeight: 800 }}>
            tokenId is invalid on the client. This usually happens when a Server Component tries to pass a BigInt.
            Pass tokenId as a STRING (e.g. "123") into EpisodeOne.
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            style={pillButtonStyle(soundEnabled)}
          >
            SOUND {soundEnabled ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={softRestart} style={pillButtonStyle()}>
            Restart (soft)
          </button>
          <button type="button" onClick={hardRestart} style={pillButtonStyle()}>
            Restart (hard)
          </button>
          <button type="button" onClick={onExit} style={pillButtonStyle()}>
            Exit
          </button>
        </div>
      </div>

      {/* If tokenId is invalid, stop here—never blank */}
      {!tokenIdBig ? (
        <div style={{ marginTop: 16, padding: 18, borderRadius: 22, ...cardShell() }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>
            Episode cannot load
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
            Fix: in the parent, pass <b>tokenId as a string</b> (e.g. <code>{"tokenId=\"123\""}</code>),
            not a BigInt.
          </div>
        </div>
      ) : (
        <>
          {/* INTRO */}
          {phase === "intro" && (
            <div style={{ marginTop: 18, ...fadeIn }}>
              <SceneImage label="Awakening" />
              <div style={{ marginTop: 14, padding: 22, borderRadius: 28, ...cardShell() }}>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
                  AWAKENING
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                  Cold boot. No owner. No credential. The room expects an operator profile that doesn’t exist.
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setPhase("signal")} style={primaryButtonStyle()}>
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={fetchEp1FromChain}
                    style={pillButtonStyle()}
                  >
                    Refresh chain
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SIGNAL */}
          {phase === "signal" && (
            <div style={{ marginTop: 18, ...fadeIn }}>
              <SceneImage label="Signal Drop" />
              <div style={{ marginTop: 14, padding: 22, borderRadius: 28, ...cardShell() }}>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
                  SIGNAL DROP
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                  A polished interface tries to load—then collapses into bare text:
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 12,
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    AUDIT GATE: OPERATOR PROFILE REQUIRED
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button type="button" onClick={() => setPhase("local")} style={primaryButtonStyle()}>
                    Find the local terminal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LOCAL */}
          {phase === "local" && (
            <div style={{ marginTop: 18, ...fadeIn }}>
              <SceneImage label="Local Node" />
              <div style={{ marginTop: 14, padding: 22, borderRadius: 28, ...cardShell() }}>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
                  LOCAL CONTROL NODE
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                  You find an older recess panel with a worn actuator labeled <b>MANUAL OVERRIDE</b>.
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => { setLocalPick("PRESS"); setPhase("localAfter"); }}
                    style={primaryButtonStyle()}
                  >
                    Press override
                  </button>

                  <button
                    type="button"
                    onClick={() => { setLocalPick("LEAVE"); setPhase("localAfter"); }}
                    style={pillButtonStyle()}
                  >
                    Leave it alone
                  </button>

                  <button
                    type="button"
                    onClick={() => { setLocalPick("BACK"); setPhase("localAfter"); }}
                    style={pillButtonStyle()}
                  >
                    Step back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LOCAL AFTER */}
          {phase === "localAfter" && (
            <div style={{ marginTop: 18, ...fadeIn }}>
              <SceneImage label="Override Rejected" />
              <div style={{ marginTop: 14, padding: 22, borderRadius: 28, ...cardShell() }}>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
                  OVERRIDE REJECTED
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                  {localPick === "PRESS" && "You press. It answers with denial."}
                  {localPick === "LEAVE" && "You don’t touch it. It triggers anyway."}
                  {localPick === "BACK" && "You step back. The workaround is removed."}
                  <div style={{ marginTop: 10 }}>
                    The audit text returns, cleaner, colder:
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 12,
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    AUDIT GATE: SUBMIT OPERATOR PROFILE OR BE CLASSIFIED
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button type="button" onClick={() => setPhase("choice")} style={primaryButtonStyle()}>
                    Open audit prompt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CHOICE */}
          {phase === "choice" && (
            <div style={{ marginTop: 18, ...fadeIn }}>
              <SceneImage label="Decision Window" />
              <div style={{ marginTop: 14, padding: 22, borderRadius: 28, ...cardShell() }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 20, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
                    AUDIT PROMPT
                  </div>
                  <div
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      padding: "8px 10px",
                      fontSize: 11,
                      fontWeight: 900,
                      color: secondsLeft <= 10 ? "rgba(255,241,242,0.95)" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {formatTime(secondsLeft)}
                  </div>
                </div>

                {!ready && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.72)",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Connect wallet on <b>Base (8453)</b> to commit your decision on-chain.
                  </div>
                )}

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <button type="button" onClick={() => resolveChoice("ACCEPT")} style={primaryButtonStyle()}>
                    Submit Credential
                  </button>
                  <button type="button" onClick={() => resolveChoice("STALL")} style={pillButtonStyle()}>
                    Refuse to Identify
                  </button>
                  <button type="button" onClick={() => resolveChoice("SPOOF")} style={pillButtonStyle()}>
                    Submit Decoy
                  </button>
                  <button type="button" onClick={() => resolveChoice("PULL_PLUG")} style={pillButtonStyle()}>
                    Sever the Link
                  </button>
                </div>

                <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  “What gets recorded becomes what gets enforced.”
                </div>
              </div>
            </div>
          )}

          {/* ENDING */}
          {phase === "ending" && save && (
            <div style={{ marginTop: 18, ...fadeIn }}>
              <SceneImage label="Outcome" />
              <div style={{ marginTop: 14, padding: 22, borderRadius: 28, ...cardShell() }}>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
                  AUDIT RESULT
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                  Archetype: <b style={{ color: "rgba(255,255,255,0.92)" }}>{save.profile.archetype}</b>
                  <div style={{ marginTop: 8 }}>
                    Artifact: <b style={{ color: "rgba(255,255,255,0.92)" }}>{save.artifact.name}</b>
                  </div>
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.62)" }}>{save.artifact.desc}</div>
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={onExit} style={primaryButtonStyle()}>
                    Return to hub
                  </button>
                  <button type="button" onClick={fetchEp1FromChain} style={pillButtonStyle()}>
                    Refresh chain
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        button {
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
