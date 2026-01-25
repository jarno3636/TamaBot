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

  // Always provide a valid on-chain "anchor" value (never undefined).
  // If fid exists, we use it. If not, we use 0n (keeps types happy + page stays free).
  const tokenId: bigint = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? BigInt(fid) : 0n;
  }, [fid]);

  // Also keep a boolean for whether on-chain memory should be read.
  const hasIdentity = tokenId > 0n;

  const [mode, setMode] = useState<Mode>("hub");
  const [activeKey, setActiveKey] = useState<Key>("ep1");

  /* ───────── On-chain memory (silent) ───────── */

  const { data: botState, refetch } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: [tokenId],
    // Only read if identity exists; otherwise we keep it “blank” but the hub still works.
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

  const activeRef = useRef<bigint>(0n);

  useEffect(() => {
    if (!publicClient || !hasIdentity) return;
    activeRef.current = tokenId;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: () => refetch(),
    });

    return () => unwatch();
  }, [publicClient, tokenId, hasIdentity, refetch]);

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");

  if (mode !== "hub") {
    switch (mode) {
      case "prologue":
        return <PrologueSilenceInDarkness onExit={exit} />;
      case "ep1":
        return <EpisodeOne tokenId={tokenId} onExit={exit} />;
      case "ep2":
        return <EpisodeTwo tokenId={tokenId} onExit={exit} />;
      case "ep3":
        return <EpisodeThree tokenId={tokenId} onExit={exit} />;
      case "ep4":
        return <EpisodeFour tokenId={tokenId} onExit={exit} />;
      case "ep5":
        return <EpisodeFive tokenId={tokenId} onExit={exit} />;
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
      done: false,
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
        <div style={heroGlow()} aria-hidden />
        <div style={heroInner()}>
          <div style={kicker()}>CORE MEMORY INTERFACE</div>
          <h1 style={h1()}>Basebots: Core Memory</h1>
          <p style={lead()}>
            Memory fragments surface as systems awaken. Some stabilize. Others distort
            until the sequence is complete.
          </p>

          <div style={hintRow()}>
            <div style={hintPill()}>
              {hasIdentity ? "Memory sync: stable" : "Memory sync: dormant"}
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={!hasIdentity}
              className={`sync ${!hasIdentity ? "disabled" : ""}`}
              aria-disabled={!hasIdentity}
              title={!hasIdentity ? "A stable anchor has not been detected." : "Refresh memory state."}
            >
              Sync
            </button>
          </div>
        </div>
      </header>

      <section style={grid()} aria-label="Memory fragments">
        {cards.map((c) => {
          const isActive = activeKey === c.key;
          const completed = !!c.done;
          const isBonus = !!c.bonus;
          const unlocked = c.unlocked ?? true; // normal episodes always "available"
          const glitched = isBonus && !unlocked;

          const badge = completed ? "Recovered" : "Unrecovered";

          return (
            <Card
              key={c.key}
              title={c.title}
              teaser={c.teaser}
              img={c.img}
              active={isActive}
              badge={badge}
              glitched={glitched}
              onFocus={() => setActiveKey(c.key)}
              onHover={() => setActiveKey(c.key)}
              onOpen={() => {
                setActiveKey(c.key);
                if (glitched) return;
                setMode(c.key);
              }}
            />
          );
        })}
      </section>

      <footer style={footer()}>
        <div style={footerText()}>
          Choose a fragment. Follow the sequence. When the distortion clears, the hidden records become legible.
        </div>
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
  badge,
  glitched,
  onOpen,
  onHover,
  onFocus,
}: {
  title: string;
  teaser: string;
  img: string;
  active: boolean;
  badge: string;
  glitched: boolean;
  onOpen: () => void;
  onHover: () => void;
  onFocus: () => void;
}) {
  return (
    <button
      type="button"
      className={`card ${active ? "active" : ""} ${glitched ? "glitch" : ""}`}
      onClick={onOpen}
      onMouseEnter={onHover}
      onFocus={onFocus}
      aria-disabled={glitched}
      disabled={false}
      style={{ backgroundImage: `url(${img})` }}
      title={glitched ? "Unreadable fragment." : "Open fragment."}
    >
      <div className="overlay" aria-hidden />
      <div className="topRow">
        <div className={`badge ${badge === "Recovered" ? "good" : "warn"}`}>{badge}</div>
        {glitched ? <div className="locked">UNREADABLE</div> : null}
      </div>

      <div className="content">
        <div className="cardTitle">{title}</div>
        <div className={`cardTeaser ${glitched ? "scramble" : ""}`}>{teaser}</div>
      </div>

      {glitched ? (
        <>
          <div className="glitchScan" aria-hidden />
          <div className="glitchNoise" aria-hidden />
        </>
      ) : null}
    </button>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: "40px 18px 52px",
});

const hero = () => ({
  maxWidth: 1120,
  margin: "0 auto 18px",
  borderRadius: 26,
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "radial-gradient(1200px 420px at 10% 0%, rgba(168,85,247,0.20), rgba(2,6,23,0) 60%), radial-gradient(900px 360px at 88% 18%, rgba(34,211,238,0.14), rgba(2,6,23,0) 55%), rgba(0,0,0,0.35)",
  boxShadow: "0 40px 120px rgba(0,0,0,0.75)",
  overflow: "hidden",
  position: "relative" as const,
});

