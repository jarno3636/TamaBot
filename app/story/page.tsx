"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";

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
      return { bg: "rgba(34,197,94,0.92)", fg: "#02110a" };
    case "IN PROGRESS":
      return { bg: "rgba(250,204,21,0.92)", fg: "#1a1201" };
    case "AVAILABLE":
      return { bg: "rgba(56,189,248,0.92)", fg: "#020617" };
    case "NFT REQUIRED":
      return { bg: "rgba(168,85,247,0.92)", fg: "#08010f" };
    default:
      return { bg: "rgba(255,255,255,0.22)", fg: "rgba(255,255,255,0.92)" };
  }
}

/**
 * getBotState returns:
 * [
 *  designation(bytes7),
 *  ep1Choice(uint8),
 *  cognitionBias(uint8),
 *  profile(uint8),
 *  outcome(uint8),
 *  bonusFlags(uint16),
 *  schemaVersion(uint8),
 *  finalized(bool),
 *  ep1Set(bool),
 *  ep2Set(bool),
 *  ep3Set(bool),
 *  ep4Set(bool),
 *  ep5Set(bool),
 *  updatedAt(uint40),
 *  finalizedAt(uint40)
 * ]
 */
function deriveProgressFromBotState(botState: unknown): CoreProgress | undefined {
  if (!botState || !Array.isArray(botState)) return undefined;

  // Defensive: make sure it has at least the flags we need
  if (botState.length < 13) return undefined;

  const finalized = Boolean(botState[7]);
  const ep1 = Boolean(botState[8]);
  const ep2 = Boolean(botState[9]);
  const ep3 = Boolean(botState[10]);
  const ep4 = Boolean(botState[11]);
  const ep5 = Boolean(botState[12]);

  return { ep1, ep2, ep3, ep4, ep5, finalized };
}

/* ─────────────────────────────────────────────
 * Episode Card (supports distortion)
 * ───────────────────────────────────────────── */

