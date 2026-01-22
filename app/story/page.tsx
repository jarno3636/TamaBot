"use client";

import React, { useEffect, useMemo, useState } from "react";
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

/* ───────────────────────────────────────────── */
const BASE_CHAIN_ID = 8453;
/* ───────────────────────────────────────────── */

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

/* ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<
    "hub" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "prologue" | "bonus1" | "bonus2"
  >("hub");

  const { address, chain } = useAccount();

  /* ✅ SAFE FID RESOLUTION (no crash) */
  const fidResult = useFid();
  const fid =
    typeof fidResult === "number"
      ? fidResult
      : typeof fidResult === "object"
      ? fidResult?.fid
      : null;

  const fidString =
    typeof fid === "number" && fid > 0 ? String(fid) : null;

  const hasIdentity = Boolean(fidString);
  const wrongChain =
    chain?.id !== undefined && chain.id !== BASE_CHAIN_ID;

  /* ───────── NFT presence (FID == tokenId) ───────── */

  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidString ? ([BigInt(fidString)] as [bigint]) : undefined,
    query: { enabled: hasIdentity },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  /* ───────── Progress flags ───────── */

  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getProgressFlags",
    args: fidString ? ([BigInt(fidString)] as [bigint]) : undefined,
    query: { enabled: hasIdentity && hasBasebot },
  });

  const progress = progressFlags as CoreProgress | undefined;

  const canPlayCore =
    Boolean(address) && hasBasebot && !wrongChain;

  const currentCore = useMemo(
    () => nextCoreMode(progress),
    [progress],
  );

  const prologueUnlocked = Boolean(progress?.ep1);
  const bonus1Unlocked = Boolean(progress?.ep3);
  const bonus2Unlocked = Boolean(progress?.ep5);

  /* ───────── Routing ───────── */

  if (mode !== "hub") {
    const exit = () => setMode("hub");
    const tokenId = fidString ?? "";

    switch (mode) {
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

  /* ───────── Hub UI ───────── */

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
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 950 }}>
            BASEBOTS // STORY
          </h1>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Choices are committed on-chain. Identity is bound to your FID.
          </p>
        </header>

        {!hasIdentity && (
          <div style={{ opacity: 0.7, marginBottom: 20 }}>
            Waiting for Farcaster identity…
          </div>
        )}

        {hasIdentity && !hasBasebot && (
          <div style={{ opacity: 0.7, marginBottom: 20 }}>
            No Basebot NFT detected for this FID.
          </div>
        )}

        {wrongChain && (
          <div style={{ color: "#fb7185", marginBottom: 20 }}>
            Switch to Base network.
          </div>
        )}

        {/* CORE */}
        <section>
          <h3 style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: 900 }}>
            CORE SEQUENCE
          </h3>

          <div style={{ marginTop: 16 }}>
            <button
              disabled={!canPlayCore}
              onClick={() => setMode(currentCore)}
            >
              Enter Story
            </button>
          </div>
        </section>

        {/* GLOBAL STATS (restored safely) */}
        <section style={{ marginTop: 48 }}>
          <h3 style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: 900 }}>
            GLOBAL INTERPRETATION METRICS
          </h3>
          <GlobalStatsPanel />
        </section>
      </div>
    </main>
  );
}