const heroGlow = () => ({
  position: "absolute" as const,
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)), radial-gradient(700px 260px at 40% 0%, rgba(168,85,247,0.20), rgba(2,6,23,0) 60%)",
  pointerEvents: "none" as const,
});

const heroInner = () => ({
  position: "relative" as const,
  padding: "26px 18px",
});

const kicker = () => ({
  fontSize: 12,
  letterSpacing: 1.6,
  opacity: 0.85,
  marginBottom: 8,
});

const h1 = () => ({
  fontSize: 38,
  lineHeight: 1.05,
  margin: "8px 0 10px",
  letterSpacing: -0.6,
});

const lead = () => ({
  opacity: 0.82,
  maxWidth: 780,
  margin: 0,
  lineHeight: 1.6,
  fontSize: 14,
});

const hintRow = () => ({
  marginTop: 16,
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap" as const,
});

const hintPill = () => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.55)",
  fontSize: 12,
  opacity: 0.9,
});

const grid = () => ({
  maxWidth: 1120,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
});

const footer = () => ({
  maxWidth: 1120,
  margin: "18px auto 0",
  opacity: 0.9,
});

const footerText = () => ({
  fontSize: 12,
  opacity: 0.78,
});

/* CSS (kept inline via <style>) */
const css = `
:root { color-scheme: dark; }

.sync{
  height: 36px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.06);
  color: white;
  cursor: pointer;
  font-size: 12px;
}
.sync.disabled{
  opacity: .5;
  cursor: not-allowed;
}

.card{
  position: relative;
  height: 210px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.12);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  cursor: pointer;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
  box-shadow: 0 22px 70px rgba(0,0,0,0.50);
}
.card:hover{ transform: translateY(-4px); border-color: rgba(168,85,247,0.35); }

.card.active{
  border-color: rgba(168,85,247,0.75);
  box-shadow:
    0 0 0 1px rgba(168,85,247,0.45),
    0 0 26px rgba(168,85,247,0.35),
    0 28px 90px rgba(0,0,0,0.60);
  animation: neonPulse 1.35s ease-in-out infinite;
}

@keyframes neonPulse{
  0% { box-shadow: 0 0 0 1px rgba(168,85,247,0.35), 0 0 18px rgba(168,85,247,0.20), 0 28px 90px rgba(0,0,0,0.60); }
  50%{ box-shadow: 0 0 0 1px rgba(168,85,247,0.65), 0 0 34px rgba(168,85,247,0.45), 0 28px 90px rgba(0,0,0,0.60); }
  100%{ box-shadow: 0 0 0 1px rgba(168,85,247,0.35), 0 0 18px rgba(168,85,247,0.20), 0 28px 90px rgba(0,0,0,0.60); }
}

.overlay{
  position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(2,6,23,0.10), rgba(2,6,23,0.90)),
    radial-gradient(520px 180px at 35% 0%, rgba(168,85,247,0.18), rgba(2,6,23,0) 70%);
}

.topRow{
  position:absolute; top:12px; left:12px; right:12px;
  display:flex; justify-content:space-between; align-items:center; gap:10px;
}

.badge{
  padding:6px 10px; border-radius:999px;
  border:1px solid rgba(255,255,255,0.14);
  font-size:12px;
  background: rgba(2,6,23,0.50);
  backdrop-filter: blur(10px);
}
.badge.good{
  color: rgba(224,255,255,0.95);
  box-shadow: 0 0 18px rgba(34,211,238,0.18);
  border-color: rgba(34,211,238,0.28);
}
.badge.warn{
  color: rgba(245,235,255,0.95);
  box-shadow: 0 0 18px rgba(168,85,247,0.14);
  border-color: rgba(168,85,247,0.28);
}

.locked{
  padding:6px 10px; border-radius:999px;
  font-size:12px;
  border:1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
  opacity: .85;
}

.content{
  position:absolute; left:14px; right:14px; bottom:14px;
}

.cardTitle{
  font-size:16px;
  letter-spacing: -0.2px;
  margin-bottom: 6px;
}

.cardTeaser{
  font-size:13px;
  line-height:1.45;
  opacity:.84;
}

.glitch{
  filter: saturate(1.1) contrast(1.05);
}

.glitch .overlay{
  background:
    linear-gradient(180deg, rgba(2,6,23,0.18), rgba(2,6,23,0.95)),
    repeating-linear-gradient(0deg, rgba(168,85,247,0.08), rgba(168,85,247,0.08) 2px, rgba(2,6,23,0) 2px, rgba(2,6,23,0) 6px);
}

.scramble{
  text-shadow: 0 0 10px rgba(168,85,247,0.25);
  filter: blur(1.2px);
}

.glitchScan{
  position:absolute; left:-10%; right:-10%;
  top:-40%; height:40%;
  background: linear-gradient(180deg, rgba(168,85,247,0), rgba(168,85,247,0.18), rgba(168,85,247,0));
  animation: scan 2.6s linear infinite;
  mix-blend-mode: screen;
  pointer-events:none;
}

@keyframes scan{
  0%{ transform: translateY(-20%); opacity:0; }
  15%{ opacity:.22; }
  70%{ opacity:.18; }
  100%{ transform: translateY(320%); opacity:0; }
}

.glitchNoise{
  position:absolute; inset:0;
  background-image:
    radial-gradient(rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 1px);
  background-size: 3px 3px;
  opacity: .16;
  mix-blend-mode: overlay;
  pointer-events:none;
}
`;