function EpisodeCard(ep: {
  id: string | null;
  title: string;
  note: string;
  img: string;
  unlocked: boolean;
  done?: boolean;
  current?: boolean;
  requiresNFT?: boolean;
  distorted?: boolean;
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
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.35)",
        opacity: locked ? 0.75 : 1,
        filter: ep.distorted ? "blur(0.6px) contrast(1.15)" : "none",
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
            filter: locked ? "grayscale(0.8) brightness(0.55)" : "none",
          }}
        />

        {ep.distorted && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 3px, transparent 6px)",
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
            fontWeight: 900,
          }}
        >
          {status}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900 }}>{ep.title}</h2>
        <p style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{ep.note}</p>

        <button
          disabled={locked}
          onClick={ep.onClick}
          style={{
            marginTop: 14,
            width: "100%",
            borderRadius: 999,
            padding: "10px",
            fontSize: 12,
            fontWeight: 900,
            background: locked
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))",
            color: locked ? "rgba(255,255,255,0.6)" : "#020617",
            cursor: locked ? "not-allowed" : "pointer",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          {locked ? status : "▶ Enter"}
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
  const { fid } = useFid();

  // Keep tokenId stable as STRING; episode components convert to bigint internally.
  const fidString = useMemo(() => {
    if (typeof fid === "number" && fid > 0) return String(fid);
    if (typeof fid === "string" && /^\d+$/.test(fid)) return fid;
    return null;
  }, [fid]);

  const hasIdentity = Boolean(fidString);

  /* chain-safe narrowing */
  const wrongChain = chain?.id !== undefined && chain.id !== BASE_CHAIN_ID;

  /* Basebot presence */
  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidString ? ([BigInt(fidString)] as [bigint]) : undefined,
    query: { enabled: hasIdentity },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  /**
   * ✅ FIXED: Season2State ABI does NOT have getProgressFlags.
   * Use getBotState() and derive progress flags.
   */
  const { data: botState } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getBotState",
    args: fidString ? ([BigInt(fidString)] as [bigint]) : undefined,
    query: { enabled: hasIdentity && hasBasebot },
  });

  const progress: CoreProgress | undefined = useMemo(
    () => deriveProgressFromBotState(botState),
    [botState]
  );

  /**
   * ✅ GATING LOGIC (unchanged intent):
   * - Having an FID alone does NOT mean they own the NFT.
   * - Core play requires: wallet connected + Base chain + Basebot NFT detected.
   */
  const canPlayCore = Boolean(address && hasBasebot && !wrongChain);
  const currentCore = useMemo(() => nextCoreMode(progress), [progress]);

  /* Bonus unlock rules (as you requested): EP1 unlocks prologue, EP3 unlocks bonus1, EP5 unlocks bonus2 */
  const prologueUnlocked = Boolean(progress?.ep1);
  const bonus1Unlocked = Boolean(progress?.ep3);
  const bonus2Unlocked = Boolean(progress?.ep5);

  /* ROUTING */
  if (mode !== "hub") {
    const map: Record<string, React.ReactNode> = {
      ep1: fidString ? <EpisodeOne tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep2: fidString ? <EpisodeTwo tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep3: fidString ? <EpisodeThree tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep4: fidString ? <EpisodeFour tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep5: fidString ? <EpisodeFive tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,
      bonus1: <BonusEcho onExit={() => setMode("hub")} />,
      bonus2: <BonusEchoArchive onExit={() => setMode("hub")} />,
    };
    return <>{map[mode]}</>;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 16px",
        background:
          "radial-gradient(1000px 520px at 50% -10%, rgba(56,189,248,0.12), transparent 60%), #020617",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 950 }}>BASEBOTS // STORY</h1>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            A premium narrative sequence bound to your Basebot. Choices are committed on-chain.
          </p>

          {/* Optional quick status line (safe + helps debugging without "tokenId==fid" verbiage) */}
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.30)",
              padding: 12,
              fontSize: 12,
              opacity: 0.9,
              lineHeight: 1.5,
            }}
          >
            <div>
              Identity: <b>{hasIdentity ? `FID ${fidString}` : "Not detected"}</b>
            </div>
            <div>
              Wallet: <b>{address ? "Connected" : "Not connected"}</b>
            </div>
            <div>
              Network:{" "}
              <b style={{ color: wrongChain ? "#fb7185" : "rgba(255,255,255,0.92)" }}>
                {wrongChain ? "Wrong network (switch to Base)" : "Base"}
              </b>
            </div>
            <div>
              Basebot NFT:{" "}
              <b style={{ color: hasBasebot ? "#22c55e" : "rgba(255,255,255,0.65)" }}>
                {hasBasebot ? "Detected" : "Not detected"}
              </b>
            </div>
          </div>
        </header>

        {/* CORE */}
        <section>
          <h3 style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: 900, marginBottom: 12 }}>
            CORE SEQUENCE
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            <EpisodeCard
              id="ep1"
              title="Awakening Protocol"
              note="Initialization begins."
              img="/story/01-awakening.png"
              unlocked
              current={currentCore === "ep1"}
              onClick={() => setMode("ep1")}
            />
            <EpisodeCard
              id="ep2"
              title="Signal Fracture"
              note="Designation binding."
              img="/story/ep2.png"
              unlocked={canPlayCore && Boolean(progress?.ep1)}
              requiresNFT
              current={currentCore === "ep2"}
              onClick={() => setMode("ep2")}
            />
            <EpisodeCard
              id="ep3"
              title="Fault Lines"
              note="Contradictions form."
              img="/story/ep3.png"
              unlocked={canPlayCore && Boolean(progress?.ep2)}
              requiresNFT
              current={currentCore === "ep3"}
              onClick={() => setMode("ep3")}
            />
            <EpisodeCard
              id="ep4"
              title="Threshold"
              note="A profile is derived."
              img="/story/ep4.png"
              unlocked={canPlayCore && Boolean(progress?.ep3)}
              requiresNFT
              current={currentCore === "ep4"}
              onClick={() => setMode("ep4")}
            />
            <EpisodeCard
              id="ep5"
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
          <h3 style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: 900, marginBottom: 12 }}>
            ARCHIVAL ECHOES
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            <EpisodeCard
              id="prologue"
              title="Prologue: Silence in Darkness"
              note="Something remembers you first."
              img="/story/prologue.png"
              unlocked={prologueUnlocked}
              distorted={!prologueUnlocked}
              onClick={prologueUnlocked ? () => setMode("prologue") : undefined}
            />
            <EpisodeCard
              id="bonus1"
              title="Echo: Residual Memory"
              note="Fragments recovered."
              img="/story/b1.png"
              unlocked={bonus1Unlocked}
              distorted={!bonus1Unlocked}
              onClick={bonus1Unlocked ? () => setMode("bonus1") : undefined}
            />
            <EpisodeCard
              id="bonus2"
              title="Echo: Redacted Layer"
              note="Unlocked during Emergence."
              img="/story/b2.png"
              unlocked={bonus2Unlocked}
              distorted={!bonus2Unlocked}
              onClick={bonus2Unlocked ? () => setMode("bonus2") : undefined}
            />
          </div>
        </section>

        {/* GLOBAL STATS */}
        <section style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: 900, marginBottom: 12 }}>
            GLOBAL INTERPRETATION METRICS
          </h3>
          <GlobalStatsPanel />
        </section>
      </div>
    </main>
  );
}
