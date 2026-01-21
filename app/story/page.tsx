"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";

import { useIdentity } from "@/lib/useIdentity";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";

import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";
import BonusEchoArchive from "@/components/story/BonusEchoArchive";
import GlobalStatsPanel from "@/components/story/GlobalStatsPanel";

import { BASEBOTS } from "@/lib/abi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ─────────────────────────────────────────────
 * Config
 * ───────────────────────────────────────────── */
const BASE_CHAIN_ID = 8453;

/* ─────────────────────────────────────────────
 * Types / Helpers
 * ───────────────────────────────────────────── */

type CoreProgress = {
  ep1: boolean;
  ep2: boolean;
  ep3: boolean;
  ep4: boolean;
  ep5: boolean;
  finalized: boolean;
};

function nextCoreMode(flags?: Partial<CoreProgress>) {
  if (!flags?.ep1) return "ep1";
  if (!flags?.ep2) return "ep2";
  if (!flags?.ep3) return "ep3";
  if (!flags?.ep4) return "ep4";
  return "ep5";
}

function statusOf(opts: {
  unlocked: boolean;
  done?: boolean;
  current?: boolean;
  requiresNFT?: boolean;
}) {
  if (opts.done) return "COMPLETE";
  if (!opts.unlocked) return opts.requiresNFT ? "NFT REQUIRED" : "LOCKED";
  if (opts.current) return "IN PROGRESS";
  return "AVAILABLE";
}

function badgeTone(status: string) {
  switch (status) {
    case "COMPLETE":
      return { bg: "rgba(34,197,94,0.92)", fg: "#02110a", ring: "rgba(34,197,94,0.35)" };
    case "IN PROGRESS":
      return { bg: "rgba(250,204,21,0.92)", fg: "#1a1201", ring: "rgba(250,204,21,0.35)" };
    case "AVAILABLE":
      return { bg: "rgba(56,189,248,0.92)", fg: "#020617", ring: "rgba(56,189,248,0.35)" };
    case "NFT REQUIRED":
      return { bg: "rgba(168,85,247,0.92)", fg: "#08010f", ring: "rgba(168,85,247,0.35)" };
    default:
      return { bg: "rgba(255,255,255,0.22)", fg: "rgba(255,255,255,0.92)", ring: "rgba(255,255,255,0.18)" };
  }
}

/* ─────────────────────────────────────────────
 * Episode Card
 * ───────────────────────────────────────────── */

