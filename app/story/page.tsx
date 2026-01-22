"use client";

import React, { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";

import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";
import BonusEchoArchive from "@/components/story/BonusEchoArchive";
import GlobalStatsPanel from "@/components/story/GlobalStatsPanel";

const BASE_CHAIN_ID = 8453;

type Mode =
  | "hub"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5"
  | "prologue"
  | "bonus1"
  | "bonus2";

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");
  const { address, chain } = useAccount();

  const wrongChain =
    chain?.id !== undefined && chain.id !== BASE_CHAIN_ID;

  const canEnterStory = Boolean(address) && !wrongChain;

  const exit = () => setMode("hub");

  /* ─────────────────────────────────────────────
   * ROUTING
   * ───────────────────────────────────────────── */

  if (mode !== "hub") {
    switch (mode) {
      case "ep1":
        return <EpisodeOne onExit={exit} />;
      case "ep2":
        return <EpisodeTwo onExit={exit} />;
      case "ep3":
        return <EpisodeThree onExit={exit} />;
      case "ep4":
        return <EpisodeFour onExit={exit} />;
      case "ep5":
        return <EpisodeFive onExit={exit} />;
      case "prologue":
        return <PrologueSilenceInDarkness onExit={exit} />;
      case "bonus1":
        return <BonusEcho onExit={exit} />;
      case "bonus2":
        return <BonusEchoArchive onExit={exit} />;
      default:
        return null;
    }
  }

  /* ─────────────────────────────────────────────
   * HUB
   * ───────────────────────────────────────────── */

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 16px 80px",
        background:
          "radial-gradient(1200px 520px at 50% -10%, rgba(56,189,248,0.14), transparent 60%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.16), transparent 60%), #020617",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* HEADER */}
        <header style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 950,
              letterSpacing: 0.3,
            }}
          >
            Basebots: Core Memory
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              opacity: 0.75,
              maxWidth: 760,
            }}
          >
            Choices are committed on-chain. Memory persists beyond the session.
          </p>
        </header>

        {/* GATE NOTICE */}
        {!canEnterStory && (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              padding: 16,
              marginBottom: 28,
              fontSize: 13,
            }}
          >
            {!address && "Connect a wallet to begin the Core Memory."}
            {address && wrongChain && "Switch to Base network to continue."}
          </div>
        )}

        {/* CORE STORY CARDS */}
        <section>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: 2,
              opacity: 0.85,
              marginBottom: 14,
            }}
          >
            CORE SEQUENCE
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            <StoryCard
              title="Awakening Protocol"
              img="/story/01-awakening.png"
              note="Initialization begins."
              onClick={() => setMode("ep1")}
              enabled={canEnterStory}
            />

            <StoryCard
              title="Signal Fracture"
              img="/story/ep2.png"
              note="Designation binding."
              locked
            />

            <StoryCard
              title="Fault Lines"
              img="/story/ep3.png"
              note="Contradictions form."
              locked
              distorted
            />

            <StoryCard
              title="Threshold"
              img="/story/ep4.png"
              note="The city responds."
              locked
              distorted
            />

            <StoryCard
              title="Emergence"
              img="/story/ep5.png"
              note="Outcomes are permanent."
              locked
              distorted
            />
          </div>
        </section>

        {/* GLOBAL STATS */}
        <section style={{ marginTop: 48 }}>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: 2,
              opacity: 0.85,
              marginBottom: 14,
            }}
          >
            GLOBAL INTERPRETATION METRICS
          </h3>

          <GlobalStatsPanel />
        </section>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────
 * STORY CARD
 * ───────────────────────────────────────────── */

function StoryCard({
  title,
  note,
  img,
  locked,
  distorted,
  enabled = true,
  onClick,
}: {
  title: string;
  note: string;
  img: string;
  locked?: boolean;
  distorted?: boolean;
  enabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <article
      aria-disabled={locked}
      style={{
        borderRadius: 22,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.35)",
        opacity: locked ? 0.65 : 1,
        cursor: locked ? "not-allowed" : "pointer",
        boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
      }}
      onClick={!locked && enabled ? onClick : undefined}
    >
      <div style={{ position: "relative" }}>
        <img
          src={img}
          alt=""
          style={{
            width: "100%",
            height: 200,
            objectFit: "cover",
            filter: locked
              ? "grayscale(0.9) brightness(0.55)"
              : "none",
          }}
        />

        {distorted && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 4px, transparent 7px)",
              mixBlendMode: "overlay",
              opacity: 0.8,
            }}
          />
        )}
      </div>

      <div style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 950 }}>{title}</h2>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{note}</p>
      </div>
    </article>
  );
}
