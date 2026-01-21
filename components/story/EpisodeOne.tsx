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
 * Persistence (cinematic only)
 * ────────────────────────────────────────────── */

function loadSave(): SaveShape | null {
  try {
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

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/* ──────────────────────────────────────────────
 * UI helpers
 * ────────────────────────────────────────────── */

function cardShell() {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
    boxShadow: "0 26px 110px rgba(0,0,0,0.65)",
  } as const;
}

function SceneImage({ alt }: { alt: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 300px at 20% 0%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(900px 300px at 90% 10%, rgba(168,85,247,0.14), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.92), rgba(2,6,23,0.78))",
        boxShadow: "0 28px 120px rgba(0,0,0,0.60)",
      }}
    >
      <div className="relative h-[180px] md:h-[220px] flex items-end p-4">
        <div className="text-[11px] font-mono tracking-wide text-white/60">
          SCENE // {alt}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Episode Component
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

  const [chainChoice, setChainChoice] = useState<EpisodeOneChoiceId | null>(null);
  const [chainLoading, setChainLoading] = useState(true);

  async function fetchEp1FromChain() {
    if (!publicClient) return;
    setChainLoading(true);
    try {
      const state: any = await publicClient.readContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "getBotState",
        args: [tokenId],
      });

      const raw = state?.episode1Choice ?? state?.[0];
      const n = typeof raw === "bigint" ? Number(raw) : raw;

      if (n in EP1_FROM_ENUM) setChainChoice(EP1_FROM_ENUM[n]);
      else setChainChoice(null);
    } catch {
      setChainChoice(null);
    } finally {
      setChainLoading(false);
    }
  }

  useEffect(() => {
    fetchEp1FromChain();
    const handler = () => fetchEp1FromChain();
    window.addEventListener("basebots-progress-updated", handler);
    return () => window.removeEventListener("basebots-progress-updated", handler);
  }, [tokenId, publicClient]);

  /* ───────── Sound ───────── */
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
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
    a.volume = 0.65;
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!soundEnabled) {
      a.pause();
      a.currentTime = 0;
      return;
    }
    a.play().catch(() => {});
  }, [soundEnabled]);

  function toggleSound() {
    setSoundEnabled((s) => {
      const next = !s;
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      return next;
    });
  }

  /* ───────── Timer ───────── */
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

  function buildSave(choiceId: EpisodeOneChoiceId): SaveShape {
    return {
      v: 1,
      episodeId: "ep1",
      choiceId,
      flags: {
        complied: choiceId === "ACCEPT",
        cautious: choiceId === "STALL",
        adversarial: choiceId === "SPOOF",
        severed: choiceId === "PULL_PLUG",
        soundOff: !soundEnabled,
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
        trust: choiceId === "ACCEPT" ? 70 : choiceId === "STALL" ? 55 : choiceId === "SPOOF" ? 26 : 16,
        threat: choiceId === "ACCEPT" ? 22 : choiceId === "STALL" ? 36 : choiceId === "SPOOF" ? 74 : 58,
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
            ? "A credentialed profile registered without challenge."
            : choiceId === "STALL"
            ? "A refusal logged as non-cooperative."
            : choiceId === "SPOOF"
            ? "A forged credential accepted long enough to duplicate records."
            : "A sever logged with a surviving trace.",
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
      alert(!isBase ? "Switch to Base (8453)." : "Connect wallet.");
      return;
    }

    const hash = await walletClient!.writeContract({
      address: BASEBOTS_SEASON2_STATE_ADDRESS,
      abi: BASEBOTS_SEASON2_STATE_ABI,
      functionName: "setEpisode1",
      args: [tokenId, EP1_ENUM[choiceId]],
    });

    await publicClient!.waitForTransactionReceipt({ hash });

    const s = buildSave(choiceId);
    saveGame(s);
    setSave(s);
    setChainChoice(choiceId);
    setPhase("ending");

    window.dispatchEvent(new Event("basebots-progress-updated"));
  }

  function restartEpisode() {
    localStorage.removeItem(STORAGE_KEY);
    setSave(null);
    setLocalPick(null);
    setChainChoice(null);
    setSecondsLeft(CHOICE_WINDOW_SECONDS);
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ───────── Render ───────── */

  return (
    <section className="relative overflow-hidden rounded-[28px] border p-5 md:p-7">
      <div className="flex justify-end gap-2">
        <button onClick={toggleSound}>SOUND: {soundEnabled ? "ON" : "OFF"}</button>
        <button onClick={restartEpisode}>Restart Episode</button>
        <button onClick={onExit}>Exit</button>
      </div>

      {phase === "intro" && (
        <div className="mt-6 grid gap-5">
          <SceneImage alt="Awakening" />
          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-xl font-extrabold text-white">AWAKENING</h2>
            <p className="mt-3 text-white/70">
              Cold boot. No startup tone. No friendly status lights.
            </p>
            <button onClick={() => setPhase("signal")} className="mt-6">
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "ending" && save && (
        <div className="mt-6 grid gap-5">
          <SceneImage alt="Evaluation" />
          <div className="rounded-3xl border p-5" style={cardShell()}>
            <h2 className="text-xl font-extrabold text-white">AUDIT RESULT</h2>
            <p className="mt-3 text-white/70">{save.artifact.desc}</p>
            <button onClick={restartEpisode} className="mt-6">
              Replay Episode
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