function EpisodeCard(ep: {
  title: string;
  note: string;
  img: string;
  unlocked: boolean;
  done?: boolean;
  current?: boolean;
  requiresNFT?: boolean;
  distorted?: boolean;
  cta?: string;
  onClick?: () => void;
}) {
  const locked = !ep.unlocked;
  const status = statusOf(ep);
  const tone = badgeTone(status);

  return (
    <article
      aria-disabled={locked}
      style={{
        borderRadius: 22,
        overflow: "hidden",
        border: locked ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(56,189,248,0.30)",
        background: "rgba(0,0,0,0.35)",
        opacity: locked ? 0.76 : 1,
        boxShadow: locked ? "0 16px 54px rgba(0,0,0,0.62)" : "0 26px 84px rgba(56,189,248,0.12)",
      }}
    >
      <div style={{ position: "relative" }}>
        <img
          src={ep.img}
          alt=""
          aria-hidden
          style={{
            width: "100%",
            height: 200,
            objectFit: "cover",
            filter: locked ? "grayscale(0.85) brightness(0.56) contrast(1.15)" : "none",
          }}
        />

        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(2,6,23,0.05), rgba(2,6,23,0.88))",
          }}
        />

        {ep.distorted && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 3px, transparent 7px)",
              mixBlendMode: "overlay",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            padding: "5px 10px",
            borderRadius: 999,
            background: tone.bg,
            color: tone.fg,
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: 0.7,
            boxShadow: ep.current ? `0 0 0 6px ${tone.ring}` : "none",
          }}
        >
          {status}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 950 }}>{ep.title}</h2>
        <p style={{ fontSize: 12, opacity: 0.76, marginTop: 8 }}>{ep.note}</p>

        <button
          disabled={locked || !ep.onClick}
          onClick={ep.onClick}
          style={{
            marginTop: 14,
            width: "100%",
            borderRadius: 999,
            padding: "10px",
            fontSize: 12,
            fontWeight: 950,
            background: locked
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))",
            color: locked ? "rgba(255,255,255,0.6)" : "#020617",
            border: "1px solid rgba(255,255,255,0.16)",
            cursor: locked ? "not-allowed" : "pointer",
          }}
        >
          {locked ? status : ep.cta ?? "▶ Enter"}
        </button>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<
    "hub" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "prologue" | "bonus1" | "bonus2"
  >("hub");

  const { address, chain } = useAccount();
  const { fid: fidString, hasIdentity } = useIdentity();

  const wrongChain = chain?.id !== undefined && chain.id !== BASE_CHAIN_ID;

  /* NFT check (FID ≠ NFT) */
  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidString ? ([BigInt(fidString)] as [bigint]) : undefined,
    query: { enabled: hasIdentity },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getProgressFlags",
    args: fidString ? ([BigInt(fidString)] as [bigint]) : undefined,
    query: { enabled: hasIdentity && hasBasebot },
  });

  const progress = progressFlags as CoreProgress | undefined;

  const canPlayCore = Boolean(address && hasBasebot && !wrongChain);
  const currentCore = useMemo(() => nextCoreMode(progress), [progress]);

  const prologueUnlocked = Boolean(progress?.ep1);
  const bonus1Unlocked = Boolean(progress?.ep3);
  const bonus2Unlocked = Boolean(progress?.ep5);

  /* ROUTING */
  if (mode !== "hub") {
    const exit = () => setMode("hub");
    const tokenId = fidString ?? "";

    switch (mode) {
      case "ep1": return <EpisodeOne tokenId={tokenId} onExit={exit} />;
      case "ep2": return <EpisodeTwo tokenId={tokenId} onExit={exit} />;
      case "ep3": return <EpisodeThree tokenId={tokenId} onExit={exit} />;
      case "ep4": return <EpisodeFour tokenId={tokenId} onExit={exit} />;
      case "ep5": return <EpisodeFive tokenId={tokenId} onExit={exit} />;
      case "prologue": return <PrologueSilenceInDarkness onExit={exit} />;
      case "bonus1": return <BonusEcho onExit={exit} />;
      case "bonus2": return <BonusEchoArchive onExit={exit} />;
      default: return null;
    }
  }

  /* HUB */
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 16px 64px",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.12), transparent 62%), #020617",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* CORE */}
        <section>
          <h3 style={{ fontSize: 12, fontWeight: 950, letterSpacing: 1.8, marginBottom: 12 }}>
            CORE SEQUENCE
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            <EpisodeCard
              title="Awakening Protocol"
              note="Initialization begins."
              img="/story/01-awakening.png"
              unlocked
              current={currentCore === "ep1"}
              onClick={() => setMode("ep1")}
            />
            <EpisodeCard
              title="Signal Fracture"
              note="Designation binding."
              img="/story/ep2.png"
              unlocked={canPlayCore && Boolean(progress?.ep1)}
              requiresNFT
              current={currentCore === "ep2"}
              onClick={() => setMode("ep2")}
            />
            <EpisodeCard
              title="Fault Lines"
              note="Contradictions form."
              img="/story/ep3.png"
              unlocked={canPlayCore && Boolean(progress?.ep2)}
              requiresNFT
              current={currentCore === "ep3"}
              onClick={() => setMode("ep3")}
            />
            <EpisodeCard
              title="Threshold"
              note="A profile is derived."
              img="/story/ep4.png"
              unlocked={canPlayCore && Boolean(progress?.ep3)}
              requiresNFT
              current={currentCore === "ep4"}
              onClick={() => setMode("ep4")}
            />
            <EpisodeCard
              title="Emergence"
              note="Outcomes are permanent."
              img="/story/ep5.png"
              unlocked={canPlayCore && Boolean(progress?.ep4)}
              requiresNFT
              current={currentCore === "ep5"}
              onClick={() => setMode("ep5")}
            />
          </div>
        </section>

        {/* ARCHIVAL */}
        <section style={{ marginTop: 36 }}>
          <h3 style={{ fontSize: 12, fontWeight: 950, letterSpacing: 1.8, marginBottom: 12 }}>
            ARCHIVAL ECHOES
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            <EpisodeCard
              title="Prologue: Silence in Darkness"
              note="Unlocked by Episode 1."
              img="/story/prologue.png"
              unlocked={canPlayCore && prologueUnlocked}
              distorted={!prologueUnlocked}
              onClick={prologueUnlocked ? () => setMode("prologue") : undefined}
            />
            <EpisodeCard
              title="Echo: Residual Memory"
              note="Unlocked by Episode 3."
              img="/story/b1.png"
              unlocked={canPlayCore && bonus1Unlocked}
              distorted={!bonus1Unlocked}
              onClick={bonus1Unlocked ? () => setMode("bonus1") : undefined}
            />
            <EpisodeCard
              title="Echo: Redacted Layer"
              note="Unlocked by Episode 5."
              img="/story/b2.png"
              unlocked={canPlayCore && bonus2Unlocked}
              distorted={!bonus2Unlocked}
              onClick={bonus2Unlocked ? () => setMode("bonus2") : undefined}
            />
          </div>
        </section>

        {/* GLOBAL STATS */}
        <section style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 12, fontWeight: 950, letterSpacing: 1.8, marginBottom: 12 }}>
            GLOBAL INTERPRETATION METRICS
          </h3>
          <GlobalStatsPanel />
        </section>
      </div>
    </main>
  );
}
