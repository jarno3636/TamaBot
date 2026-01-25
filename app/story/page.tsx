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

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Types */

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
/* Page */

export default function StoryPage() {
  const publicClient = usePublicClient();
  const { fid } = useFid();

  // Stable, serializable identity anchor
  const tokenIdString = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? String(fid) : null;
  }, [fid]);

  const hasIdentity = Boolean(tokenIdString);

  const tokenIdBigInt = useMemo(() => {
    return tokenIdString ? BigInt(tokenIdString) : 0n;
  }, [tokenIdString]);

  const [mode, setMode] = useState<Mode>("hub");
  const [activeKey, setActiveKey] = useState<Key>("ep1");

  /* ───────── On-chain memory ───────── */

  const { data: botState, refetch } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: hasIdentity ? [tokenIdBigInt] : undefined,
    query: { enabled: hasIdentity },
  });

  const state = useMemo(() => {
    if (!botState) {
      return { ep1: false, ep2: false, ep3: false, ep4: false, ep5: false };
    }
    const s: any = botState;
    return {
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
    };
  }, [botState]);

  /* ───────── Live updates ───────── */

  const activeRef = useRef<bigint>(0n);

  useEffect(() => {
    if (!publicClient || !hasIdentity) return;
    activeRef.current = tokenIdBigInt;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: () => refetch(),
    });

    return () => unwatch();
  }, [publicClient, tokenIdBigInt, hasIdentity, refetch]);

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");

  if (mode !== "hub") {
    const episodeTokenId = tokenIdString ?? "0";

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
      teaser: "A room between systems exhales. Something dormant stirs.",
      img: "/story/prologue.png",
    },
    {
      key: "ep1",
      title: "The Handshake",
      teaser: "A contract appears on cold glass. The first choice wakes the rest.",
      img: "/story/01-awakening.png",
      done: state.ep1,
    },
    {
      key: "ep2",
      title: "The Recall",
      teaser: "A memory fragment returns scorched at the edges.",
      img: "/story/ep2.png",
      done: state.ep2,
    },
    {
      key: "ep3",
      title: "The Watcher",
      teaser: "The logs begin to stare back.",
      img: "/story/ep3.png",
      done: state.ep3,
    },
    {
      key: "ep4",
      title: "Drift Protocol",
      teaser: "The city flickers. Core directives begin to fail.",
      img: "/story/ep4.png",
      done: state.ep4,
    },
    {
      key: "ep5",
      title: "Final Commit",
      teaser: "One last merge. One irreversible outcome.",
      img: "/story/ep5.png",
      done: state.ep5,
    },
    {
      key: "bonus",
      title: "Echo Residual",
      teaser: "Unreadable. A waveform your mind refuses to parse.",
      img: "/story/b1.png",
      bonus: true,
      unlocked: state.ep3,
    },
    {
      key: "archive",
      title: "Classified Memory",
      teaser: "Black lines obscure bright truths.",
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
          Memory fragments surface as systems awaken. Some stabilize. Others distort until the
          sequence is complete.
        </p>
        <button
          onClick={() => refetch()}
          disabled={!hasIdentity}
          className={`sync ${!hasIdentity ? "disabled" : ""}`}
        >
          Sync Memory
        </button>
      </header>

      <section style={grid()}>
        {cards.map((c) => {
          const active = activeKey === c.key;
          const completed = Boolean(c.done);
          const glitched = Boolean(c.bonus) && !Boolean(c.unlocked);

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
      className={`card ${active ? "active" : ""} ${glitched ? "glitch" : ""}`}
      onClick={onOpen}
      onMouseEnter={onHover}
      style={{ backgroundImage: `url(${img})` }}
    >
      <div className="overlay" />
      <div className="badge">{completed ? "Recovered" : "Fragment"}</div>
      <div className="content">
        <div className="title">{title}</div>
        <div className={`teaser ${glitched ? "scramble" : ""}`}>{teaser}</div>
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
  padding: "40px 18px",
});

const hero = () => ({
  maxWidth: 1120,
  margin: "0 auto 24px",
});

const h1 = () => ({
  fontSize: 38,
  marginBottom: 10,
});

const lead = () => ({
  opacity: 0.82,
  maxWidth: 760,
  marginBottom: 16,
});

const grid = () => ({
  maxWidth: 1120,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
});

/* CSS */
const css = `
.card{
  position:relative;
  height:210px;
  border-radius:22px;
  background-size:cover;
  background-position:center;
  border:1px solid rgba(255,255,255,.12);
  overflow:hidden;
  transition:.22s;
}
.card.active{
  border-color:rgba(168,85,247,.75);
  box-shadow:0 0 36px rgba(168,85,247,.7);
  animation:pulse 1.35s infinite;
}
@keyframes pulse{
  0%{box-shadow:0 0 18px rgba(168,85,247,.4)}
  50%{box-shadow:0 0 42px rgba(168,85,247,1)}
  100%{box-shadow:0 0 18px rgba(168,85,247,.4)}
}
.overlay{
  position:absolute; inset:0;
  background:linear-gradient(180deg,transparent,rgba(2,6,23,.9));
}
.badge{
  position:absolute; top:12px; left:12px;
  font-size:12px; opacity:.85;
}
.content{
  position:absolute; bottom:14px; left:14px; right:14px;
}
.title{font-size:16px}
.teaser{font-size:13px; opacity:.82}
.glitch .teaser{filter:blur(1.4px)}
.sync{padding:6px 12px}
.sync.disabled{opacity:.5}
`;
