"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
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

/* ────────────────────────────────────────────── */

const SOUND_KEY = "basebots_sound";
const AUDIO_SRC = "/audio/s1.mp3";

/* ────────────────────────────────────────────── */
/* Episode Images (original assets) */

const IMAGES: Record<Mode, string> = {
  hub: "",
  prologue: "/story/prologue.png",
  ep1: "/story/01-awakening.png",
  ep2: "/story/ep2.png",
  ep3: "/story/ep3.png",
  ep4: "/story/ep4.png",
  ep5: "/story/ep5.png",
  bonus: "/story/b1.png",
  archive: "/story/b2.png",
};

/* ────────────────────────────────────────────── */

export default function StoryPage() {
  const publicClient = usePublicClient();
  const { fid } = useFid();

  const hasIdentity = typeof fid === "number" && fid > 0;
  const fidBigInt = useMemo(
    () => (hasIdentity ? BigInt(fid) : 0n),
    [fid, hasIdentity]
  );

  const [mode, setMode] = useState<Mode>("hub");
  const [syncing, setSyncing] = useState(false);

  /* ───────── Sound ───────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const a = new Audio(AUDIO_SRC);
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
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
  }, [soundOn]);

  /* ───────── On-chain state ───────── */

  const { data: botState, refetch } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: hasIdentity ? [fidBigInt] : undefined,
    query: { enabled: hasIdentity },
  });

  const state = useMemo(() => {
    if (!botState) {
      return { ep1: false, ep2: false, ep3: false, ep4: false, finalized: false };
    }
    const s: any = botState;
    return {
      ep1: s.ep1Set,
      ep2: s.ep2Set,
      ep3: s.ep3Set,
      ep4: s.ep4Set,
      finalized: s.finalized,
    };
  }, [botState]);

  /* ───────── Cinematic sync ───────── */

  async function cinematicSync() {
    if (!hasIdentity || syncing) return;
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 650));
    await refetch();
    setSyncing(false);
  }

  /* ───────── Contract event watchers ───────── */

  useEffect(() => {
    if (!publicClient || !hasIdentity) return;

    const unwatchEpisode = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: cinematicSync,
    });

    const unwatchFinalized = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "Finalized",
      onLogs: cinematicSync,
    });

    return () => {
      unwatchEpisode();
      unwatchFinalized();
    };
  }, [publicClient, hasIdentity, fidBigInt]);

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");

  if (mode !== "hub") {
    switch (mode) {
      case "prologue":
        return <PrologueSilenceInDarkness onExit={exit} />;
      case "ep1":
        return <EpisodeOne fid={fid} onExit={exit} />;
      case "ep2":
        return <EpisodeTwo fid={fid} onExit={exit} />;
      case "ep3":
        return <EpisodeThree fid={fid} onExit={exit} />;
      case "ep4":
        return <EpisodeFour fid={fid} onExit={exit} />;
      case "ep5":
        return <EpisodeFive fid={fid} onExit={exit} />;
      case "bonus":
        return state.ep3 ? <BonusEcho onExit={exit} /> : null;
      case "archive":
        return state.finalized ? <BonusEchoArchive onExit={exit} /> : null;
    }
  }

  /* ───────── UI ───────── */

  return (
    <main style={shell}>
      <style>{css}</style>

      {syncing && <div className="syncOverlay">SYNCING MEMORY…</div>}

      <header style={hero}>
        <h1 style={{ fontSize: 38 }}>Basebots: Core Memory</h1>
        <p style={{ opacity: 0.82, maxWidth: 720 }}>
          Memory fragments surface as systems awaken. Completion stabilizes the sequence.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={cinematicSync} disabled={!hasIdentity || syncing}>
            Sync Memory
          </button>
          <button onClick={() => setSoundOn((s) => !s)}>
            {soundOn ? "Sound ON" : "Sound OFF"}
          </button>
        </div>
      </header>

      <section style={grid}>
        <EpisodeCard title="Silence in Darkness" img={IMAGES.prologue} onOpen={() => setMode("prologue")} />
        <EpisodeCard title="The Handshake" img={IMAGES.ep1} done={state.ep1} onOpen={() => setMode("ep1")} />
        <EpisodeCard title="The Recall" img={IMAGES.ep2} locked={!state.ep1} done={state.ep2} onOpen={() => setMode("ep2")} />
        <EpisodeCard title="The Watcher" img={IMAGES.ep3} locked={!state.ep2} done={state.ep3} onOpen={() => setMode("ep3")} />
        <EpisodeCard title="Drift Protocol" img={IMAGES.ep4} locked={!state.ep3} done={state.ep4} onOpen={() => setMode("ep4")} />
        <EpisodeCard title="Final Commit" img={IMAGES.ep5} locked={!state.ep4} done={state.finalized} onOpen={() => setMode("ep5")} />
        <EpisodeCard title="Echo Residual" img={IMAGES.bonus} locked={!state.ep3} bonus onOpen={() => setMode("bonus")} />
        <EpisodeCard title="Classified Archive" img={IMAGES.archive} locked={!state.finalized} bonus onOpen={() => setMode("archive")} />
      </section>

      {state.finalized && (
        <section style={{ marginTop: 40 }}>
          <GlobalStatsPanel />
        </section>
      )}
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Episode Card */

function EpisodeCard({
  title,
  img,
  locked,
  done,
  bonus,
  onOpen,
}: {
  title: string;
  img: string;
  locked?: boolean;
  done?: boolean;
  bonus?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      className={`epCard ${locked ? "locked" : ""} ${done ? "done" : ""} ${bonus ? "bonus" : ""}`}
      onClick={() => !locked && onOpen()}
      style={{ backgroundImage: `url(${img})` }}
    >
      <div className="shade" />
      <div className="label">{title}</div>
      {bonus && <div className="tag">BONUS</div>}
      {locked && <div className="lock">LOCKED</div>}
      {done && <div className="doneTag">COMPLETE</div>}
    </button>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */

const shell = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 28,
};

const hero = {
  maxWidth: 1100,
  margin: "0 auto 32px",
};

const grid = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: 18,
};

const css = `
.epCard{
  height:220px;
  border-radius:26px;
  background-size:cover;
  background-position:center;
  border:1px solid rgba(255,255,255,.18);
  position:relative;
  overflow:hidden;
  transition:.25s;
}
.epCard:hover{transform:translateY(-3px)}
.epCard.done{
  border-color:#38bdf8;
  box-shadow:0 0 36px rgba(56,189,248,.65);
}
.epCard.locked{
  filter:grayscale(1) blur(.4px);
  opacity:.35;
}
.epCard.bonus:not(.locked){
  box-shadow:0 0 30px rgba(168,85,247,.65);
}
.shade{
  position:absolute; inset:0;
  background:linear-gradient(180deg,transparent,rgba(2,6,23,.92));
}
.label{
  position:absolute;
  bottom:16px; left:16px;
  font-weight:900;
  font-size:16px;
}
.tag{
  position:absolute; top:12px; right:12px;
  font-size:11px;
}
.lock,.doneTag{
  position:absolute; bottom:12px; right:12px;
  font-size:11px;
}
.syncOverlay{
  position:fixed; inset:0;
  background:rgba(2,6,23,.9);
  display:flex; align-items:center; justify-content:center;
  font-size:22px; font-weight:900;
  z-index:999;
}
`;
