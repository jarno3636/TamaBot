"use client";

import React, { useMemo, useState } from "react";
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

/* ───────── Helpers ───────── */

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

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

export default function StoryClient() {
  const { fid } = useFid();

  const hasIdentity = isValidFID(fid);
  const fidBigInt = hasIdentity ? BigInt(fid!) : undefined;

  const [mode, setMode] = useState<Mode>("hub");
  const [syncing, setSyncing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  /* ───────── SAFE CONTRACT READ ───────── */

  const { data, refetch, isLoading, isFetching, error } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: fidBigInt ? [fidBigInt] : undefined,
    query: { enabled: Boolean(fidBigInt) },
  });

  const state: ChainState = useMemo(() => {
    if (!data) {
      return { finalized: false, ep1: false, ep2: false, ep3: false, ep4: false, ep5: false };
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

  /* ───────── Manual sync ONLY ───────── */

  async function sync() {
    if (!hasIdentity || syncing) return;
    setSyncing(true);
    try {
      await refetch();
    } finally {
      setSyncing(false);
    }
  }

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");

  if (mode !== "hub") {
    return {
      prologue: <PrologueSilenceInDarkness onExit={exit} />,
      ep1: <EpisodeOne fid={fid!} onExit={exit} />,
      ep2: <EpisodeTwo fid={fid!} onExit={exit} />,
      ep3: <EpisodeThree fid={fid!} onExit={exit} />,
      ep4: <EpisodeFour fid={fid!} onExit={exit} />,
      ep5: <EpisodeFive fid={fid!} onExit={exit} />,
      bonus: state.ep3 ? <BonusEcho onExit={exit} /> : null,
      archive: state.finalized ? <BonusEchoArchive onExit={exit} /> : null,
    }[mode] ?? null;
  }

  /* ───────── Locks ───────── */

  const ep2Locked = !state.ep1;
  const ep3Locked = !state.ep2;
  const ep4Locked = !state.ep3;
  const ep5Locked = !state.ep4;
  const bonusLocked = !state.ep3;
  const archiveLocked = !state.finalized;

  /* ───────── UI ───────── */

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6">
      {syncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-black tracking-widest">
          SYNCING…
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-4xl font-black">Basebots: Core Memory</h1>
          <p className="text-white/70 mt-2">
            Each episode writes state directly on-chain.
          </p>

          <div className="flex gap-3 flex-wrap mt-4">
            <span className="pill">FID: {hasIdentity ? fid : "Not detected"}</span>
            <span className="pill">
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
            <span className="pill">Schema: {state.schemaVersion ?? "—"}</span>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={sync}
              disabled={!hasIdentity || syncing}
              className="btn-primary"
            >
              Sync Memory
            </button>
            <button
              onClick={() => setShowDiagnostics(v => !v)}
              className="btn-ghost"
            >
              Diagnostics
            </button>
          </div>
        </section>

        {/* Episodes */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Prologue" onClick={() => setMode("prologue")} />
          <Card title="Episode 1" onClick={() => setMode("ep1")} />
          <Card title="Episode 2" locked={ep2Locked} onClick={() => setMode("ep2")} />
          <Card title="Episode 3" locked={ep3Locked} onClick={() => setMode("ep3")} />
          <Card title="Episode 4" locked={ep4Locked} onClick={() => setMode("ep4")} />
          <Card title="Episode 5" locked={ep5Locked} onClick={() => setMode("ep5")} />
          <Card title="Bonus" locked={bonusLocked} onClick={() => setMode("bonus")} />
          <Card title="Archive" locked={archiveLocked} onClick={() => setMode("archive")} />
        </section>

        {showDiagnostics && (
          <pre className="text-xs bg-black/40 p-4 rounded-xl">
{JSON.stringify(state, null, 2)}
          </pre>
        )}

        {state.finalized && <GlobalStatsPanel />}
      </div>
    </main>
  );
}

/* ───────── Small Card ───────── */

function Card({
  title,
  locked,
  onClick,
}: {
  title: string;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={locked}
      onClick={() => !locked && onClick()}
      className={`h-48 rounded-2xl border p-4 text-left font-black ${
        locked
          ? "opacity-40 border-white/10"
          : "border-purple-400/40 hover:scale-[1.02]"
      }`}
    >
      {title}
      {locked && <div className="text-xs mt-2 text-white/60">LOCKED</div>}
    </button>
  );
}
