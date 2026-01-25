"use client";

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

export default function StoryPage() {
  const { fid } = useFid(); // optional identity anchor
  const publicClient = usePublicClient();

  const tokenId = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? BigInt(fid) : null;
  }, [fid]);

  const [mode, setMode] = useState<Mode>("hub");

  /* ───────── On-chain memory (silent) ───────── */

  const { data: botState, refetch } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: Boolean(tokenId) },
  });

  const state = useMemo(() => {
    if (!botState) return {};
    const s: any = botState;
    return {
      ep1: !!s.ep1Set,
      ep2: !!s.ep2Set,
      ep3: !!s.ep3Set,
      ep4: !!s.ep4Set,
      ep5: !!s.ep5Set,
    };
  }, [botState]);

  /* ───────── Live updates ───────── */

  const activeRef = useRef<bigint | null>(null);

  useEffect(() => {
    if (!publicClient || !tokenId) return;
    activeRef.current = tokenId;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: () => refetch(),
    });

    return () => unwatch();
  }, [publicClient, tokenId, refetch]);

  /* ───────── Routing ───────── */

  if (mode !== "hub") {
    const exit = () => setMode("hub");

    switch (mode) {
      case "prologue":
        return <PrologueSilenceInDarkness onExit={exit} />;
      case "ep1":
        return <EpisodeOne tokenId={tokenId?.toString()} onExit={exit} />;
      case "ep2":
        return <EpisodeTwo tokenId={tokenId?.toString()} onExit={exit} />;
      case "ep3":
        return <EpisodeThree tokenId={tokenId?.toString()} onExit={exit} />;
      case "ep4":
        return <EpisodeFour tokenId={tokenId?.toString()} onExit={exit} />;
      case "ep5":
        return <EpisodeFive tokenId={tokenId?.toString()} onExit={exit} />;
      case "bonus":
        return state.ep3 ? <BonusEcho onExit={exit} /> : null;
      case "archive":
        return state.ep5 ? <BonusEchoArchive onExit={exit} /> : null;
    }
  }

  /* ───────── Episode Data ───────── */

  const episodes = [
    { key: "prologue", title: "Silence in Darkness", img: "/story/prologue.png", done: false },
    { key: "ep1", title: "The Handshake", img: "/story/01-awakening.png", done: state.ep1 },
    { key: "ep2", title: "The Recall", img: "/story/ep2.png", done: state.ep2 },
    { key: "ep3", title: "The Watcher", img: "/story/ep3.png", done: state.ep3 },
    { key: "ep4", title: "Drift Protocol", img: "/story/ep4.png", done: state.ep4 },
    { key: "ep5", title: "Final Commit", img: "/story/ep5.png", done: state.ep5 },
  ];

  const bonus = [
    {
      key: "bonus",
      title: "Echo Residual",
      img: "/story/b1.png",
      unlocked: state.ep3,
    },
    {
      key: "archive",
      title: "Classified Memory",
      img: "/story/b2.png",
      unlocked: state.ep5,
    },
  ];

  /* ───────── UI ───────── */

  return (
    <main style={shell()}>
      <style>{glowCSS}</style>

      <h1 style={title()}>Basebots: Core Memory</h1>

      <p style={subtitle()}>
        Memory fragments surface as systems awaken. Some are stable. Others distort
        until the sequence is complete.
      </p>

      <section style={grid()}>
        {episodes.map((e) => (
          <Card
            key={e.key}
            title={e.title}
            img={e.img}
            active={mode === e.key}
            completed={e.done}
            onClick={() => setMode(e.key as Mode)}
          />
        ))}

        {bonus.map((b) => (
          <Card
            key={b.key}
            title={b.title}
            img={b.img}
            active={false}
            completed={false}
            glitched={!b.unlocked}
            onClick={() => b.unlocked && setMode(b.key as Mode)}
          />
        ))}
      </section>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Card Component */

function Card({
  title,
  img,
  active,
  completed,
  glitched,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      disabled={glitched}
      className={`card ${active ? "active" : ""} ${completed ? "done" : ""} ${
        glitched ? "glitch" : ""
      }`}
      style={{
        backgroundImage: `url(${img})`,
      }}
    >
      <div className="overlay" />
      <div className="label">{completed ? "Recovered" : "Fragment"}</div>
      <div className="title">{title}</div>
    </button>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: "40px 20px",
});

const title = () => ({
  fontSize: 38,
  marginBottom: 8,
});

const subtitle = () => ({
  opacity: 0.8,
  maxWidth: 720,
  marginBottom: 32,
});

const grid = () => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 20,
});

const glowCSS = `
.card {
  position: relative;
  height: 180px;
  border-radius: 22px;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  cursor: pointer;
  overflow: hidden;
  transition: transform .25s, box-shadow .25s;
}
.card:hover { transform: translateY(-4px); }

.card.active {
  box-shadow: 0 0 40px rgba(168,85,247,.9);
  animation: pulse 1.3s infinite;
}

.card.done .label { color: #a5f3fc; }

.card.glitch {
  filter: blur(3px) contrast(1.2);
  pointer-events: none;
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(2,6,23,.9));
}

.label {
  position: absolute;
  top: 14px;
  left: 14px;
  font-size: 12px;
  opacity: .85;
}

.title {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  font-size: 16px;
}

@keyframes pulse {
  0% { box-shadow: 0 0 18px rgba(168,85,247,.6); }
  50% { box-shadow: 0 0 42px rgba(168,85,247,1); }
  100% { box-shadow: 0 0 18px rgba(168,85,247,.6); }
}
`;
