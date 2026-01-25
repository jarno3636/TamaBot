"use client";

/**
 * IMPORTANT (DO NOT REMOVE)
 * Forces client-only rendering.
 * Prevents BigInt serialization + indexedDB SSR crashes.
 */
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

type Key = Exclude<Mode, "hub">;

type CardData = {
  key: Key;
  title: string;
  teaser: string;
  img: string;
  done?: boolean;
  bonus?: boolean;
  unlocked?: boolean;
};

/* ────────────────────────────────────────────── */

export default function StoryPage() {
  const publicClient = usePublicClient();
  const { fid } = useFid();

  /**
   * SAFE identity anchor
   * - string for React / query keys
   * - BigInt ONLY at call time
   */
  const tokenIdString = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? String(fid) : null;
  }, [fid]);

  const hasIdentity = Boolean(tokenIdString);

  const [mode, setMode] = useState<Mode>("hub");
  const [activeKey, setActiveKey] = useState<Key>("ep1");

  /* ───────── On-chain memory (silent) ───────── */

  const { data: botState, refetch } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: tokenIdString ? [BigInt(tokenIdString)] : undefined,
    query: { enabled: hasIdentity },
  });

  const state = useMemo(() => {
    if (!botState) {
      return { ep1: false, ep2: false, ep3: false, ep4: false, ep5: false };
    }
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

  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient || !hasIdentity || !tokenIdString) return;

    activeRef.current = tokenIdString;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: () => refetch(),
    });

    return () => unwatch();
  }, [publicClient, tokenIdString, hasIdentity, refetch]);

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");
  const episodeTokenId = tokenIdString ?? "0";

  if (mode !== "hub") {
    switch (mode) {
      case "prologue":
        return <PrologueSilenceInDarkness onExit={exit} />;
      case "ep1":
        return <EpisodeOne tokenId={episodeTokenId} onExit={exit} />;
      case "ep2":
        return <EpisodeTwo tokenId={episodeTokenId} onExit={exit} />;
      case "ep3":
        return <EpisodeThree tokenId={episodeTokenId} onExit={exit} />;
      case "ep4":
        return <EpisodeFour tokenId={episodeTokenId} onExit={exit} />;
      case "ep5":
        return <EpisodeFive tokenId={episodeTokenId} onExit={exit} />;
      case "bonus":
        return state.ep3 ? <BonusEcho onExit={exit} /> : null;
      case "archive":
        return state.ep5 ? <BonusEchoArchive onExit={exit} /> : null;
    }
  }

  /* ───────── Cards ───────── */

  const cards: CardData[] = [
    {
      key: "prologue",
      title: "Silence in Darkness",
      teaser:
        "The room between systems exhales. A faint tone repeats—too precise to be random.",
      img: "/story/prologue.png",
    },
    {
      key: "ep1",
      title: "The Handshake",
      teaser:
        "A protocol offers terms you don’t remember agreeing to. The first decision wakes the rest.",
      img: "/story/01-awakening.png",
      done: state.ep1,
    },
    {
      key: "ep2",
      title: "The Recall",
      teaser:
        "A memory fragment returns with its edges burned. Someone wants it gone before you read it.",
      img: "/story/ep2.png",
      done: state.ep2,
    },
    {
      key: "ep3",
      title: "The Watcher",
      teaser:
        "The logs stare back. Every choice creates a new shadow inside the audit trail.",
      img: "/story/ep3.png",
      done: state.ep3,
    },
    {
      key: "ep4",
      title: "Drift Protocol",
      teaser:
        "The city lights stutter like dying stars. Your core learns what it was built to forget.",
      img: "/story/ep4.png",
      done: state.ep4,
    },
    {
      key: "ep5",
      title: "Final Commit",
      teaser:
        "One last merge. One last cut. The system will remember even if you don’t.",
      img: "/story/ep5.png",
      done: state.ep5,
    },
    {
      key: "bonus",
      title: "Echo Residual",
      teaser:
        "Unreadable. A signal exists here, but your mind refuses to parse the waveform.",
      img: "/story/b1.png",
      bonus: true,
      unlocked: state.ep3,
    },
    {
      key: "archive",
      title: "Classified Memory",
      teaser:
        "Unreadable. Black lines over bright truths. You can feel the missing sentences.",
      img: "/story/b2.png",
      bonus: true,
      unlocked: state.ep5,
    },
  ];

  /* ───────── UI ───────── */

  return (
    <main style={shell()}>
      <style>{css}</style>

      <header style={hero()}>
        <h1 style={h1()}>Basebots: Core Memory</h1>
        <p style={lead()}>
          Memory fragments surface as systems awaken. Some stabilize. Others distort
          until the sequence is complete.
        </p>

        <div style={hint()}>
          {hasIdentity ? "Memory anchor detected." : "Memory anchor dormant."}
          <button
            className={`sync ${!hasIdentity ? "disabled" : ""}`}
            disabled={!hasIdentity}
            onClick={() => refetch()}
          >
            Sync
          </button>
        </div>
      </header>

      <section style={grid()}>
        {cards.map((c) => {
          const active = activeKey === c.key;
          const completed = !!c.done;
          const glitched = c.bonus && !c.unlocked;

          return (
            <Card
              key={c.key}
              title={c.title}
              teaser={c.teaser}
              img={c.img}
              active={active}
              completed={completed}
              glitched={glitched}
              onHover={() => setActiveKey(c.key)}
              onOpen={() => {
                setActiveKey(c.key);
                if (!glitched) setMode(c.key);
              }}
            />
          );
        })}
      </section>

      <footer style={footer()}>
        Choose a fragment. Follow the sequence. When distortion clears, hidden records become legible.
      </footer>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Card */

function Card({
  title,
  teaser,
  img,
  active,
  completed,
  glitched,
  onOpen,
  onHover,
}: {
  title: string;
  teaser: string;
  img: string;
  active: boolean;
  completed: boolean;
  glitched: boolean;
  onOpen: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      className={`card ${active ? "active" : ""} ${glitched ? "glitch" : ""}`}
      onClick={onOpen}
      onMouseEnter={onHover}
      style={{ backgroundImage: `url(${img})` }}
      title={glitched ? "Unreadable fragment." : "Open fragment."}
    >
      <div className="overlay" />
      <div className="badge">{completed ? "Recovered" : "Unrecovered"}</div>
      <div className="content">
        <div className="cardTitle">{title}</div>
        <div className={`cardTeaser ${glitched ? "scramble" : ""}`}>{teaser}</div>
      </div>
    </button>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: "40px 18px 60px",
});

const hero = () => ({
  maxWidth: 1100,
  margin: "0 auto 28px",
});

const h1 = () => ({
  fontSize: 40,
  marginBottom: 10,
});

const lead = () => ({
  opacity: 0.82,
  maxWidth: 720,
});

const hint = () => ({
  marginTop: 12,
  display: "flex",
  gap: 10,
  alignItems: "center",
  fontSize: 12,
});

const grid = () => ({
  maxWidth: 1100,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
});

const footer = () => ({
  maxWidth: 1100,
  margin: "28px auto 0",
  opacity: 0.75,
  fontSize: 12,
});

/* CSS */
const css = `
.card{
  position:relative;
  height:210px;
  border-radius:22px;
  background-size:cover;
  background-position:center;
  border:1px solid rgba(255,255,255,0.12);
  cursor:pointer;
  overflow:hidden;
  transition:.25s;
  box-shadow:0 20px 60px rgba(0,0,0,.55);
}
.card:hover{transform:translateY(-4px)}

.card.active{
  border-color:rgba(168,85,247,.9);
  animation:neonPulse 1.3s infinite;
}

@keyframes neonPulse{
  0%{box-shadow:0 0 18px rgba(168,85,247,.4)}
  50%{box-shadow:0 0 44px rgba(168,85,247,1)}
  100%{box-shadow:0 0 18px rgba(168,85,247,.4)}
}

.overlay{
  position:absolute;inset:0;
  background:linear-gradient(180deg,transparent,rgba(2,6,23,.9));
}

.badge{
  position:absolute;
  top:14px;left:14px;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  background:rgba(2,6,23,.6);
  border:1px solid rgba(255,255,255,.14);
}

.content{
  position:absolute;
  bottom:16px;left:16px;right:16px;
}

.cardTitle{font-size:16px;margin-bottom:6px}
.cardTeaser{font-size:13px;opacity:.85}

.glitch{filter:blur(1.2px) contrast(1.1)}
.scramble{text-shadow:0 0 12px rgba(168,85,247,.6)}

.sync{
  padding:6px 12px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.06);
  color:white;
}
.sync.disabled{opacity:.5}
`;
