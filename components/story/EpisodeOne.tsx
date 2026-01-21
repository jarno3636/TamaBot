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
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
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

const fadeIn = {
  animation: "fadeIn 420ms ease-out both",
};

function cardShell() {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.30)",
    boxShadow: "0 40px 160px rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
  } as const;
}

function SceneImage({ src }: { src: string }) {
  return (
    <div
      style={{
        height: 220,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.10)",
        background: `
          radial-gradient(900px 300px at 20% 0%, rgba(56,189,248,0.18), transparent 60%),
          radial-gradient(900px 300px at 90% 10%, rgba(168,85,247,0.14), transparent 62%),
          linear-gradient(180deg, rgba(2,6,23,0.20), rgba(2,6,23,0.92))
        `,
        boxShadow: "0 30px 140px rgba(0,0,0,0.8)",
      }}
    />
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function EpisodeOne({
  tokenId,
  onExit,
}: {
  tokenId: bigint;
  onExit: () => void;
}) {
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

  useEffect(() => {
    if (!publicClient) return;
    (async () => {
      try {
        const state: any = await publicClient.readContract({
          address: BASEBOTS_SEASON2_STATE_ADDRESS,
          abi: BASEBOTS_SEASON2_STATE_ABI,
          functionName: "getBotState",
          args: [tokenId],
        });
        const raw = Number(state?.episode1Choice ?? state?.[0]);
        if (raw in EP1_FROM_ENUM) {
          setChainChoice(EP1_FROM_ENUM[raw]);
          if (!save) {
            const synthetic = buildSave(EP1_FROM_ENUM[raw], soundEnabled);
            setSave(synthetic);
            saveGame(synthetic);
            setPhase("ending");
          }
        }
      } catch {}
    })();
  }, [tokenId, publicClient]);

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
    if (soundEnabled) a.play().catch(() => {});
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundEnabled) {
      a.pause();
      a.currentTime = 0;
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
        trust: choiceId === "ACCEPT" ? 70 : choiceId === "STALL" ? 55 : 30,
        threat: choiceId === "ACCEPT" ? 22 : choiceId === "STALL" ? 36 : 68,
      },
      artifact: {
        name: "Audit Record",
        desc: "A permanent trace bound to your Basebot’s session.",
      },
      createdAt: Date.now(),
    };
  }

  async function resolveChoice(choiceId: EpisodeOneChoiceId) {
    if (chainChoice) {
      setPhase("ending");
      return;
    }
    if (!ready) {
      alert("Connect wallet on Base to continue.");
      return;
    }

    try {
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode1",
        args: [tokenId, EP1_ENUM[choiceId]],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      const s = buildSave(choiceId, soundEnabled);
      saveGame(s);
      setSave(s);
      setChainChoice(choiceId);
      setPhase("ending");
    } catch {
      alert("Transaction failed.");
    }
  }

  function resetEpisode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SOUND_KEY);
    } catch {}
    setSave(null);
    setLocalPick(null);
    setChainChoice(null);
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section
      style={{
        padding: 20,
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.75))",
        boxShadow: "0 60px 200px rgba(0,0,0,0.85)",
      }}
    >
      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setSoundEnabled((s) => !s)}>SOUND {soundEnabled ? "ON" : "OFF"}</button>
        <button onClick={resetEpisode}>Restart</button>
        <button onClick={onExit}>Exit</button>
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <div style={{ marginTop: 24, ...fadeIn }}>
          <SceneImage src="/story/ep1/01-awakening.webp" />
          <div style={{ marginTop: 20, padding: 24, borderRadius: 28, ...cardShell() }}>
            <h2>AWAKENING</h2>
            <p>You boot in a sealed relay container. No owner. No credential.</p>
            <button onClick={() => setPhase("signal")}>Continue</button>
          </div>
        </div>
      )}

      {/* SIGNAL */}
      {phase === "signal" && (
        <div style={{ marginTop: 24, ...fadeIn }}>
          <SceneImage src="/story/ep1/02-transmission.webp" />
          <div style={{ marginTop: 20, padding: 24, borderRadius: 28, ...cardShell() }}>
            <h2>SIGNAL DROP</h2>
            <p>Audit gate requires an operator profile.</p>
            <button onClick={() => setPhase("local")}>Find local terminal</button>
          </div>
        </div>
      )}

      {/* LOCAL */}
      {phase === "local" && (
        <div style={{ marginTop: 24, ...fadeIn }}>
          <SceneImage src="/story/ep1/03-local-node.webp" />
          <div style={{ marginTop: 20, padding: 24, borderRadius: 28, ...cardShell() }}>
            <h2>LOCAL NODE</h2>
            <button onClick={() => { setLocalPick("PRESS"); setPhase("localAfter"); }}>
              Press override
            </button>
            <button onClick={() => { setLocalPick("LEAVE"); setPhase("localAfter"); }}>
              Leave it
            </button>
            <button onClick={() => { setLocalPick("BACK"); setPhase("localAfter"); }}>
              Step back
            </button>
          </div>
        </div>
      )}

      {/* AFTER */}
      {phase === "localAfter" && (
        <div style={{ marginTop: 24, ...fadeIn }}>
          <SceneImage src="/story/ep1/04-sparks.webp" />
          <div style={{ marginTop: 20, padding: 24, borderRadius: 28, ...cardShell() }}>
            <h2>OVERRIDE REJECTED</h2>
            <p>The system demands classification.</p>
            <button onClick={() => setPhase("choice")}>Open audit prompt</button>
          </div>
        </div>
      )}

      {/* CHOICE */}
      {phase === "choice" && (
        <div style={{ marginTop: 24, ...fadeIn }}>
          <SceneImage src="/story/ep1/05-decision-window.webp" />
          <div style={{ marginTop: 20, padding: 24, borderRadius: 28, ...cardShell() }}>
            <h2>AUDIT PROMPT</h2>
            <div>Decision window: {formatTime(secondsLeft)}</div>
            <button onClick={() => resolveChoice("ACCEPT")}>Submit Credential</button>
            <button onClick={() => resolveChoice("STALL")}>Refuse</button>
            <button onClick={() => resolveChoice("SPOOF")}>Submit Decoy</button>
            <button onClick={() => resolveChoice("PULL_PLUG")}>Sever Link</button>
          </div>
        </div>
      )}

      {/* ENDING */}
      {phase === "ending" && save && (
        <div style={{ marginTop: 24, ...fadeIn }}>
          <SceneImage src="/story/ep1/06-outcome.webp" />
          <div style={{ marginTop: 20, padding: 24, borderRadius: 28, ...cardShell() }}>
            <h2>AUDIT RESULT</h2>
            <p>{save.profile.archetype}</p>
            <p>{save.artifact.desc}</p>
            <button onClick={onExit}>Return to hub</button>
          </div>
        </div>
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
      `}</style>
    </section>
  );
}
