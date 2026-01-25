"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";

import useFid from "@/hooks/useFid";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";
import BonusEchoArchive from "@/components/story/BonusEchoArchive";

import { BASEBOTS } from "@/lib/abi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

const BASE_CHAIN_ID = 8453;

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

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { fid } = useFid();

  const isBase = chain?.id === BASE_CHAIN_ID;

  /**
   * IMPORTANT:
   * - tokenId is a STRING
   * - BigInt is NEVER stored in state or passed as props
   */
  const tokenId = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? String(fid) : null;
  }, [fid]);

  /* ───────── NFT GATE ───────── */

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isBase) },
  });

  const nftGatePassed = typeof balance === "bigint" && balance > 0n;

  /* ───────── BOT STATE (ONLY WHEN tokenId EXISTS) ───────── */

  const {
    data: botState,
    refetch: refetchBotState,
    isLoading: botLoading,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: Boolean(tokenId && nftGatePassed),
    },
  });

  /* ───────── EVENTS ───────── */

  useEffect(() => {
    if (!publicClient || !tokenId) return;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        for (const log of logs as Array<{ args?: { tokenId?: bigint } }>) {
          if (log.args?.tokenId?.toString() === tokenId) {
            refetchBotState();
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, tokenId, refetchBotState]);

  /* ───────── BOT STATE SHAPE ───────── */

  const state = botState
    ? {
        ep1: (botState as any).ep1Set,
        ep2: (botState as any).ep2Set,
        ep3: (botState as any).ep3Set,
        ep4: (botState as any).ep4Set,
        ep5: (botState as any).ep5Set,
        finalized: (botState as any).finalized,
      }
    : null;

  /* ───────── UNLOCK LOGIC ───────── */

  const ep1Unlocked = nftGatePassed;
  const ep2Unlocked = nftGatePassed && state?.ep1;
  const ep3Unlocked = nftGatePassed && state?.ep2;
  const ep4Unlocked = nftGatePassed && state?.ep3;
  const ep5Unlocked = nftGatePassed && state?.ep4;

  const prologueUnlocked = state?.ep1;
  const bonusUnlocked = state?.ep3;
  const archiveUnlocked = state?.ep5;

  /* ───────── SAFETY UI ───────── */

  if (!isBase) {
    return <main style={shell()}>Switch to Base network.</main>;
  }

  if (!address) {
    return <main style={shell()}>Connect wallet to continue.</main>;
  }

  if (balanceLoading) {
    return <main style={shell()}>Checking NFT ownership…</main>;
  }

  if (!nftGatePassed) {
    return <main style={shell()}>Basebot NFT required.</main>;
  }

  /* ───────── MODE ROUTING ───────── */

  if (mode !== "hub") {
    if (!tokenId) {
      return (
        <main style={shell()}>
          Farcaster identity not detected yet.
          <br />
          Open Warpcast or refresh the page.
        </main>
      );
    }

    switch (mode) {
      case "ep1":
        return <EpisodeOne tokenId={tokenId} onExit={() => setMode("hub")} />;
      case "ep2":
        return ep2Unlocked ? <EpisodeTwo tokenId={tokenId} onExit={() => setMode("hub")} /> : null;
      case "ep3":
        return ep3Unlocked ? <EpisodeThree tokenId={tokenId} onExit={() => setMode("hub")} /> : null;
      case "ep4":
        return ep4Unlocked ? <EpisodeFour tokenId={tokenId} onExit={() => setMode("hub")} /> : null;
      case "ep5":
        return ep5Unlocked ? <EpisodeFive tokenId={tokenId} onExit={() => setMode("hub")} /> : null;
      case "prologue":
        return prologueUnlocked ? <PrologueSilenceInDarkness onExit={() => setMode("hub")} /> : null;
      case "bonus":
        return bonusUnlocked ? <BonusEcho onExit={() => setMode("hub")} /> : null;
      case "archive":
        return archiveUnlocked ? <BonusEchoArchive onExit={() => setMode("hub")} /> : null;
      default:
        return null;
    }
  }

  /* ───────── HUB ───────── */

  return (
    <main style={shell()}>
      <h1>BASEBOTS MEMORY HUB</h1>

      <button onClick={() => setMode("ep1")}>Enter Episode One</button>
      <button disabled={!ep2Unlocked} onClick={() => setMode("ep2")}>
        Episode Two
      </button>
      <button disabled={!ep3Unlocked} onClick={() => setMode("ep3")}>
        Episode Three
      </button>
      <button disabled={!ep4Unlocked} onClick={() => setMode("ep4")}>
        Episode Four
      </button>
      <button disabled={!ep5Unlocked} onClick={() => setMode("ep5")}>
        Episode Five
      </button>
    </main>
  );
}

/* ───────── styles ───────── */

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 40,
});
