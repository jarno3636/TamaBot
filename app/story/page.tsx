"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { getAddress } from "viem";

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
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { fid } = useFid();

  const isBase = chain?.id === BASE_CHAIN_ID;
  const [mode, setMode] = useState<Mode>("hub");

  /* ───────── tokenId = fid (CRITICAL FIX) ───────── */

  const tokenId = useMemo(() => {
    if (typeof fid === "number" && fid > 0) return BigInt(fid);
    return null;
  }, [fid]);

  /* ───────── OWNERSHIP (SINGLE READ) ───────── */

  const { data: owner, isLoading: ownerLoading } = useReadContract({
    ...BASEBOTS,
    functionName: "ownerOf",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: Boolean(tokenId && address && isBase) },
  });

  const ownsBasebot = useMemo(() => {
    if (!owner || !address) return false;
    return getAddress(owner) === getAddress(address);
  }, [owner, address]);

  /* ───────── BOT STATE ───────── */

  const {
    data: botState,
    refetch: refetchBotState,
    isLoading: botLoading,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: Boolean(tokenId && ownsBasebot) },
  });

  const state = useMemo(() => {
    if (!botState) return null;
    const s: any = botState;
    return {
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
    };
  }, [botState]);

  /* ───────── LIVE UPDATES ───────── */

  useEffect(() => {
    if (!publicClient || !tokenId) return;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        for (const log of logs as any[]) {
          if (log.args?.tokenId?.toString() === tokenId.toString()) {
            refetchBotState();
            break;
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, tokenId, refetchBotState]);

  /* ───────── GATES ───────── */

  if (!isBase) return <main style={shell()}>Switch to Base network.</main>;
  if (!address) return <main style={shell()}>Connect wallet.</main>;
  if (!fid) return <main style={shell()}>Farcaster identity required.</main>;
  if (ownerLoading) return <main style={shell()}>Checking Basebot ownership…</main>;
  if (!ownsBasebot) return <main style={shell()}>You do not own Basebot #{fid}.</main>;

  /* ───────── MODE ROUTING ───────── */

  if (mode !== "hub") {
    const exit = () => setMode("hub");
    switch (mode) {
      case "ep1":
        return <EpisodeOne tokenId={tokenId!.toString()} onExit={exit} />;
      case "ep2":
        return state?.ep1 ? <EpisodeTwo tokenId={tokenId!.toString()} onExit={exit} /> : null;
      case "ep3":
        return state?.ep2 ? <EpisodeThree tokenId={tokenId!.toString()} onExit={exit} /> : null;
      case "ep4":
        return state?.ep3 ? <EpisodeFour tokenId={tokenId!.toString()} onExit={exit} /> : null;
      case "ep5":
        return state?.ep4 ? <EpisodeFive tokenId={tokenId!.toString()} onExit={exit} /> : null;
      case "prologue":
        return state?.ep1 ? <PrologueSilenceInDarkness onExit={exit} /> : null;
      case "bonus":
        return state?.ep3 ? <BonusEcho onExit={exit} /> : null;
      case "archive":
        return state?.ep5 ? <BonusEchoArchive onExit={exit} /> : null;
    }
  }

  /* ───────── HUB (IMAGES WORK AUTOMATICALLY) ───────── */

  return (
    <main style={shell()}>
      <h1>Memory Hub</h1>

      <p style={{ opacity: 0.85 }}>
        Tracking <b>Basebot #{fid}</b> · tokenId is permanently bound to your Farcaster identity.
      </p>

      <button
        onClick={() => refetchBotState()}
        disabled={botLoading}
        style={{ marginBottom: 20 }}
      >
        {botLoading ? "Syncing…" : "Sync"}
      </button>

      <div style={{ display: "grid", gap: 12 }}>
        <EpisodeCard
          title="Prologue"
          img="/story/prologue.png"
          ready={state?.ep1}
          onClick={() => setMode("prologue")}
        />
        <EpisodeCard
          title="Episode One"
          img="/story/01-awakening.png"
          ready={true}
          onClick={() => setMode("ep1")}
        />
        <EpisodeCard
          title="Episode Two"
          img="/story/ep2.png"
          ready={state?.ep1}
          onClick={() => setMode("ep2")}
        />
        <EpisodeCard
          title="Episode Three"
          img="/story/ep3.png"
          ready={state?.ep2}
          onClick={() => setMode("ep3")}
        />
        <EpisodeCard
          title="Episode Four"
          img="/story/ep4.png"
          ready={state?.ep3}
          onClick={() => setMode("ep4")}
        />
        <EpisodeCard
          title="Episode Five"
          img="/story/ep5.png"
          ready={state?.ep4}
          onClick={() => setMode("ep5")}
        />
      </div>
    </main>
  );
}

/* ───────── Small helpers ───────── */

function EpisodeCard({
  title,
  img,
  ready,
  onClick,
}: {
  title: string;
  img: string;
  ready?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!ready}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 14,
        background: ready ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        cursor: ready ? "pointer" : "not-allowed",
      }}
    >
      <img src={img} width={72} height={72} alt="" />
      <div>{title}</div>
    </button>
  );
}

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 32,
});
