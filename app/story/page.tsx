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

  const tokenId = useMemo(() => {
    if (typeof fid === "number" && fid > 0) return BigInt(fid);
    return undefined;
  }, [fid]);

  /* ───────── NFT GATE ───────── */

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isBase) },
  });

  const nftGatePassed = typeof balance === "bigint" && balance > 0n;

  /* ───────── BOT STATE ───────── */

  const {
    data: botState,
    refetch: refetchBotState,
    isLoading: botLoading,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: Boolean(tokenId && nftGatePassed) },
  });

  /* ───────── EVENTS ───────── */

  useEffect(() => {
    if (!publicClient || !tokenId) return;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        for (const log of logs as Array<{ args?: { tokenId?: bigint } }>) {
          if (log.args?.tokenId === tokenId) {
            refetchBotState();
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, tokenId, refetchBotState]);

  /* ───────── SAFE GUARDS (NO NULL RETURNS) ───────── */

  if (!isBase) {
    return (
      <main style={shell()}>
        <p>Switch to Base network.</p>
      </main>
    );
  }

  if (!address) {
    return (
      <main style={shell()}>
        <p>Connect wallet to continue.</p>
      </main>
    );
  }

  if (balanceLoading) {
    return (
      <main style={shell()}>
        <p>Checking NFT ownership…</p>
      </main>
    );
  }

  if (!nftGatePassed) {
    return (
      <main style={shell()}>
        <p>NFT required to access this experience.</p>
      </main>
    );
  }

  if (!tokenId) {
    return (
      <main style={shell()}>
        <p>Resolving Farcaster identity…</p>
      </main>
    );
  }

  if (botLoading) {
    return (
      <main style={shell()}>
        <p>Loading memory state…</p>
      </main>
    );
  }

  /* ───────── MODE ROUTING ───────── */

  switch (mode) {
    case "ep1":
      return <EpisodeOne tokenId={tokenId.toString()} onExit={() => setMode("hub")} />;

    case "ep2":
      return <EpisodeTwo tokenId={tokenId.toString()} onExit={() => setMode("hub")} />;

    case "ep3":
      return <EpisodeThree tokenId={tokenId.toString()} onExit={() => setMode("hub")} />;

    case "ep4":
      return <EpisodeFour tokenId={tokenId.toString()} onExit={() => setMode("hub")} />;

    case "ep5":
      return <EpisodeFive tokenId={tokenId.toString()} onExit={() => setMode("hub")} />;

    case "prologue":
      return <PrologueSilenceInDarkness onExit={() => setMode("hub")} />;

    case "bonus":
      return <BonusEcho onExit={() => setMode("hub")} />;

    case "archive":
      return <BonusEchoArchive onExit={() => setMode("hub")} />;

    default:
      break;
  }

  /* ───────── HUB ───────── */

  return (
    <main style={shell()}>
      <h1>BASEBOTS MEMORY HUB</h1>

      <button onClick={() => setMode("ep1")}>Enter Episode One</button>
      <button onClick={() => setMode("ep2")}>Episode Two</button>
      <button onClick={() => setMode("ep3")}>Episode Three</button>
      <button onClick={() => setMode("ep4")}>Episode Four</button>
      <button onClick={() => setMode("ep5")}>Episode Five</button>
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
