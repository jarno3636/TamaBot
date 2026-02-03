"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import useFid from "@/hooks/useFid";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";
import BonusEchoArchive from "@/components/story/BonusEchoArchive";
import GlobalStatsPanel from "@/components/story/GlobalStatsPanel";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Images */
/* ────────────────────────────────────────────── */
const IMAGES = {
  prologue: "/story/prologue.png",
  ep1: "/story/01-awakening.png",
  ep2: "/story/ep2.png",
  ep3: "/story/ep3.png",
  ep4: "/story/ep4.png",
  ep5: "/story/ep5.png",
  bonus: "/story/b1.png",
  archive: "/story/b2.png",
} as const;

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */
function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* ────────────────────────────────────────────── */

type Mode =
  | "hub"
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5"
  | "bonus"
  | "archive";

type ChainState = {
  finalized: boolean;
  ep1: boolean;
  ep2: boolean;
  ep3: boolean;
  ep4: boolean;
  ep5: boolean;
  schemaVersion?: number;
};

/* ────────────────────────────────────────────── */

export default function StoryPage() {
  const { fid } = useFid();

  const hasIdentity = isValidFID(fid);
  const fidBigInt = hasIdentity ? BigInt(fid!) : undefined;

  const [mode, setMode] = useState<Mode>("hub");
  const [syncing, setSyncing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  /* ───────── Read on-chain state (SAFE) ───────── */

  const {
    data,
    refetch,
    isLoading,
    isFetching,
    error,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: fidBigInt ? [fidBigInt] : undefined,
    query: { enabled: Boolean(fidBigInt) },
  });

  const state: ChainState = useMemo(() => {
    if (!data) {
      return {
        finalized: false,
        ep1: false,
        ep2: false,
        ep3: false,
        ep4: false,
        ep5: false,
      };
    }

    const s: any = data;
    return {
      finalized: Boolean(s.finalized),
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
      schemaVersion: Number(s.schemaVersion),
    };
  }, [data]);

  /* ───────── Manual sync only (SAFE) ───────── */

  async function sync() {
    if (!hasIdentity || syncing) return;
    setSyncing(true);
    try {
      await refetch();
    } finally {
      setSyncing(false);
    }
  }

  /* ───────── Progress ───────── */

  const progressCount =
    Number(state.ep1) +
    Number(state.ep2) +
    Number(state.ep3) +
    Number(state.ep4) +
    Number(state.ep5) +
    Number(state.finalized);

  const progressPct = Math.round(
    (clamp(progressCount, 0, 6) / 6) * 100,
  );

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");

  if (mode !== "hub") {
    const views: Record<Mode, JSX.Element | null> = {
      hub: null,
      prologue: <PrologueSilenceInDarkness onExit={exit} />,
      ep1: <EpisodeOne fid={fid!} onExit={exit} />,
      ep2: <EpisodeTwo fid={fid!} onExit={exit} />,
      ep3: <EpisodeThree fid={fid!} onExit={exit} />,
      ep4: <EpisodeFour fid={fid!} onExit={exit} />,
      ep5: <EpisodeFive fid={fid!} onExit={exit} />,
      bonus: state.ep3 ? <BonusEcho onExit={exit} /> : null,
      archive: state.finalized ? <BonusEchoArchive onExit={exit} /> : null,
    };

    return views[mode];
  }

  /* ───────── Locks ───────── */

  const ep2Locked = !state.ep1;
  const ep3Locked = !state.ep2;
  const ep4Locked = !state.ep3;
  const ep5Locked = !state.ep4;
  const bonusLocked = !state.ep3;
  const archiveLocked = !state.finalized;

  /* ────────────────────────────────────────────── */
  /* UI */
  /* ────────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6">
      {syncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-extrabold tracking-widest">
          SYNCING MEMORY…
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-4xl font-black">Basebots: Core Memory</h1>
          <p className="mt-2 text-white/80 max-w-2xl">
            Each decision writes itself to chain. Stabilize the sequence.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-sm">
              FID: {hasIdentity ? fid : "Not detected"}
            </span>
            <span className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-sm">
              {error
                ? "Read error"
                : !hasIdentity
                ? "Identity required"
                : isLoading
                ? "Loading"
                : isFetching
                ? "Updating"
                : "Ready"}
            </span>
            <span className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-sm">
              Schema: {state.schemaVersion ?? "—"}
            </span>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={sync}
              disabled={!hasIdentity || syncing}
              className="rounded-xl px-4 py-2 font-bold bg-purple-600/40 border border-purple-400/40 disabled:opacity-50"
            >
              Sync Memory
            </button>

            <button
              onClick={() => setShowDiagnostics((v) => !v)}
              className="rounded-xl px-4 py-2 font-bold bg-white/10 border border-white/20"
            >
              Diagnostics
            </button>
          </div>

          <div className="mt-4">
            <div className="h-3 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-1 text-sm font-bold">
              {progressPct}% stabilized
            </div>
          </div>
        </div>

        {/* Episodes */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <EpisodeCard title="Silence in Darkness" img={IMAGES.prologue} onClick={() => setMode("prologue")} />
          <EpisodeCard title="The Handshake" img={IMAGES.ep1} onClick={() => setMode("ep1")} />
          <EpisodeCard title="The Recall" img={IMAGES.ep2} locked={ep2Locked} onClick={() => setMode("ep2")} />
          <EpisodeCard title="The Watcher" img={IMAGES.ep3} locked={ep3Locked} onClick={() => setMode("ep3")} />
          <EpisodeCard title="Drift Protocol" img={IMAGES.ep4} locked={ep4Locked} onClick={() => setMode("ep4")} />
          <EpisodeCard title="Final Commit" img={IMAGES.ep5} locked={ep5Locked} onClick={() => setMode("ep5")} />
          <EpisodeCard title="Echo Residual" img={IMAGES.bonus} locked={bonusLocked} onClick={() => setMode("bonus")} />
          <EpisodeCard title="Classified Archive" img={IMAGES.archive} locked={archiveLocked} onClick={() => setMode("archive")} />
        </div>

        {showDiagnostics && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm">
            <p>ep1:{String(state.ep1)}</p>
            <p>ep2:{String(state.ep2)}</p>
            <p>ep3:{String(state.ep3)}</p>
            <p>ep4:{String(state.ep4)}</p>
            <p>ep5:{String(state.ep5)}</p>
            <p>finalized:{String(state.finalized)}</p>
          </div>
        )}

        {state.finalized && (
          <div className="mt-6">
            <GlobalStatsPanel />
          </div>
        )}
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */

function EpisodeCard({
  title,
  img,
  locked,
  onClick,
}: {
  title: string;
  img: string;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => !locked && onClick()}
      disabled={locked}
      className={`relative h-56 rounded-3xl overflow-hidden border ${
        locked ? "opacity-40 grayscale border-white/10" : "border-purple-400/40"
      }`}
      style={{
        backgroundImage: `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.2)), url(${img})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute bottom-4 left-4 right-4 text-left">
        <p className="font-extrabold text-lg">{title}</p>
        {locked && <p className="text-xs text-white/60">LOCKED</p>}
      </div>
    </button>
  );
}
